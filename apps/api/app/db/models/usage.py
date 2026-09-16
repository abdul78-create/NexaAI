"""AI Usage Telemetry ORM model for tracking cost and tokens."""

import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class AIUsageLog(Base, TimestampMixin):
    """
    Records telemetry and token usage for AI and Vision executions.
    Supports usage analytics, cost tracking, and per-user quota controls.
    """

    __tablename__ = "ai_usage_logs"

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

    feature_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Feature type: vision | ocr | chat | rag.",
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
        return f"<AIUsageLog {self.id} [{self.feature_type}] [{self.provider}] [{self.total_tokens} tokens]>"
