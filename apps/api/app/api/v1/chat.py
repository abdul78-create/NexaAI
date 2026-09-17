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
    BranchSelectRequest,
    BranchSelectResponse,
    ChatStreamRequest,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdate,
    MessageEditRequest,
    MessageResponse,
    ModelInfoResponse,
)
from app.services.ai.factory import get_ai_provider
from app.services.chat_service import (
    compute_active_path_messages,
    create_user_conversation,
    delete_user_conversation,
    edit_user_message_branch,
    generate_chat_sse_stream,
    get_user_conversation,
    list_trashed_conversations,
    list_user_conversations,
    purge_user_conversation,
    regenerate_assistant_message_branch,
    restore_user_conversation,
    select_conversation_branch,
    soft_delete_user_conversation,
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
    """Stream multimodal AI chat completion for authenticated user via text/event-stream."""
    from app.services.ai.orchestrator import MultimodalAIOrchestrator

    orchestrator = MultimodalAIOrchestrator(db)
    attachment_list = (
        [att.model_dump() for att in payload.attachments]
        if payload.attachments
        else []
    )

    generator = orchestrator.generate_multimodal_sse_stream(
        user_id=current_user.id,
        conversation_id=payload.conversation_id,
        user_prompt=payload.content,
        model_id=payload.model or "nexa-standard",
        attachment_inputs=attachment_list,
        options=payload.options or {},
        mode=payload.mode or "standard",
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
    summary="List active conversations owned by current authenticated user",
)
async def list_conversations(
    include_archived: bool = False,
    folder_id: Optional[UUID] = None,
    is_pinned: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[ConversationResponse]:
    """Retrieve active conversations for caller with ownership, folder, pin, and archive filtering."""
    convs = await list_user_conversations(
        db,
        user_id=current_user.id,
        include_archived=include_archived,
        folder_id=folder_id,
        is_pinned=is_pinned,
    )
    return [ConversationResponse.model_validate(c) for c in convs]


@router.get(
    "/conversations/trash",
    response_model=List[ConversationResponse],
    summary="List soft-deleted (trashed) conversations",
)
async def list_trash(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[ConversationResponse]:
    """Retrieve soft-deleted conversations owned by authenticated user."""
    convs = await list_trashed_conversations(db, current_user.id)
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
    summary="Get conversation details and active path messages by ID",
)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailResponse:
    """Get conversation details with active branch path reconstructed."""
    conv = await get_user_conversation(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    active_path = compute_active_path_messages(conv)
    return ConversationDetailResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        model=conv.model,
        is_archived=conv.is_archived,
        is_pinned=conv.is_pinned,
        folder_id=conv.folder_id,
        deleted_at=conv.deleted_at,
        active_leaf_message_id=conv.active_leaf_message_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageResponse.model_validate(m) for m in active_path],
    )


@router.post(
    "/conversations/{conversation_id}/select-branch",
    response_model=BranchSelectResponse,
    summary="Select active leaf or branch message for a conversation",
)
async def select_branch(
    conversation_id: UUID,
    payload: BranchSelectRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> BranchSelectResponse:
    """Select active branch message endpoint for conversation navigation."""
    res = await select_conversation_branch(db, conversation_id, current_user.id, payload.message_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation or target message not found, or access denied.",
        )
    return BranchSelectResponse(
        active_leaf_message_id=res["active_leaf_message_id"],
        messages=[MessageResponse.model_validate(m) for m in res["messages"]],
    )


@router.post(
    "/messages/{message_id}/edit",
    response_model=BranchSelectResponse,
    summary="Edit a user message prompt and generate a new response branch",
)
async def edit_message(
    message_id: UUID,
    payload: MessageEditRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> BranchSelectResponse:
    """Create a new user message sibling branch and generate AI response."""
    res = await edit_user_message_branch(db, current_user.id, message_id, payload.content)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to edit message. Verify message belongs to caller and is a user prompt.",
        )
    return BranchSelectResponse(
        active_leaf_message_id=res["active_leaf_message_id"],
        messages=[MessageResponse.model_validate(m) for m in res["messages"]],
    )


@router.post(
    "/messages/{message_id}/regenerate",
    response_model=BranchSelectResponse,
    summary="Regenerate an assistant message response branch",
)
async def regenerate_message(
    message_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> BranchSelectResponse:
    """Create a new assistant response sibling under the parent user prompt."""
    res = await regenerate_assistant_message_branch(db, current_user.id, message_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to regenerate message. Verify message belongs to caller and is an assistant response.",
        )
    return BranchSelectResponse(
        active_leaf_message_id=res["active_leaf_message_id"],
        messages=[MessageResponse.model_validate(m) for m in res["messages"]],
    )



@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Update conversation title, model, archive, pin, or folder status",
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


@router.post(
    "/conversations/{conversation_id}/trash",
    response_model=ConversationResponse,
    summary="Soft-delete a conversation (move to trash)",
)
async def trash_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Move conversation to trash."""
    conv = await soft_delete_user_conversation(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return ConversationResponse.model_validate(conv)


@router.post(
    "/conversations/{conversation_id}/restore",
    response_model=ConversationResponse,
    summary="Restore a soft-deleted conversation from trash",
)
async def restore_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Restore conversation from trash preserving folder, pin, and archive metadata."""
    conv = await restore_user_conversation(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return ConversationResponse.model_validate(conv)


@router.delete(
    "/conversations/{conversation_id}/purge",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently purge a conversation session",
)
async def purge_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete conversation owned by current user."""
    deleted = await purge_user_conversation(db, conversation_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return None


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation session (moves to trash)",
)
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Move a conversation to trash for caller."""
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
