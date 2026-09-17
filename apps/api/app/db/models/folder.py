"""Folder ORM model for organizing user conversations."""

import uuid
from typing import List, Optional
from sqlalchemy import ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Folder(Base, TimestampMixin):
    """Workspace folder model belonging to a user."""

    __tablename__ = "folders"

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
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    color: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="indigo",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_folder_name"),
    )

    # Relationships
    user: Mapped["User"] = relationship(  # type: ignore # noqa: F821
        "User",
        back_populates="folders",
    )
    conversations: Mapped[List["Conversation"]] = relationship(  # type: ignore # noqa: F821
        "Conversation",
        back_populates="folder",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Folder {self.id} ({self.name})>"
