"""SQLAlchemy ORM models export."""

import uuid
from sqlalchemy import String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.db.models.auth import RefreshToken
from app.db.models.user import User
from app.db.models.chat import Conversation, ChatMessage
from app.db.models.chat_message_attachment import ChatMessageAttachment
from app.db.models.nlp import NLPAnalysis
from app.db.models.document import Document, DocumentChunk
from app.db.models.attachment import Attachment
from app.db.models.image_analysis import ImageAnalysis
from app.db.models.usage import AIUsageLog
from app.db.models.speech import SpeechTranscription
from app.db.models.preferences import UserPreferences
from app.db.models.share import ConversationShare
from app.db.models.folder import Folder
from app.db.models.oauth_account import OAuthAccount
from app.db.models.prompt import Prompt


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


__all__ = [
    "Base",
    "User",
    "RefreshToken",
    "SystemMetadata",
    "Conversation",
    "ChatMessage",
    "ChatMessageAttachment",
    "NLPAnalysis",
    "Document",
    "DocumentChunk",
    "Attachment",
    "ImageAnalysis",
    "AIUsageLog",
    "SpeechTranscription",
    "UserPreferences",
    "ConversationShare",
    "Folder",
    "OAuthAccount",
    "Prompt",
]

