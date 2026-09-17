"""OAuth provider account ORM model."""

import uuid
from sqlalchemy import ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class OAuthAccount(Base, TimestampMixin):
    """
    Links a third-party OAuth provider identity to a local NexaAI user.
    Supports Google, GitHub, and future providers.
    """

    __tablename__ = "oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
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
    provider: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
        doc="OAuth provider name: google, github.",
    )
    provider_account_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Unique account ID from the OAuth provider.",
    )
    provider_email: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
        doc="Email from the OAuth provider profile.",
    )

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="oauth_accounts")  # type: ignore  # noqa: F821

    def __repr__(self) -> str:
        return f"<OAuthAccount {self.provider}:{self.provider_account_id} user={self.user_id}>"
