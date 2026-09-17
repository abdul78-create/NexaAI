"""User Pydantic schemas and DTOs."""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Base user properties."""

    email: EmailStr
    display_name: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="User's display or chosen name",
    )


class UserResponse(UserBase):
    """Standard user public representation."""

    id: uuid.UUID
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    has_password: bool = True
    oauth_providers: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class UserUsageSummary(BaseModel):
    """Usage summary returned for the current user profile."""

    total_tokens: int = Field(default=0, description="Total tokens consumed")
    conversations: int = Field(default=0, description="Total active conversations")
    documents: int = Field(default=0, description="Total processed documents")


class UserMeResponse(UserResponse):
    """Current authenticated user profile response with usage metrics."""

    usage: UserUsageSummary = Field(
        default_factory=UserUsageSummary,
        description="Account usage statistics",
    )
