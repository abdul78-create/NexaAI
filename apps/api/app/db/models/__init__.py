"""SQLAlchemy ORM models export."""

import uuid
from sqlalchemy import String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.db.models.auth import RefreshToken
from app.db.models.user import User


class SystemMetadata(Base, TimestampMixin):
    """Minimal system metadata table for database readiness validation and migrations."""

    __tablename__ = "system_metadata"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)


__all__ = ["Base", "User", "RefreshToken", "SystemMetadata"]
