"""Image Analysis ORM model for NexaAI Phase 11 Image Intelligence."""

import uuid
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ImageAnalysis(Base, TimestampMixin):
    """
    Image Analysis execution history record owned by a registered user and tied
    to a Phase 10 Attachment.
    """

    __tablename__ = "image_analyses"

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

    analysis_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Type of analysis performed: vision | ocr | quality | process.",
    )
    prompt: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Optional user prompt or question provided for vision AI analysis.",
    )
    result_json: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Structured JSON payload containing complete analysis outputs.",
    )
    extracted_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Extracted OCR text if applicable.",
    )
    image_metadata_json: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Image dimensions, format, blur score, brightness, contrast metrics JSON.",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="completed",
        index=True,
        doc="Execution status: completed | failed | processing.",
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore  # noqa: F821
        "User",
    )
    attachment: Mapped["Attachment"] = relationship(  # type: ignore  # noqa: F821
        "Attachment",
    )

    def __repr__(self) -> str:
        return f"<ImageAnalysis {self.id} [{self.analysis_type}] [{self.status}]>"
