"""Authentication & token ORM models."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RefreshToken(Base):
    """Persisted refresh token record for token rotation and revocation."""

    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    revoked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(  # type: ignore # noqa: F821
        "User",
        back_populates="refresh_tokens",
    )

    @property
    def is_valid(self) -> bool:
        """Check whether the token is neither expired nor revoked."""
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return (not self.revoked) and (exp is not None and exp > now)

    def __repr__(self) -> str:
        return f"<RefreshToken user={self.user_id} revoked={self.revoked}>"
