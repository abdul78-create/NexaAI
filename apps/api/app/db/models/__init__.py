"""SQLAlchemy ORM models export."""

import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class SystemMetadata(Base, TimestampMixin):
    """Minimal system metadata table for database readiness validation and migrations."""

    __tablename__ = "system_metadata"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_column=True,
        default=uuid.uuid4,
        nullable=False,
    )
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)


__all__ = ["Base", "SystemMetadata"]
