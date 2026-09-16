"""Pydantic schemas for secure conversation sharing."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CreateShareRequest(BaseModel):
    """Request payload to generate or update a share link."""

    expires_in_days: Optional[int] = Field(
        None,
        ge=1,
        le=365,
        description="Optional expiration in days from now (1, 7, 30, 365, or null for never)",
    )


class UpdateShareRequest(BaseModel):
    """Request payload to modify share link settings."""

    is_enabled: Optional[bool] = Field(None, description="Enable or disable share link access")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Update expiration duration in days")


class ShareResponse(BaseModel):
    """Owner metadata response for conversation share settings."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Share record UUID")
    conversation_id: str = Field(..., description="Shared conversation UUID")
    share_token: Optional[str] = Field(
        None,
        description="Public unhashed share token (returned to owner when active)",
    )
    share_url: Optional[str] = Field(None, description="Relative public share URL path (/shared/{token})")
    is_enabled: bool = Field(..., description="Whether share link is active")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp if set")
    revoked_at: Optional[datetime] = Field(None, description="Revocation timestamp if revoked")
    access_count: int = Field(0, description="Total public view count")
    last_accessed_at: Optional[datetime] = Field(None, description="Last access timestamp")
    created_at: datetime = Field(..., description="Share link creation timestamp")


class SharedAttachmentMetadata(BaseModel):
    """Safe attachment metadata for public shared message view (no storage paths or user IDs)."""

    id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    media_type: str


class SharedMessageItem(BaseModel):
    """Individual read-only message item in a public shared view."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    created_at: datetime
    attachments: List[SharedAttachmentMetadata] = Field(default_factory=list)


class PublicShareView(BaseModel):
    """Public read-only view of a shared conversation (strictly omits owner email, user ID, secrets)."""

    model_config = ConfigDict(from_attributes=True)

    conversation_id: str
    title: str
    model: str
    created_at: datetime
    messages: List[SharedMessageItem] = Field(default_factory=list)
