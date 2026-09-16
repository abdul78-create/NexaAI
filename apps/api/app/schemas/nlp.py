"""Pydantic schemas for NLP Analysis endpoints."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class NLPAnalyzeRequest(BaseModel):
    """Payload to analyze input text."""
    text: str = Field(..., min_length=3, max_length=50000, description="Input text to process.")
    title: Optional[str] = Field(None, max_length=255, description="Optional custom title for the analysis report.")


class NLPAnalysisSummaryResponse(BaseModel):
    """Summary representation of an NLP report for history lists."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    word_count: int
    character_count: int
    created_at: datetime


class NLPAnalysisDetailResponse(BaseModel):
    """Full detail representation of an NLP analysis report."""
    id: UUID
    user_id: UUID
    title: str
    original_text: str
    result: Dict[str, Any]
    word_count: int
    character_count: int
    created_at: datetime
