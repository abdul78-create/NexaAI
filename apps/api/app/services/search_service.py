"""Global conversation and message search service scoped to authenticated users."""

import re
import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.chat import ChatMessage, Conversation
from app.schemas.search import SearchResponse, SearchResultItem


def create_snippet(text: str, query: str, max_length: int = 160) -> str:
    """Create a contextual snippet around the matching query term."""
    if not text or not query:
        return text[:max_length] if text else ""

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    match = pattern.search(text)
    if not match:
        return text[:max_length] + ("..." if len(text) > max_length else "")

    start = max(0, match.start() - 60)
    end = min(len(text), match.end() + 100)

    snippet = text[start:end]
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet


class SearchService:
    """Service executing parameterized, user-isolated global searches."""

    @staticmethod
    async def search_user_data(
        db: AsyncSession,
        user_id: uuid.UUID,
        query: str,
        conversation_id: Optional[uuid.UUID] = None,
        role: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        include_archived: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> SearchResponse:
        """Execute user-scoped search across conversation titles and chat message content."""
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        clean_query = query.strip() if query else ""

        # Escape special SQL wildcard characters in literal search string
        safe_query_pattern = f"%{clean_query.replace('%', '\\%').replace('_', '\\_')}%" if clean_query else "%"

        # Base conversation conditions
        conv_conditions = [
            Conversation.user_id == user_id,
            Conversation.deleted_at.is_(None),
        ]
        if not include_archived:
            conv_conditions.append(Conversation.is_archived == False)  # noqa: E712
        if conversation_id:
            conv_conditions.append(Conversation.id == conversation_id)
        if from_date:
            conv_conditions.append(Conversation.created_at >= from_date)
        if to_date:
            conv_conditions.append(Conversation.created_at <= to_date)

        # 1. Search matching Conversations (by title)
        matched_conversations: List[SearchResultItem] = []
        total_conv_count = 0

        if clean_query:
            conv_stmt = (
                select(Conversation)
                .where(and_(*conv_conditions, Conversation.title.ilike(safe_query_pattern)))
                .order_by(Conversation.updated_at.desc())
            )
            conv_result = await db.execute(conv_stmt)
            conv_rows = conv_result.scalars().all()
            total_conv_count = len(conv_rows)

            for conv in conv_rows:
                matched_conversations.append(
                    SearchResultItem(
                        id=str(conv.id),
                        type="conversation",
                        conversation_id=str(conv.id),
                        title=conv.title,
                        role=None,
                        snippet=create_snippet(conv.title, clean_query),
                        match_field="title",
                        created_at=conv.created_at,
                        updated_at=conv.updated_at,
                    )
                )

        # 2. Search matching ChatMessages (by content)
        msg_conditions = [
            Conversation.user_id == user_id,
            ChatMessage.conversation_id == Conversation.id,
            Conversation.deleted_at.is_(None),
        ]
        if not include_archived:
            msg_conditions.append(Conversation.is_archived == False)  # noqa: E712
        if conversation_id:
            msg_conditions.append(ChatMessage.conversation_id == conversation_id)
        if role:
            msg_conditions.append(ChatMessage.role == role)
        if from_date:
            msg_conditions.append(ChatMessage.created_at >= from_date)
        if to_date:
            msg_conditions.append(ChatMessage.created_at <= to_date)
        if clean_query:
            msg_conditions.append(ChatMessage.content.ilike(safe_query_pattern))


        msg_stmt = (
            select(ChatMessage, Conversation.title)
            .join(Conversation, ChatMessage.conversation_id == Conversation.id)
            .where(and_(*msg_conditions))
            .order_by(ChatMessage.created_at.desc())
        )
        msg_result = await db.execute(msg_stmt)
        msg_rows = msg_result.all()
        total_msg_count = len(msg_rows)

        matched_messages: List[SearchResultItem] = []
        for msg, conv_title in msg_rows:
            matched_messages.append(
                SearchResultItem(
                    id=str(msg.id),
                    type="message",
                    conversation_id=str(msg.conversation_id),
                    title=conv_title,
                    role=msg.role,
                    snippet=create_snippet(msg.content, clean_query),
                    match_field="content",
                    created_at=msg.created_at,
                    updated_at=msg.updated_at,
                )
            )

        # Combine results, interleaving conversations first then messages sorted by timestamp
        combined_results = matched_conversations + matched_messages
        combined_results.sort(key=lambda item: item.created_at, reverse=True)

        # Paginate
        total_results = len(combined_results)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = combined_results[start_idx:end_idx]

        return SearchResponse(
            query=clean_query,
            total_conversations=total_conv_count,
            total_messages=total_msg_count,
            total_results=total_results,
            page=page,
            page_size=page_size,
            items=paginated_items,
        )
