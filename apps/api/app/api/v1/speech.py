"""API v1 router for Speech Intelligence operations."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.speech import (
    SpeechTranscribeRequest,
    SpeechTranscriptionResponse,
    SpeechHistoryItem,
    SpeechHistoryList,
)
from app.services.speech.base import SpeechProcessingError
from app.services.speech.service import SpeechService
from app.services.storage.service import get_storage_provider

router = APIRouter(prefix="/speech", tags=["speech"])


def get_speech_service(
    db: AsyncSession = Depends(get_db),
) -> SpeechService:
    """Dependency injector for SpeechService."""
    storage = get_storage_provider()
    return SpeechService(db, storage)


@router.post(
    "/transcribe",
    response_model=SpeechTranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe audio attachment to text",
)
async def transcribe_audio(
    payload: SpeechTranscribeRequest,
    current_user: User = Depends(get_current_active_user),
    service: SpeechService = Depends(get_speech_service),
) -> SpeechTranscriptionResponse:
    """
    Transcribe a ready audio attachment using the configured Speech-to-Text provider.
    Returns typed transcript, provider metadata, and explicit mock disclosure.
    """
    if not settings.ENABLE_VOICE_FEATURES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Speech Intelligence features are disabled in configuration.",
        )

    try:
        record, _ = await service.transcribe_attachment(
            attachment_id=payload.attachment_id,
            user_id=current_user.id,
            language=payload.language,
            prompt=payload.prompt,
        )
        return SpeechTranscriptionResponse.model_validate(record)
    except SpeechProcessingError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech transcription failed: {str(exc)}",
        ) from exc


@router.get(
    "/history",
    response_model=SpeechHistoryList,
    status_code=status.HTTP_200_OK,
    summary="Retrieve user's speech transcription history",
)
async def get_speech_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    service: SpeechService = Depends(get_speech_service),
) -> SpeechHistoryList:
    """List transcription history records for the current user."""
    items = await service.list_transcriptions(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )
    return SpeechHistoryList(
        items=[SpeechHistoryItem.model_validate(item) for item in items],
        total=len(items),
    )


@router.get(
    "/history/{transcription_id}",
    response_model=SpeechTranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single transcription detail by ID",
)
async def get_speech_detail(
    transcription_id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: SpeechService = Depends(get_speech_service),
) -> SpeechTranscriptionResponse:
    """Get details of a specific transcription record."""
    try:
        record = await service.get_transcription(transcription_id, current_user.id)
        return SpeechTranscriptionResponse.model_validate(record)
    except SpeechProcessingError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.delete(
    "/history/{transcription_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a transcription record",
)
async def delete_speech_history(
    transcription_id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: SpeechService = Depends(get_speech_service),
):
    """Delete a transcription record owned by the current user."""
    try:
        await service.delete_transcription(transcription_id, current_user.id)
        return {"success": True, "message": "Transcription record deleted"}
    except SpeechProcessingError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
