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
        """List of linked OAuth provider names.

        Reads eagerly-loaded oauth_accounts safely without triggering synchronous
        lazy loading / MissingGreenlet during async session serialization.
        """
        try:
            from sqlalchemy import inspect
            from sqlalchemy.orm.attributes import NO_VALUE

            state = inspect(self)
            if state is not None and "oauth_accounts" in state.attrs:
                loaded = state.attrs.oauth_accounts.loaded_value
                if loaded is not NO_VALUE and loaded is not None:
                    return [oa.provider for oa in loaded]
                return []
        except Exception:
            pass

        # Fallback for plain Python objects / unit test mocks
        accounts = getattr(self, "__dict__", {}).get("oauth_accounts")
        if isinstance(accounts, list):
            return [getattr(oa, "provider", str(oa)) for oa in accounts]
        return []

    @property
    def oauth_providers(self) -> List[str]:
        """Alias for linked OAuth provider names."""
        return self.linked_providers

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.id})>"
