"""Pydantic schemas for Document Intelligence and RAG endpoints."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class DocumentChunkResponse(BaseModel):
    """Schema representing an individual document chunk."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    chunk_index: int
    content: str
    page_number: int


class DocumentResponse(BaseModel):
    """Schema representing an uploaded document item."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    chunk_count: int
    created_at: datetime


class DocumentDetailResponse(DocumentResponse):
    """Detailed document representation including chunk list."""
    chunks: List[DocumentChunkResponse] = []


class DocumentSearchRequest(BaseModel):
    """Payload for semantic vector similarity search."""
    query: str = Field(..., min_length=1, description="Natural language search query.")
    top_k: Optional[int] = Field(4, ge=1, le=20)
    document_id: Optional[UUID] = Field(None, description="Optional document ID filter.")


class SearchResultChunkResponse(BaseModel):
    """Result item of a vector search."""
    chunk_id: UUID
    document_id: UUID
    filename: str
    chunk_index: int
    content: str
    page_number: int
    similarity_score: float


class RAGQueryRequest(BaseModel):
    """Payload for grounded RAG Question Answering."""
    question: str = Field(..., min_length=1, description="Question to answer over document library.")
    top_k: Optional[int] = Field(4, ge=1, le=10)
    document_id: Optional[UUID] = Field(None)
    model: Optional[str] = Field("nexa-standard")


class RAGCitationResponse(BaseModel):
    """Grounded source citation item."""
    citation_id: int
    document_id: UUID
    filename: str
    page_number: int
    excerpt: str
    relevance_score: float


class RAGQueryResponse(BaseModel):
    """Grounded RAG Q&A response payload."""
    query: str
    answer: str
    citations: List[RAGCitationResponse]
    retrieved_chunks_count: int
