"""Chat and Conversation business service enforcing strict user ownership isolation."""

import json
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.chat import Conversation, ChatMessage
from app.schemas.chat import ConversationUpdate
from app.services.ai.base import ChatMessagePayload
from app.services.ai.factory import get_ai_provider


async def get_user_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    include_deleted: bool = False,
) -> Optional[Conversation]:
    """Retrieve a conversation by ID ONLY if owned by the target user_id."""
    db.expire_all()
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    if not include_deleted:
        stmt = stmt.where(Conversation.deleted_at.is_(None))

    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_user_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_archived: bool = False,
    folder_id: Optional[uuid.UUID] = None,
    is_pinned: Optional[bool] = None,
) -> List[Conversation]:
    """List all active conversations owned by the target user_id."""
    stmt = select(Conversation).where(
        Conversation.user_id == user_id,
        Conversation.deleted_at.is_(None),
    )
    if not include_archived:
        stmt = stmt.where(Conversation.is_archived == False)  # noqa: E712
    if folder_id is not None:
        stmt = stmt.where(Conversation.folder_id == folder_id)
    if is_pinned is not None:
        stmt = stmt.where(Conversation.is_pinned == is_pinned)

    stmt = stmt.order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_trashed_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> List[Conversation]:
    """List all soft-deleted conversations owned by the target user_id."""
    stmt = (
        select(Conversation)
        .where(
            Conversation.user_id == user_id,
            Conversation.deleted_at.isnot(None),
        )
        .order_by(Conversation.deleted_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_user_conversation(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str = "New Chat",
    model: str = "nexa-standard",
    folder_id: Optional[uuid.UUID] = None,
) -> Conversation:
    """Create a new conversation session owned by user_id."""
    conv = Conversation(
        user_id=user_id,
        title=title[:255],
        model=model,
        folder_id=folder_id,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def update_user_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    updates: ConversationUpdate,
) -> Optional[Conversation]:
    """Update metadata (title, model, archive, pin, folder) of a conversation owned by user_id."""
    conv = await get_user_conversation(db, conversation_id, user_id)
    if not conv:
        return None

    fields_set = updates.model_fields_set
    if "title" in fields_set and updates.title is not None:
        conv.title = updates.title.strip()[:255]
    if "model" in fields_set and updates.model is not None:
        conv.model = updates.model.strip()
    if "is_archived" in fields_set and updates.is_archived is not None:
        conv.is_archived = updates.is_archived
    if "is_pinned" in fields_set and updates.is_pinned is not None:
        conv.is_pinned = updates.is_pinned
    if "folder_id" in fields_set:
        conv.folder_id = updates.folder_id

    await db.commit()
    await db.refresh(conv)
    return conv


async def soft_delete_user_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Optional[Conversation]:
    """Soft-delete a conversation owned by user_id by setting deleted_at timestamp."""
    conv = await get_user_conversation(db, conversation_id, user_id, include_deleted=True)
    if not conv:
        return None

    if conv.deleted_at is None:
        conv.deleted_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(conv)

    return conv


async def restore_user_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Optional[Conversation]:
    """Restore a soft-deleted conversation owned by user_id, preserving folder_id, is_pinned, and is_archived."""
    conv = await get_user_conversation(db, conversation_id, user_id, include_deleted=True)
    if not conv:
        return None

    if conv.deleted_at is not None:
        conv.deleted_at = None
        await db.commit()
        await db.refresh(conv)

    return conv


async def purge_user_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Permanently delete a conversation owned by user_id from the database."""
    conv = await get_user_conversation(db, conversation_id, user_id, include_deleted=True)
    if not conv:
        return False

    await db.delete(conv)
    await db.commit()
    return True


async def delete_user_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Soft delete a conversation owned by user_id for backward compatibility."""
    result = await soft_delete_user_conversation(db, conversation_id, user_id)
    return result is not None



async def add_chat_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    model: Optional[str] = None,
    parent_message_id: Optional[uuid.UUID] = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> ChatMessage:
    """Persist a message into an existing conversation."""
    msg = ChatMessage(
        conversation_id=conversation_id,
        parent_message_id=parent_message_id,
        role=role,
        content=content,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


def compute_active_path_messages(conv: Conversation) -> List[dict]:
    """Reconstruct the ordered active branch message path from Root -> Leaf with sibling metadata."""
    if not conv.messages:
        return []

    msg_map = {str(m.id): m for m in conv.messages}

    # Determine starting leaf
    active_leaf: Optional[ChatMessage] = None
    if conv.active_leaf_message_id and str(conv.active_leaf_message_id) in msg_map:
        active_leaf = msg_map[str(conv.active_leaf_message_id)]
    else:
        # Find leaves (messages that have no child messages)
        parent_ids = {str(m.parent_message_id) for m in conv.messages if m.parent_message_id is not None}
        leaves = [m for m in conv.messages if str(m.id) not in parent_ids]
        if leaves:
            leaves.sort(key=lambda x: x.created_at, reverse=True)
            active_leaf = leaves[0]
        else:
            active_leaf = sorted(conv.messages, key=lambda x: x.created_at, reverse=True)[0]

    # Traverse backwards Leaf -> Root
    path: List[ChatMessage] = []
    visited = set()
    curr: Optional[ChatMessage] = active_leaf

    while curr:
        curr_id_str = str(curr.id)
        if curr_id_str in visited:
            break  # Prevent potential cyclic relationships
        visited.add(curr_id_str)
        path.append(curr)

        parent_id_str = str(curr.parent_message_id) if curr.parent_message_id else None
        if parent_id_str and parent_id_str in msg_map:
            curr = msg_map[parent_id_str]
        else:
            break

    path.reverse()  # Root -> Leaf

    # Compute sibling metadata for each message in active path
    result = []
    for m in path:
        m_parent_str = str(m.parent_message_id) if m.parent_message_id else None
        siblings = [
            s for s in conv.messages
            if (str(s.parent_message_id) if s.parent_message_id else None) == m_parent_str
        ]
        siblings.sort(key=lambda x: x.created_at)
        sibling_ids = [str(s.id) for s in siblings]
        sibling_count = len(siblings)
        m_id_str = str(m.id)
        sibling_index = (sibling_ids.index(m_id_str) + 1) if m_id_str in sibling_ids else 1

        result.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "parent_message_id": m.parent_message_id,
            "role": m.role,
            "content": m.content,
            "model": m.model,
            "input_tokens": m.input_tokens,
            "output_tokens": m.output_tokens,
            "created_at": m.created_at,
            "sibling_index": sibling_index,
            "sibling_count": sibling_count,
            "sibling_ids": sibling_ids,
        })

    return result


async def select_conversation_branch(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    message_id: uuid.UUID,
) -> Optional[dict]:
    """Select a specific branch message or leaf as the active branch for a conversation."""
    conv = await get_user_conversation(db, conversation_id, user_id)
    if not conv:
        return None

    msg_map = {str(m.id): m for m in conv.messages}
    msg_id_str = str(message_id)
    if msg_id_str not in msg_map:
        return None

    target_msg = msg_map[msg_id_str]

    # Find the newest descendant leaf starting from target_msg
    curr_leaf = target_msg
    while True:
        curr_id_str = str(curr_leaf.id)
        children = [m for m in conv.messages if (str(m.parent_message_id) if m.parent_message_id else None) == curr_id_str]
        if not children:
            break
        children.sort(key=lambda x: x.created_at, reverse=True)
        curr_leaf = children[0]

    conv.active_leaf_message_id = curr_leaf.id
    await db.commit()
    await db.refresh(conv)

    active_messages = compute_active_path_messages(conv)
    return {
        "active_leaf_message_id": curr_leaf.id,
        "messages": active_messages,
    }


async def edit_user_message_branch(
    db: AsyncSession,
    user_id: uuid.UUID,
    message_id: uuid.UUID,
    new_content: str,
) -> Optional[dict]:
    """Edit a user message by creating a sibling branch and generating a new assistant response."""
    # Find message and verify ownership
    stmt = (
        select(ChatMessage)
        .options(selectinload(ChatMessage.conversation))
        .where(ChatMessage.id == message_id)
    )
    res = await db.execute(stmt)
    orig_msg = res.scalar_one_or_none()

    if not orig_msg or orig_msg.role != "user":
        return None

    conv = await get_user_conversation(db, orig_msg.conversation_id, user_id)
    if not conv:
        return None

    clean_content = new_content.strip()
    if not clean_content:
        return None

    # 1. Create new user sibling message
    edited_user_msg = ChatMessage(
        conversation_id=conv.id,
        parent_message_id=orig_msg.parent_message_id,
        role="user",
        content=clean_content,
        model=conv.model,
        input_tokens=max(1, len(clean_content) // 4),
    )
    db.add(edited_user_msg)
    await db.commit()
    await db.refresh(edited_user_msg)

    # 2. Assemble historical context up to edited_user_msg
    conv = await get_user_conversation(db, conv.id, user_id)
    conv.active_leaf_message_id = edited_user_msg.id
    await db.commit()

    active_msgs = compute_active_path_messages(conv)
    msg_history = [ChatMessagePayload(role=m["role"], content=m["content"]) for m in active_msgs]

    # 3. Generate new assistant response
    provider = get_ai_provider()
    accumulated_text = ""
    input_tokens = 0
    output_tokens = 0

    try:
        async for event in provider.stream(messages=msg_history, model=conv.model):
            if event.event == "token":
                accumulated_text += event.data.get("text", "")
            elif event.event == "usage":
                input_tokens = event.data.get("input_tokens", 0)
                output_tokens = event.data.get("output_tokens", 0)
    except Exception as e:
        accumulated_text = f"Error generating response: {str(e)}"

    assistant_msg = ChatMessage(
        conversation_id=conv.id,
        parent_message_id=edited_user_msg.id,
        role="assistant",
        content=accumulated_text or "Response generated.",
        model=conv.model,
        input_tokens=input_tokens,
        output_tokens=output_tokens or max(1, len(accumulated_text) // 4),
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    conv.active_leaf_message_id = assistant_msg.id
    await db.commit()
    await db.refresh(conv)

    return {
        "active_leaf_message_id": assistant_msg.id,
        "messages": compute_active_path_messages(conv),
    }


async def regenerate_assistant_message_branch(
    db: AsyncSession,
    user_id: uuid.UUID,
    message_id: uuid.UUID,
) -> Optional[dict]:
    """Regenerate an assistant message by creating a sibling response under the parent user message."""
    stmt = (
        select(ChatMessage)
        .options(selectinload(ChatMessage.conversation))
        .where(ChatMessage.id == message_id)
    )
    res = await db.execute(stmt)
    orig_asst_msg = res.scalar_one_or_none()

    if not orig_asst_msg or orig_asst_msg.role != "assistant" or not orig_asst_msg.parent_message_id:
        return None

    conv = await get_user_conversation(db, orig_asst_msg.conversation_id, user_id)
    if not conv:
        return None

    parent_user_msg_id = orig_asst_msg.parent_message_id
    conv.active_leaf_message_id = parent_user_msg_id
    await db.commit()

    active_msgs = compute_active_path_messages(conv)
    msg_history = [ChatMessagePayload(role=m["role"], content=m["content"]) for m in active_msgs]

    provider = get_ai_provider()
    accumulated_text = ""
    input_tokens = 0
    output_tokens = 0

    try:
        async for event in provider.stream(messages=msg_history, model=conv.model):
            if event.event == "token":
                accumulated_text += event.data.get("text", "")
            elif event.event == "usage":
                input_tokens = event.data.get("input_tokens", 0)
                output_tokens = event.data.get("output_tokens", 0)
    except Exception as e:
        accumulated_text = f"Error generating response: {str(e)}"

    new_assistant_msg = ChatMessage(
        conversation_id=conv.id,
        parent_message_id=parent_user_msg_id,
        role="assistant",
        content=accumulated_text or "Response regenerated.",
        model=conv.model,
        input_tokens=input_tokens,
        output_tokens=output_tokens or max(1, len(accumulated_text) // 4),
    )
    db.add(new_assistant_msg)
    await db.commit()
    await db.refresh(new_assistant_msg)

    conv.active_leaf_message_id = new_assistant_msg.id
    await db.commit()
    await db.refresh(conv)

    return {
        "active_leaf_message_id": new_assistant_msg.id,
        "messages": compute_active_path_messages(conv),
    }


async def generate_chat_sse_stream(
    db: AsyncSession,
    user_id: uuid.UUID,
    conversation_id: Optional[uuid.UUID],
    user_prompt: str,
    model_id: str,
) -> AsyncIterator[str]:
    """Execute AI provider completion stream and yield formatted SSE string frames.
    
    SSE Event Contract:
      event: message_start -> {"conversation_id": "...", "message_id": "...", "model": "..."}
      event: token -> {"text": "..."}
      event: usage -> {"input_tokens": N, "output_tokens": N}
      event: message_end -> {"message_id": "...", "finish_reason": "stop"}
      event: error -> {"code": "...", "message": "..."}
    """
    def format_sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    # 1. Resolve or Create Conversation with Strict Ownership
    if conversation_id:
        conv = await get_user_conversation(db, conversation_id, user_id)
        if not conv:
            yield format_sse(
                "error",
                {"code": "NOT_FOUND", "message": "Conversation not found or access denied."}
            )
            return
    else:
        # Create new conversation titled from first 35 chars of user prompt
        auto_title = user_prompt.strip()[:35] or "New Chat"
        if len(user_prompt.strip()) > 35:
            auto_title += "..."
        conv = await create_user_conversation(
            db=db,
            user_id=user_id,
            title=auto_title,
            model=model_id,
        )

    # 2. Persist User Prompt Message with parent_message_id set to active_leaf
    user_msg = await add_chat_message(
        db=db,
        conversation_id=conv.id,
        parent_message_id=conv.active_leaf_message_id,
        role="user",
        content=user_prompt,
        model=model_id,
        input_tokens=max(1, len(user_prompt) // 4),
    )
    user_msg_id = user_msg.id

    conv.active_leaf_message_id = user_msg_id
    await db.commit()

    # 3. Assemble active historical message context for AI provider
    history_conv = await get_user_conversation(db, conv.id, user_id)
    msg_history: List[ChatMessagePayload] = []
    if history_conv:
        active_msgs = compute_active_path_messages(history_conv)
        for m in active_msgs:
            msg_history.append(ChatMessagePayload(role=m["role"], content=m["content"]))

    if not msg_history:
        msg_history = [ChatMessagePayload(role="user", content=user_prompt)]

    # Prepare Assistant message placeholder ID
    assistant_msg_id = uuid.uuid4()

    # Yield message_start event
    yield format_sse(
        "message_start",
        {
            "conversation_id": str(conv.id),
            "message_id": str(assistant_msg_id),
            "model": model_id,
        }
    )

    # 4. Stream AI completion
    provider = get_ai_provider()
    accumulated_text = ""
    input_tokens = 0
    output_tokens = 0
    stream_successful = False

    try:
        async for event in provider.stream(messages=msg_history, model=model_id):
            if event.event == "token":
                token_text = event.data.get("text", "")
                accumulated_text += token_text
                yield format_sse("token", {"text": token_text})

            elif event.event == "usage":
                input_tokens = event.data.get("input_tokens", 0)
                output_tokens = event.data.get("output_tokens", 0)
                yield format_sse("usage", event.data)

            elif event.event == "error":
                yield format_sse("error", event.data)
                return

            elif event.event == "message_end":
                stream_successful = True
                yield format_sse(
                    "message_end",
                    {"message_id": str(assistant_msg_id), "finish_reason": "stop"}
                )

    except Exception as e:
        yield format_sse(
            "error",
            {"code": "STREAMING_ERROR", "message": f"Stream execution failed: {str(e)}"}
        )
        return

    # 5. Persist Assistant message upon clean completion
    if stream_successful and accumulated_text:
        assistant_msg = ChatMessage(
            id=assistant_msg_id,
            conversation_id=conv.id,
            parent_message_id=user_msg_id,
            role="assistant",
            content=accumulated_text,
            model=model_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens or max(1, len(accumulated_text) // 4),
        )
        db.add(assistant_msg)
        await db.commit()

        # Update active_leaf_message_id to new assistant response
        conv.active_leaf_message_id = assistant_msg.id
        await db.commit()
        db.expire_all()


