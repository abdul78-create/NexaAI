"""API endpoints for authenticated global conversation and message search."""

import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.search import SearchResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
@router.get("/conversations", response_model=SearchResponse)
@router.get("/messages", response_model=SearchResponse)
async def search_user_conversations(
    q: str = Query("", description="Search term across conversation titles and message content"),
    conversation_id: Optional[uuid.UUID] = Query(None, description="Optional conversation UUID filter"),
    role: Optional[str] = Query(None, description="Optional message role filter ('user' | 'assistant')"),
    from_date: Optional[datetime] = Query(None, description="Optional start datetime filter"),
    to_date: Optional[datetime] = Query(None, description="Optional end datetime filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size limit"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    """Execute user-isolated search across owned conversation titles and chat messages."""
    return await SearchService.search_user_data(
        db=db,
        user_id=current_user.id,
        query=q,
        conversation_id=conversation_id,
        role=role,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=page_size,
    )
