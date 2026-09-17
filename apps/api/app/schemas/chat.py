"""Pydantic schemas for Chat and Conversation endpoints."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    """Payload to post a new user message."""
    content: str = Field(..., min_length=1, description="Text content of the user prompt.")
    model: Optional[str] = Field(None, description="Model selected for completion.")


class MessageResponse(BaseModel):
    """Representation of a conversation message."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    parent_message_id: Optional[UUID] = None
    role: str
    content: str
    model: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    created_at: datetime
    sibling_index: Optional[int] = 1
    sibling_count: Optional[int] = 1
    sibling_ids: Optional[List[UUID]] = []


class MessageEditRequest(BaseModel):
    """Payload to edit a user message prompt."""
    content: str = Field(..., min_length=1, description="Edited prompt content.")


class BranchSelectRequest(BaseModel):
    """Payload to select a conversation active leaf or branch."""
    message_id: UUID = Field(..., description="Selected message UUID.")


class BranchSelectResponse(BaseModel):
    """Response containing updated active leaf ID and active message tree path."""
    active_leaf_message_id: Optional[UUID] = None
    messages: List[MessageResponse] = []



class ConversationCreate(BaseModel):
    """Payload to initialize a new conversation."""
    title: Optional[str] = Field("New Chat", max_length=255)
    model: Optional[str] = Field("nexa-standard", max_length=100)


class ConversationUpdate(BaseModel):
    """Payload to update conversation metadata."""
    title: Optional[str] = Field(None, max_length=255)
    model: Optional[str] = Field(None, max_length=100)
    is_archived: Optional[bool] = None
    is_pinned: Optional[bool] = None
    folder_id: Optional[UUID] = None


class ConversationResponse(BaseModel):
    """Lightweight representation of a conversation item for lists/sidebars."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    model: str
    is_archived: bool
    is_pinned: bool = False
    folder_id: Optional[UUID] = None
    deleted_at: Optional[datetime] = None
    active_leaf_message_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime



class ConversationDetailResponse(ConversationResponse):
    """Detailed conversation representation including historical messages."""
    messages: List[MessageResponse] = []


class AttachmentInputItem(BaseModel):
    """Attachment input item reference."""
    attachment_id: UUID = Field(..., description="UUID of ready attachment.")
    kind: Optional[str] = Field("image", description="Attachment kind: image | document | audio.")


class ChatStreamRequest(BaseModel):
    """Input payload for stream completion endpoint with multimodal support."""
    conversation_id: Optional[UUID] = Field(None, description="Existing conversation ID or None to start a new one.")
    content: str = Field(..., min_length=1, description="User prompt text.")
    model: Optional[str] = Field("nexa-standard", description="Selected model identifier.")
    mode: Optional[str] = Field("standard", description="Selected chat mode: quick | standard | high.")
    attachments: Optional[List[AttachmentInputItem]] = Field(default_factory=list, description="Optional multimodal attachments.")
    options: Optional[dict] = Field(default_factory=dict, description="Execution flags (use_ocr, use_rag, etc.).")


class ModelInfoResponse(BaseModel):
    """Representation of an available AI model."""
    id: str
    name: str
    tagline: str
    description: str
    badge: str
    speed: str
    reasoning: str
    contextWindow: str
    isAvailable: bool

