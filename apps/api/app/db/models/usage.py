"""AI Usage Telemetry ORM model for tracking cost and tokens."""

import uuid
from typing import Optional

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class AIUsageLog(Base, TimestampMixin):
    """
    Records telemetry and token usage for AI and Vision executions.
    Supports usage analytics, cost tracking, and per-user quota controls.
    """

    __tablename__ = "ai_usage_logs"
    __table_args__ = (
        Index("ix_usage_user_mode_created", "user_id", "mode", "created_at"),
        Index("ix_usage_user_created", "user_id", "created_at"),
    )

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
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
        index=True,
        doc="Conversation this usage belongs to.",
    )
    message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
        doc="Assistant message produced by this request.",
    )

    feature_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Feature type: vision | ocr | chat | rag.",
    )
    mode: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        index=True,
        doc="Chat reasoning mode: low | standard | high.",
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Provider name: openai | tesseract | mock.",
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="unknown",
    )

    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_cost: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        default=None,
        doc="Estimated cost in USD for this request.",
    )

    execution_duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="Request latency in milliseconds.",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="success",
        index=True,
        doc="Execution result: success | error.",
    )
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User")  # type: ignore  # noqa: F821

    def __repr__(self) -> str:
        return f"<AIUsageLog {self.id} [{self.feature_type}] [{self.mode or 'n/a'}] [{self.provider}] [{self.total_tokens} tokens]>"
