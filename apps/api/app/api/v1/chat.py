"""Chat and Conversation endpoints router."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.chat import (
    ChatStreamRequest,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdate,
    MessageResponse,
    ModelInfoResponse,
)
from app.services.ai.factory import get_ai_provider
from app.services.chat_service import (
    create_user_conversation,
    delete_user_conversation,
    generate_chat_sse_stream,
    get_user_conversation,
    list_user_conversations,
    update_user_conversation,
)

router = APIRouter(prefix="/chat", tags=["Chat & Conversations"])


@router.post(
    "/stream",
    summary="Stream AI completion response using SSE (Server-Sent Events)",
    response_class=StreamingResponse,
)
async def stream_chat(
    payload: ChatStreamRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream AI chat completion for authenticated user via text/event-stream."""
    generator = generate_chat_sse_stream(
        db=db,
        user_id=current_user.id,
        conversation_id=payload.conversation_id,
        user_prompt=payload.content,
        model_id=payload.model or "nexa-standard",
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/conversations",
    response_model=List[ConversationResponse],
    summary="List all conversations owned by current authenticated user",
)
async def list_conversations(
    include_archived: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[ConversationResponse]:
    """Retrieve all conversations for caller with strict ownership filtering."""
    convs = await list_user_conversations(db, current_user.id, include_archived=include_archived)
    return [ConversationResponse.model_validate(c) for c in convs]


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Create a new conversation for authenticated user."""
    conv = await create_user_conversation(
        db,
        user_id=current_user.id,
        title=payload.title or "New Chat",
        model=payload.model or "nexa-standard",
    )
    return ConversationResponse.model_validate(conv)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get conversation details and messages by ID",
)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    """Get conversation details with strict ownership verification."""
    conv = await get_user_conversation(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return ConversationDetailResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        model=conv.model,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageResponse.model_validate(m) for m in conv.messages],
    )


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Update conversation title, model, or archive status",
)
async def update_conversation(
    conversation_id: UUID,
    payload: ConversationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Update conversation owned by current user."""
    conv = await update_user_conversation(db, conversation_id, current_user.id, payload)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return ConversationResponse.model_validate(conv)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation session",
)
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation owned by current user."""
    deleted = await delete_user_conversation(db, conversation_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return None


@router.get(
    "/models",
    response_model=List[ModelInfoResponse],
    summary="Get available AI models",
)
async def list_models() -> List[ModelInfoResponse]:
    """Retrieve list of available AI models supported by backend provider."""
    provider = get_ai_provider()
    models = await provider.list_models()
    return [ModelInfoResponse.model_validate(m) for m in models]
