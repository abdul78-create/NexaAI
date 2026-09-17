"""Conversation and ChatMessage ORM models."""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Conversation(Base, TimestampMixin):
    """Conversation session model belonging to a registered user."""

    __tablename__ = "conversations"

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
    folder_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="New Chat",
    )
    model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="nexa-standard",
    )
    is_pinned: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    active_leaf_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "chat_messages.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_conversations_active_leaf_message_id",
        ),
        nullable=True,
        index=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(  # type: ignore # noqa: F821
        "User",
        back_populates="conversations",
    )
    folder: Mapped[Optional["Folder"]] = relationship(  # type: ignore # noqa: F821
        "Folder",
        back_populates="conversations",
    )
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
        foreign_keys="[ChatMessage.conversation_id]",
        lazy="selectin",
    )
    active_leaf_message: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage",
        foreign_keys=[active_leaf_message_id],
        post_update=True,
    )
    shares: Mapped[List["ConversationShare"]] = relationship(  # type: ignore # noqa: F821
        "ConversationShare",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationShare.created_at.desc()",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Conversation {self.id} ({self.title})>"


class ChatMessage(Base, TimestampMixin):
    """Individual message within a conversation."""

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("chat_messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    model: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    input_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    output_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('system', 'user', 'assistant')",
            name="check_valid_role",
        ),
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation",
        back_populates="messages",
        foreign_keys=[conversation_id],
    )
    parent_message: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage",
        remote_side="[ChatMessage.id]",
        back_populates="child_messages",
        foreign_keys=[parent_message_id],
    )
    child_messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="parent_message",
        foreign_keys=[parent_message_id],
    )
    message_attachments: Mapped[List["ChatMessageAttachment"]] = relationship(  # type: ignore # noqa: F821
        "ChatMessageAttachment",
        back_populates="message",
        cascade="all, delete-orphan",
        order_by="ChatMessageAttachment.display_order",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<ChatMessage {self.id} [{self.role}]>"
