"""Pydantic schemas for global conversation and message search."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SearchResultItem(BaseModel):
    """Single search result entry representing a matching conversation or message."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique ID of the matched item (Conversation UUID or ChatMessage UUID)")
    type: str = Field(..., description="Result entity type ('conversation' | 'message')")
    conversation_id: str = Field(..., description="UUID of the parent conversation")
    title: str = Field(..., description="Title of the conversation")
    role: Optional[str] = Field(None, description="Message role if type=='message' ('user' | 'assistant' | 'system')")
    snippet: str = Field(..., description="Highlighted or contextual text excerpt matching query")
    match_field: str = Field(..., description="Field matched ('title' | 'content')")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class SearchResponse(BaseModel):
    """Envelope response for global conversation and message search queries."""

    query: str = Field(..., description="Search query executed")
    total_conversations: int = Field(0, description="Total matching conversations")
    total_messages: int = Field(0, description="Total matching messages")
    total_results: int = Field(0, description="Total aggregated matching results")
    page: int = Field(1, description="Current page number")
    page_size: int = Field(20, description="Page size limit")
    items: List[SearchResultItem] = Field(default_factory=list, description="Paginated list of search results")
