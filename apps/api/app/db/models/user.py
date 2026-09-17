"""User ORM model."""

import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """Registered user account model."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    hashed_password: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Argon2id hash. NULL for OAuth-only accounts.",
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        default=None,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Relationships
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(  # type: ignore # noqa: F821
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    conversations: Mapped[List["Conversation"]] = relationship(  # type: ignore # noqa: F821
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    folders: Mapped[List["Folder"]] = relationship(  # type: ignore # noqa: F821
        "Folder",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    nlp_analyses: Mapped[List["NLPAnalysis"]] = relationship(  # type: ignore # noqa: F821
        "NLPAnalysis",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    documents: Mapped[List["Document"]] = relationship(  # type: ignore # noqa: F821
        "Document",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    attachments: Mapped[List["Attachment"]] = relationship(  # type: ignore # noqa: F821
        "Attachment",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )
    oauth_accounts: Mapped[List["OAuthAccount"]] = relationship(  # type: ignore # noqa: F821
        "OAuthAccount",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    prompts: Mapped[List["Prompt"]] = relationship(  # type: ignore # noqa: F821
        "Prompt",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )

    @property
    def has_password(self) -> bool:
        """Whether the user has a local password set."""
        return self.hashed_password is not None

    @property
    def linked_providers(self) -> List[str]:
        """List of linked OAuth provider names."""
        return [oa.provider for oa in self.oauth_accounts]

    @property
    def oauth_providers(self) -> List[str]:
        """Alias for linked OAuth provider names."""
        return self.linked_providers

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.id})>"
