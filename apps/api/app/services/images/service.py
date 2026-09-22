"""Image Intelligence Orchestrator Service."""

import json
import time
import uuid
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.attachment import Attachment
from app.db.models.image_analysis import ImageAnalysis
from app.services.attachments.service import AttachmentService
from app.services.storage.base import BaseStorageProvider
from app.services.images.base import (
    QualityMetrics,
    OCRResult,
    VisionAnalysisResult,
    ImageProcessingError,
    ProviderNotConfiguredError,
)
from app.services.images.quality import calculate_image_quality
from app.services.images.preprocessing import (
    resize_image,
    rotate_image,
    crop_image,
    compress_image,
    convert_format,
    enhance_document_image,
)
from app.services.images.ocr import BaseOCRProvider, MockOCRProvider, TesseractOCRProvider
from app.services.images.providers.vision import BaseVisionProvider, OpenAIVisionProvider
from app.services.images.providers.mock import MockVisionProvider
from app.services.usage.service import UsageService


def get_ocr_provider() -> BaseOCRProvider:
    """Factory resolver for configured OCR provider with fallback."""
    if settings.OCR_PROVIDER == "tesseract":
        return TesseractOCRProvider()
    return MockOCRProvider()


def get_vision_provider() -> BaseVisionProvider:
    """Factory resolver for configured Vision AI provider with fallback."""
    if settings.VISION_PROVIDER.lower() == "gemini" and settings.GEMINI_API_KEY:
        return OpenAIVisionProvider(
            api_key=settings.GEMINI_API_KEY,
            base_url=settings.GEMINI_BASE_URL,
            default_model=settings.VISION_MODEL or "gemini-3.6-flash",
            provider_name="gemini",
        )
    if settings.VISION_PROVIDER.lower() in ("openai", "gemini") and settings.OPENAI_API_KEY:
        return OpenAIVisionProvider(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            default_model="gpt-4o",
            provider_name="openai",
        )
    return MockVisionProvider()


class ImageService:
    """
    Main Service managing image processing, OCR, Vision AI, history persistence,
    and execution usage telemetry.
    Operates on existing Phase 10 Attachment records.
    """

    def __init__(
        self,
        db: AsyncSession,
        storage: BaseStorageProvider,
        ocr_provider: Optional[BaseOCRProvider] = None,
        vision_provider: Optional[BaseVisionProvider] = None,
        usage_service: Optional[UsageService] = None,
    ):
        self.db = db
        self.storage = storage
        self.ocr_provider = ocr_provider or get_ocr_provider()
        self.vision_provider = vision_provider or get_vision_provider()
        self.usage_service = usage_service or UsageService(db)

    async def _get_and_validate_attachment(
        self,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Tuple[Attachment, bytes]:
        """Verify attachment existence, user ownership, and image media type."""
        try:
            attachment = await AttachmentService.get_by_id(
                db=self.db,
                attachment_id=attachment_id,
                user_id=user_id,
            )
        except HTTPException as exc:
            raise ImageProcessingError(exc.detail) from exc

        if attachment.media_type != "image":
            raise ImageProcessingError(
                f"Attachment {attachment_id} media_type is '{attachment.media_type}', expected 'image'."
            )
        if attachment.status != "ready":
            raise ImageProcessingError(f"Attachment {attachment_id} status is '{attachment.status}', expected 'ready'.")

        image_bytes = await self.storage.read(attachment.storage_key)
        return attachment, image_bytes

    async def analyze_image(
        self,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
        prompt: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Tuple[ImageAnalysis, VisionAnalysisResult, QualityMetrics]:
        """Perform Vision AI description or question answering, log telemetry, and persist record."""
        attachment, image_bytes = await self._get_and_validate_attachment(attachment_id, user_id)
        start_time = time.time()

        quality = calculate_image_quality(image_bytes)

        try:
            if prompt:
                vision_res = await self.vision_provider.answer_image_question(image_bytes, prompt, model)
            else:
                vision_res = await self.vision_provider.describe_image(image_bytes, model)
            exec_status = "success"
            err_code = None
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            await self.usage_service.log_usage(
                user_id=user_id,
                feature_type="vision",
                provider=getattr(self.vision_provider, "provider", "unknown"),
                model_name=model or settings.VISION_MODEL,
                execution_duration_ms=duration_ms,
                status="error",
                error_code=type(exc).__name__,
            )
            raise

        duration_ms = int((time.time() - start_time) * 1000)

        # Log AI Usage telemetry
        await self.usage_service.log_usage(
            user_id=user_id,
            feature_type="vision",
            provider=vision_res.provider,
            model_name=vision_res.model_name,
            prompt_tokens=vision_res.prompt_tokens,
            completion_tokens=vision_res.completion_tokens,
            execution_duration_ms=duration_ms,
            status=exec_status,
            error_code=err_code,
        )

        result_dict = {
            "description": vision_res.description,
            "answer": vision_res.answer,
            "tags": vision_res.tags,
            "objects_detected": vision_res.objects_detected,
            "suggested_actions": vision_res.suggested_actions,
            "provider": vision_res.provider,
            "is_mock": vision_res.is_mock,
        }

        metadata_dict = {
            "width": quality.width,
            "height": quality.height,
            "aspect_ratio": quality.aspect_ratio,
            "blur_score": quality.blur_score,
            "is_blurry": quality.is_blurry,
            "brightness": quality.brightness,
            "contrast": quality.contrast,
            "provider": vision_res.provider,
            "is_mock": vision_res.is_mock,
        }

        record = ImageAnalysis(
            user_id=user_id,
            attachment_id=attachment_id,
            analysis_type="vision",
            prompt=prompt,
            result_json=json.dumps(result_dict),
            extracted_text=None,
            image_metadata_json=json.dumps(metadata_dict),
            status="completed",
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)

        return record, vision_res, quality

    async def extract_ocr(
        self,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
        language: Optional[str] = None,
    ) -> Tuple[ImageAnalysis, OCRResult]:
        """Extract text via OCR provider, log telemetry, and persist record."""
        attachment, image_bytes = await self._get_and_validate_attachment(attachment_id, user_id)
        start_time = time.time()

        try:
            ocr_res = await self.ocr_provider.extract_text(image_bytes, language=language)
        except ProviderNotConfiguredError as exc:
            # Fallback to MockOCRProvider if configured engine fails
            mock = MockOCRProvider()
            ocr_res = await mock.extract_text(image_bytes, language=language)

        duration_ms = int((time.time() - start_time) * 1000)
        quality = calculate_image_quality(image_bytes)

        # Log OCR Usage Telemetry
        await self.usage_service.log_usage(
            user_id=user_id,
            feature_type="ocr",
            provider=ocr_res.provider,
            model_name=ocr_res.provider,
            prompt_tokens=0,
            completion_tokens=ocr_res.word_count,
            execution_duration_ms=duration_ms,
            status="success",
        )

        result_dict = {
            "extracted_text": ocr_res.extracted_text,
            "confidence": ocr_res.confidence,
            "language": ocr_res.language,
            "word_count": ocr_res.word_count,
            "provider": ocr_res.provider,
            "is_mock": ocr_res.is_mock,
            "blocks": [
                {
                    "text": b.text,
                    "confidence": b.confidence,
                    "x_min": b.x_min,
                    "y_min": b.y_min,
                    "x_max": b.x_max,
                    "y_max": b.y_max,
                }
                for b in ocr_res.blocks
            ],
        }

        metadata_dict = {
            "width": quality.width,
            "height": quality.height,
            "blur_score": quality.blur_score,
            "provider": ocr_res.provider,
            "is_mock": ocr_res.is_mock,
        }

        record = ImageAnalysis(
            user_id=user_id,
            attachment_id=attachment_id,
            analysis_type="ocr",
            prompt=None,
            result_json=json.dumps(result_dict),
            extracted_text=ocr_res.extracted_text,
            image_metadata_json=json.dumps(metadata_dict),
            status="completed",
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)

        return record, ocr_res

    async def process_image(
        self,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
        action: str,  # "resize" | "rotate" | "crop" | "compress" | "convert" | "enhance"
        params: Dict[str, Any],
    ) -> Tuple[ImageAnalysis, Attachment, Dict[str, Any]]:
        """
        Execute safe image transformation, save output as a NEW Attachment,
        and log processing history record.
        """
        attachment, image_bytes = await self._get_and_validate_attachment(attachment_id, user_id)

        if action == "resize":
            output_bytes, meta = resize_image(
                image_bytes,
                target_width=params.get("width"),
                target_height=params.get("height"),
                preserve_aspect_ratio=params.get("preserve_aspect", True),
            )
        elif action == "rotate":
            output_bytes, meta = rotate_image(image_bytes, angle=params.get("angle", 90))
        elif action == "crop":
            output_bytes, meta = crop_image(
                image_bytes,
                left=params["left"],
                top=params["top"],
                right=params["right"],
                bottom=params["bottom"],
            )
        elif action == "compress":
            output_bytes, meta = compress_image(
                image_bytes,
                quality=params.get("quality", 85),
                target_format=params.get("format"),
            )
        elif action == "convert":
            target_mime = params.get("target_mime_type", "image/jpeg")
            output_bytes, meta = convert_format(image_bytes, target_mime_type=target_mime)
        elif action == "enhance":
            output_bytes, meta = enhance_document_image(image_bytes)
        else:
            raise ImageProcessingError(f"Unsupported image processing action: '{action}'")

        # Save processed output image as a NEW Attachment using AttachmentService
        orig_name_base = attachment.original_filename.rsplit(".", 1)[0]
        ext = meta.mime_type.split("/")[-1]
        if ext == "jpeg":
            ext = "jpg"
        new_filename = f"{orig_name_base}_{action}.{ext}"

        new_attachment = await AttachmentService.upload(
            db=self.db,
            user_id=user_id,
            filename=new_filename,
            content_type=meta.mime_type,
            data=output_bytes,
        )

        quality = calculate_image_quality(output_bytes)
        result_dict = {
            "action": action,
            "new_attachment_id": str(new_attachment.id),
            "output_size_bytes": meta.size_bytes,
            "width": meta.width,
            "height": meta.height,
            "format": meta.format,
            "provider": "opencv",
            "is_mock": False,
        }
        metadata_dict = {
            "width": quality.width,
            "height": quality.height,
            "blur_score": quality.blur_score,
            "brightness": quality.brightness,
            "contrast": quality.contrast,
            "provider": "opencv",
            "is_mock": False,
        }

        record = ImageAnalysis(
            user_id=user_id,
            attachment_id=attachment_id,
            analysis_type="process",
            prompt=action,
            result_json=json.dumps(result_dict),
            extracted_text=None,
            image_metadata_json=json.dumps(metadata_dict),
            status="completed",
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)

        return record, new_attachment, result_dict

    async def get_history_for_user(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ImageAnalysis], int]:
        """Query user's image analysis history with pagination."""
        stmt = (
            select(ImageAnalysis)
            .where(ImageAnalysis.user_id == user_id)
            .order_by(ImageAnalysis.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        items = list(res.scalars().all())

        count_stmt = select(ImageAnalysis).where(ImageAnalysis.user_id == user_id)
        count_res = await self.db.execute(count_stmt)
        total = len(count_res.scalars().all())

        return items, total

    async def get_analysis_by_id(
        self,
        analysis_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ImageAnalysis:
        """Get single analysis record ensuring user ownership."""
        stmt = select(ImageAnalysis).where(
            ImageAnalysis.id == analysis_id,
            ImageAnalysis.user_id == user_id,
        )
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            raise ImageProcessingError(f"Image analysis record {analysis_id} not found.")
        return record

    async def delete_analysis(
        self,
        analysis_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Delete an image analysis history record."""
        record = await self.get_analysis_by_id(analysis_id, user_id)
        await self.db.delete(record)
        await self.db.commit()
        return True
