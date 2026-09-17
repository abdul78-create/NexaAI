"""Pydantic schemas for Phase 15 Settings & Preferences APIs."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class UserPreferencesResponse(BaseModel):
    """User preferences settings response payload."""

    id: UUID
    user_id: UUID
    theme: str
    accent_color: str
    default_model: str
    default_language: str
    auto_ocr_enabled: bool
    auto_rag_enabled: bool
    show_provider_disclosures: bool
    reduced_motion: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPreferencesUpdate(BaseModel):
    """Payload to update user preferences settings."""

    theme: Optional[str] = Field(None, max_length=20)
    accent_color: Optional[str] = Field(None, max_length=30)
    default_model: Optional[str] = Field(None, max_length=100)
    default_language: Optional[str] = Field(None, max_length=10)
    auto_ocr_enabled: Optional[bool] = None
    auto_rag_enabled: Optional[bool] = None
    show_provider_disclosures: Optional[bool] = None
    reduced_motion: Optional[bool] = None


class UserProfileResponse(BaseModel):
    """User profile response payload."""

    id: UUID
    email: str
    display_name: str
    role: str = "user"
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    """Payload to update display name or user profile info."""

    display_name: Optional[str] = Field(None, min_length=2, max_length=100)
