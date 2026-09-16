"""Attachment ORM model for NexaAI Phase 10 multimodal file infrastructure."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Attachment(Base, TimestampMixin):
    """
    Generic file attachment model owned by a registered user.

    Supports images, audio, documents, and future media types.
    ``storage_key`` is an opaque identifier — it is NEVER returned to clients.
    Soft deletes are tracked via ``deleted_at``; hard deletion removes the
    database row only after the storage object has been removed.
    """

    __tablename__ = "attachments"

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

    # ── File identity ─────────────────────────────────────────────────────
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Original filename as supplied by the client (sanitised before storage).",
    )
    storage_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        unique=True,
        doc="Opaque internal storage path. Never exposed to clients.",
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Size in bytes.",
    )
    checksum_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        doc="Hex-encoded SHA-256 digest of the raw file bytes.",
    )

    # ── Classification ────────────────────────────────────────────────────
    media_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        doc="Coarse media category: image | audio | document | video | other.",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="uploading",
        index=True,
        doc="Lifecycle status: uploading | ready | processing | failed | deleted.",
    )

    # ── Optional metadata ─────────────────────────────────────────────────
    metadata_json: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="JSON blob for media-specific extras: image dimensions, audio duration, etc.",
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # ── Soft delete ───────────────────────────────────────────────────────
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        doc="Set on soft-delete. Hard deletion removes the row after storage cleanup.",
    )

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore  # noqa: F821
        "User",
        back_populates="attachments",
    )

    def __repr__(self) -> str:
        return f"<Attachment {self.id} [{self.media_type}] [{self.status}]>"
