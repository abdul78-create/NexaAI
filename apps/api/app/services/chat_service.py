"""Chat and Conversation business service enforcing strict user ownership isolation."""

import json
import uuid
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
) -> Optional[Conversation]:
    """Retrieve a conversation by ID ONLY if owned by the target user_id."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_user_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_archived: bool = False,
) -> List[Conversation]:
    """List all conversations owned by the target user_id."""
    stmt = select(Conversation).where(Conversation.user_id == user_id)
    if not include_archived:
        stmt = stmt.where(Conversation.is_archived == False)  # noqa: E712
    stmt = stmt.order_by(Conversation.updated_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_user_conversation(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str = "New Chat",
    model: str = "nexa-standard",
) -> Conversation:
    """Create a new conversation session owned by user_id."""
    conv = Conversation(
        user_id=user_id,
        title=title[:255],
        model=model,
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
    """Update title or archived status of a conversation owned by user_id."""
    conv = await get_user_conversation(db, conversation_id, user_id)
    if not conv:
        return None

    if updates.title is not None:
        conv.title = updates.title.strip()[:255]
    if updates.model is not None:
        conv.model = updates.model.strip()
    if updates.is_archived is not None:
        conv.is_archived = updates.is_archived

    await db.commit()
    await db.refresh(conv)
    return conv


async def delete_user_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Delete a conversation owned by user_id (cascade deletes messages)."""
    conv = await get_user_conversation(db, conversation_id, user_id)
    if not conv:
        return False

    await db.delete(conv)
    await db.commit()
    return True


async def add_chat_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    model: Optional[str] = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> ChatMessage:
    """Persist a message into an existing conversation."""
    msg = ChatMessage(
        conversation_id=conversation_id,
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

    # 2. Persist User Prompt Message
    user_msg = await add_chat_message(
        db=db,
        conversation_id=conv.id,
        role="user",
        content=user_prompt,
        model=model_id,
        input_tokens=max(1, len(user_prompt) // 4),
    )

    # 3. Assemble historical message context for AI provider
    # Fetch existing conversation history
    history_conv = await get_user_conversation(db, conv.id, user_id)
    msg_history: List[ChatMessagePayload] = []
    if history_conv:
        for m in history_conv.messages:
            msg_history.append(ChatMessagePayload(role=m.role, content=m.content))

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
            role="assistant",
            content=accumulated_text,
            model=model_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens or max(1, len(accumulated_text) // 4),
        )
        db.add(assistant_msg)
        await db.commit()
