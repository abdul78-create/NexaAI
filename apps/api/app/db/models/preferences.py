"""UserPreferences ORM model for Phase 15 Settings & AI Operations."""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class UserPreferences(Base, TimestampMixin):
    """
    Per-user preferences model storing appearance, AI defaults,
    and privacy controls.
    """

    __tablename__ = "user_preferences"

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
        unique=True,
        index=True,
    )

    theme: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="dark",
    )
    accent_color: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="indigo",
    )
    default_model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="nexa-standard",
    )
    default_language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en",
    )
    auto_ocr_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    auto_rag_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    show_provider_disclosures: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    reduced_motion: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User")  # type: ignore  # noqa: F821

    def __repr__(self) -> str:
        return f"<UserPreferences user_id={self.user_id} theme={self.theme} model={self.default_model}>"
