"""ChatMessageAttachment join ORM model for Phase 14 Multimodal Chat."""

import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ChatMessageAttachment(Base, TimestampMixin):
    """
    Join model associating a ChatMessage with an Attachment.
    Tracks attachment kind, display order, and optional metadata.
    """

    __tablename__ = "chat_message_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("chat_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attachment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("attachments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    kind: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="image",
        doc="Attachment category: image | document | audio.",
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    metadata_json: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────
    message: Mapped["ChatMessage"] = relationship("ChatMessage", back_populates="message_attachments")  # type: ignore # noqa: F821
    attachment: Mapped["Attachment"] = relationship("Attachment")  # type: ignore # noqa: F821

    def __repr__(self) -> str:
        return f"<ChatMessageAttachment {self.id} [Msg {self.message_id}] [Att {self.attachment_id}]>"
