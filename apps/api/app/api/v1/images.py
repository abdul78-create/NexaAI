"""API v1 router for Image Intelligence operations."""

import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.images import (
    ImageAnalysisRequest,
    ImageOCRRequest,
    ImageProcessRequest,
    VisionAnalysisResponse,
    OCRAnalysisResponse,
    ImageProcessResponse,
    QualityMetricsSchema,
    OCRResultSchema,
    OCRBoundingBoxSchema,
    ImageAnalysisHistoryItem,
    ImageAnalysisHistoryList,
)
from app.services.images.base import (
    ImageProcessingError,
    CorruptImageError,
    OversizedImageError,
)
from app.services.images.service import ImageService
from app.services.storage.service import get_storage_provider

router = APIRouter(prefix="/images", tags=["images"])


def get_image_service(
    db: AsyncSession = Depends(get_db),
) -> ImageService:
    """Dependency injector for ImageService."""
    storage = get_storage_provider()
    return ImageService(db, storage)


@router.post(
    "/analyze",
    response_model=VisionAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Perform AI Vision analysis or question answering",
)
async def analyze_image(
    payload: ImageAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    service: ImageService = Depends(get_image_service),
) -> VisionAnalysisResponse:
    """
    Analyze an existing image attachment using Vision AI.
    Supports describing the image or answering specific visual questions.
    """
    if not settings.ENABLE_IMAGE_FEATURES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Image features are currently disabled.",
        )

    try:
        record, vision_res, quality = await service.analyze_image(
            attachment_id=payload.attachment_id,
            user_id=current_user.id,
            prompt=payload.prompt,
            model=payload.model,
        )
    except ImageProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image analysis failed: {str(exc)}",
        ) from exc

    return VisionAnalysisResponse(
        analysis_id=record.id,
        attachment_id=record.attachment_id,
        analysis_type="vision",
        prompt=record.prompt,
        description=vision_res.description,
        answer=vision_res.answer,
        tags=vision_res.tags,
        objects_detected=vision_res.objects_detected,
        suggested_actions=vision_res.suggested_actions,
        quality=QualityMetricsSchema(
            blur_score=quality.blur_score,
            is_blurry=quality.is_blurry,
            brightness=quality.brightness,
            contrast=quality.contrast,
            width=quality.width,
            height=quality.height,
            aspect_ratio=quality.aspect_ratio,
        ),
        created_at=record.created_at,
    )


@router.post(
    "/ocr",
    response_model=OCRAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract text using OCR",
)
async def extract_ocr(
    payload: ImageOCRRequest,
    current_user: User = Depends(get_current_active_user),
    service: ImageService = Depends(get_image_service),
) -> OCRAnalysisResponse:
    """
    Perform Optical Character Recognition (OCR) on an existing image attachment.
    Returns extracted text, word count, confidence, and bounding box locations.
    """
    if not settings.ENABLE_IMAGE_FEATURES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Image features are currently disabled.",
        )

    try:
        record, ocr_res = await service.extract_ocr(
            attachment_id=payload.attachment_id,
            user_id=current_user.id,
            language=payload.language,
        )
    except ImageProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR extraction failed: {str(exc)}",
        ) from exc

    meta = json.loads(record.image_metadata_json or "{}")

    return OCRAnalysisResponse(
        analysis_id=record.id,
        attachment_id=record.attachment_id,
        analysis_type="ocr",
        ocr_result=OCRResultSchema(
            extracted_text=ocr_res.extracted_text,
            confidence=ocr_res.confidence,
            language=ocr_res.language,
            word_count=ocr_res.word_count,
            blocks=[
                OCRBoundingBoxSchema(
                    text=b.text,
                    confidence=b.confidence,
                    x_min=b.x_min,
                    y_min=b.y_min,
                    x_max=b.x_max,
                    y_max=b.y_max,
                )
                for b in ocr_res.blocks
            ],
        ),
        quality=QualityMetricsSchema(
            blur_score=meta.get("blur_score", 0.0),
            is_blurry=meta.get("blur_score", 100.0) < 100.0,
            brightness=0.0,
            contrast=0.0,
            width=meta.get("width", 0),
            height=meta.get("height", 0),
            aspect_ratio=1.0,
        ),
        created_at=record.created_at,
    )


@router.post(
    "/process",
    response_model=ImageProcessResponse,
    status_code=status.HTTP_200_OK,
    summary="Perform OpenCV / Pillow image transformation",
)
async def process_image(
    payload: ImageProcessRequest,
    current_user: User = Depends(get_current_active_user),
    service: ImageService = Depends(get_image_service),
) -> ImageProcessResponse:
    """
    Perform safe image operations (resize, rotate, crop, compress, convert, enhance).
    Output is saved as a new Attachment.
    """
    if not settings.ENABLE_IMAGE_FEATURES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Image features are currently disabled.",
        )

    valid_actions = {"resize", "rotate", "crop", "compress", "convert", "enhance"}
    if payload.action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{payload.action}'. Supported actions: {sorted(list(valid_actions))}",
        )

    try:
        record, new_attachment, res_dict = await service.process_image(
            attachment_id=payload.attachment_id,
            user_id=current_user.id,
            action=payload.action,
            params=payload.params,
        )
    except (CorruptImageError, OversizedImageError, ImageProcessingError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image processing failed: {str(exc)}",
        ) from exc

    meta = json.loads(record.image_metadata_json or "{}")

    return ImageProcessResponse(
        analysis_id=record.id,
        original_attachment_id=payload.attachment_id,
        new_attachment_id=new_attachment.id,
        action=payload.action,
        output_size_bytes=res_dict.get("output_size_bytes", 0),
        width=res_dict.get("width", 0),
        height=res_dict.get("height", 0),
        format=res_dict.get("format", "JPEG"),
        quality=QualityMetricsSchema(
            blur_score=meta.get("blur_score", 0.0),
            is_blurry=meta.get("blur_score", 100.0) < 100.0,
            brightness=meta.get("brightness", 0.0),
            contrast=meta.get("contrast", 0.0),
            width=meta.get("width", 0),
            height=meta.get("height", 0),
            aspect_ratio=round(meta.get("width", 1) / max(meta.get("height", 1), 1), 4),
        ),
        created_at=record.created_at,
    )


@router.get(
    "/history",
    response_model=ImageAnalysisHistoryList,
    summary="Get user image analysis history",
)
async def get_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    service: ImageService = Depends(get_image_service),
) -> ImageAnalysisHistoryList:
    """Retrieve history of image analyses performed by the user."""
    items, total = await service.get_history_for_user(current_user.id, limit=limit, offset=offset)
    return ImageAnalysisHistoryList(
        items=[ImageAnalysisHistoryItem.model_validate(item) for item in items],
        total=total,
    )


@router.get(
    "/history/{id}",
    response_model=ImageAnalysisHistoryItem,
    summary="Get single image analysis record",
)
async def get_analysis_detail(
    id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: ImageService = Depends(get_image_service),
) -> ImageAnalysisHistoryItem:
    """Retrieve detail of a specific image analysis record."""
    try:
        record = await service.get_analysis_by_id(id, current_user.id)
    except ImageProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return ImageAnalysisHistoryItem.model_validate(record)


@router.delete(
    "/history/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete image analysis history record",
)
async def delete_analysis_record(
    id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: ImageService = Depends(get_image_service),
):
    """Delete an image analysis record."""
    try:
        await service.delete_analysis(id, current_user.id)
    except ImageProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
