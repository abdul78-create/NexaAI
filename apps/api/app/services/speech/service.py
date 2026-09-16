"""Speech Intelligence Orchestrator Service."""

import time
import uuid
from typing import List, Optional, Tuple
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.attachment import Attachment
from app.db.models.speech import SpeechTranscription
from app.services.attachments.service import AttachmentService
from app.services.storage.base import BaseStorageProvider
from app.services.speech.base import (
    BaseSTTProvider,
    TranscriptionResult,
    SpeechProcessingError,
)
from app.services.speech.mock import MockSTTProvider
from app.services.speech.providers.openai import OpenAISTTProvider
from app.services.usage.service import UsageService


def get_speech_provider() -> BaseSTTProvider:
    """Factory resolver for configured Speech-to-Text provider with fallback."""
    if (
        settings.STT_PROVIDER == "openai"
        and settings.OPENAI_API_KEY
        and settings.OPENAI_API_KEY.strip() not in ("", "mock-key", "your-openai-api-key")
    ):
        return OpenAISTTProvider()
    return MockSTTProvider()


class SpeechService:
    """
    Main Service managing audio validation, STT provider execution,
    history persistence, and usage telemetry.
    Operates on existing Phase 10 Attachment records.
    """

    def __init__(
        self,
        db: AsyncSession,
        storage: BaseStorageProvider,
        stt_provider: Optional[BaseSTTProvider] = None,
        usage_service: Optional[UsageService] = None,
    ):
        self.db = db
        self.storage = storage
        self.stt_provider = stt_provider or get_speech_provider()
        self.usage_service = usage_service or UsageService(db)

    async def _get_and_validate_attachment(
        self,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Tuple[Attachment, bytes]:
        """Verify attachment existence, user ownership, status, and audio media type."""
        try:
            attachment = await AttachmentService.get_by_id(
                db=self.db,
                attachment_id=attachment_id,
                user_id=user_id,
            )
        except HTTPException as exc:
            raise SpeechProcessingError(exc.detail, status_code=exc.status_code) from exc

        if attachment.media_type != "audio":
            raise SpeechProcessingError(
                f"Attachment {attachment_id} media_type is '{attachment.media_type}', expected 'audio'.",
                code="invalid_media_type",
                status_code=400,
            )
        if attachment.status != "ready":
            raise SpeechProcessingError(
                f"Attachment {attachment_id} status is '{attachment.status}', expected 'ready'.",
                code="attachment_not_ready",
                status_code=400,
            )

        audio_bytes = await self.storage.read(attachment.storage_key)
        return attachment, audio_bytes

    async def transcribe_attachment(
        self,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> Tuple[SpeechTranscription, TranscriptionResult]:
        """
        Transcribe an audio attachment using the active STT provider,
        persist the result, and log telemetry.
        """
        attachment, audio_bytes = await self._get_and_validate_attachment(attachment_id, user_id)
        start_time = time.time()

        try:
            res = await self.stt_provider.transcribe(
                audio_bytes=audio_bytes,
                filename=attachment.original_filename,
                content_type=attachment.mime_type,
                language=language,
                prompt=prompt,
            )

            exec_status = "success"
            err_code = None
        except SpeechProcessingError as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            # Log failure telemetry safely without breaking exception propagation
            try:
                await self.usage_service.log_usage(
                    user_id=user_id,
                    feature_type="speech_to_text",
                    provider=getattr(self.stt_provider, "model_name", settings.STT_PROVIDER),
                    model_name=settings.STT_MODEL,
                    execution_duration_ms=duration_ms,
                    status="error",
                    error_code=exc.code,
                )
            except Exception:
                pass
            raise
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            try:
                await self.usage_service.log_usage(
                    user_id=user_id,
                    feature_type="speech_to_text",
                    provider=settings.STT_PROVIDER,
                    model_name=settings.STT_MODEL,
                    execution_duration_ms=duration_ms,
                    status="error",
                    error_code="unexpected_error",
                )
            except Exception:
                pass
            raise SpeechProcessingError(
                f"Transcription execution failed: {str(exc)}",
                code="transcription_error",
                status_code=500,
            ) from exc

        duration_ms = int((time.time() - start_time) * 1000)

        # Record success telemetry safely
        try:
            await self.usage_service.log_usage(
                user_id=user_id,
                feature_type="speech_to_text",
                provider=res.provider,
                model_name=res.model_name,
                execution_duration_ms=duration_ms,
                status=exec_status,
                error_code=err_code,
            )
        except Exception:
            pass

        # Create persistent database record
        record = SpeechTranscription(
            user_id=user_id,
            attachment_id=attachment_id,
            provider=res.provider,
            model_name=res.model_name,
            language=res.language,
            transcript=res.text,
            status="completed",
            duration_ms=duration_ms,
            audio_duration_seconds=res.audio_duration_seconds,
            is_mock=res.is_mock,
            error_code=res.error_code,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)

        return record, res

    async def get_transcription(
        self,
        transcription_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> SpeechTranscription:
        """Fetch a transcription record by ID, ensuring strict user ownership."""
        stmt = select(SpeechTranscription).where(
            SpeechTranscription.id == transcription_id,
            SpeechTranscription.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            raise SpeechProcessingError(
                "Transcription not found or access denied",
                code="not_found",
                status_code=404,
            )
        return record

    async def list_transcriptions(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[SpeechTranscription]:
        """List past transcriptions for a user ordered by newest first."""
        stmt = (
            select(SpeechTranscription)
            .where(SpeechTranscription.user_id == user_id)
            .order_by(SpeechTranscription.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_transcription(
        self,
        transcription_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Delete a transcription record owned by the user."""
        record = await self.get_transcription(transcription_id, user_id)
        await self.db.delete(record)
        await self.db.commit()
        return True
