"""Pydantic schemas for Phase 13 Speech Intelligence API."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class SpeechTranscribeRequest(BaseModel):
    """Payload to trigger Speech-to-Text transcription on an audio attachment."""

    attachment_id: UUID = Field(..., description="ID of a ready audio attachment.")
    language: Optional[str] = Field(
        None,
        description="Optional ISO 639-1 language hint (e.g. 'en', 'es', 'fr').",
        max_length=10,
    )
    prompt: Optional[str] = Field(
        None,
        description="Optional prompt/context to guide word recognition.",
        max_length=1000,
    )


class SpeechTranscriptionResponse(BaseModel):
    """Response payload for speech transcription."""

    id: UUID
    attachment_id: UUID
    provider: str
    model_name: str
    language: str
    transcript: str
    status: str
    duration_ms: int
    audio_duration_seconds: Optional[float] = None
    is_mock: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpeechHistoryItem(BaseModel):
    """Summary record in speech transcription history."""

    id: UUID
    attachment_id: UUID
    provider: str
    model_name: str
    language: str
    transcript: str
    status: str
    duration_ms: int
    audio_duration_seconds: Optional[float] = None
    is_mock: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpeechHistoryList(BaseModel):
    """Paginated list of speech transcription records."""

    items: List[SpeechHistoryItem]
    total: int
