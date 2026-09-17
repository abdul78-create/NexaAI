"""Pydantic schemas for Prompt Library."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PromptBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Title of the prompt template")
    content: str = Field(..., min_length=1, description="The prompt body text, may include {{placeholders}}")
    description: Optional[str] = Field(None, max_length=500, description="Short summary of what this prompt does")
    category: str = Field("general", max_length=50, description="Category: coding, writing, marketing, productivity, analysis, general")
    is_public: bool = Field(False, description="Whether prompt is publicly visible to all users")


class PromptCreate(PromptBase):
    pass


class PromptUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)
    is_public: Optional[bool] = None


class PromptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    title: str
    content: str
    description: Optional[str] = None
    category: str
    is_public: bool
    is_featured: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime

    @property
    def is_system(self) -> bool:
        return self.user_id is None


class PromptListResponse(BaseModel):
    items: List[PromptResponse]
    total: int
    categories: List[str]
