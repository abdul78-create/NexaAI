"""Pydantic schemas for Folder management endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class FolderCreate(BaseModel):
    """Payload to create a new folder."""
    name: str = Field(..., min_length=1, max_length=100, description="Unique folder name for the user.")
    color: Optional[str] = Field("indigo", max_length=30, description="Folder theme color identifier or hex code.")


class FolderUpdate(BaseModel):
    """Payload to update an existing folder."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="New folder name.")
    color: Optional[str] = Field(None, max_length=30, description="New folder theme color.")


class FolderResponse(BaseModel):
    """Representation of a folder item."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    color: str
    created_at: datetime
    updated_at: datetime
