"""Pydantic schemas for Attachment API responses (Phase 10)."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttachmentResponse(BaseModel):
    """
    Public attachment metadata returned to clients.

    ``storage_key`` is intentionally excluded — clients must never receive
    internal filesystem paths or object-storage keys.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    original_filename: str
    mime_type: str
    file_size: int
    media_type: str
    status: str
    checksum_sha256: str
    metadata_json: Optional[str] = None
    error_message: Optional[str] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Computed download URL — injected by the service layer
    download_url: Optional[str] = None


class AttachmentUploadResponse(AttachmentResponse):
    """Returned immediately after a successful upload."""
    download_url: Optional[str] = None


class AttachmentListResponse(BaseModel):
    """Paginated list of attachments."""
    items: list[AttachmentResponse]
    total: int
    page: int
    page_size: int
