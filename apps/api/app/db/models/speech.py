"""Speech Transcription ORM model for NexaAI Phase 13 Speech Intelligence."""

import uuid
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class SpeechTranscription(Base, TimestampMixin):
    """
    Speech transcription record owned by a user and linked to an audio Attachment.
    Tracks provider metadata, execution duration, language, and transcript.
    """

    __tablename__ = "speech_transcriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attachment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("attachments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="mock",
        index=True,
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="whisper-1",
    )
    language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en",
    )
    transcript: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="completed",
        index=True,
    )
    duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    audio_duration_seconds: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    is_mock: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    error_code: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User")  # type: ignore  # noqa: F821
    attachment: Mapped["Attachment"] = relationship("Attachment")  # type: ignore  # noqa: F821

    def __repr__(self) -> str:
        return f"<SpeechTranscription {self.id} [{self.provider}] [{self.status}]>"
