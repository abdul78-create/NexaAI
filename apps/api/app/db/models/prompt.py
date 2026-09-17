"""Prompt Library ORM model for user and system prompts."""

import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Prompt(Base, TimestampMixin):
    """
    Stores reusable prompt templates.
    System prompts have user_id=None; user prompts belong to a specific user.
    """

    __tablename__ = "prompts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        doc="Owner user ID. NULL for system/public prompts.",
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="The prompt template text.",
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        doc="Short description of what this prompt does.",
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="general",
        index=True,
    )
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        doc="Whether this prompt is visible to all users.",
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        doc="Whether this prompt appears in the featured section.",
    )
    usage_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="Number of times this prompt has been used.",
    )

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped[Optional["User"]] = relationship("User", back_populates="prompts")  # type: ignore  # noqa: F821

    def __repr__(self) -> str:
        return f"<Prompt {self.title!r} user={self.user_id} public={self.is_public}>"
