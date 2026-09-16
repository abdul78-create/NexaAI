"""RAG Question Answering service with grounded context assembly and source citations."""

import uuid
from dataclasses import dataclass
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.base import ChatMessagePayload
from app.services.ai.factory import get_ai_provider
from app.services.documents.retrieval import SearchResultChunk, search_user_documents


@dataclass
class RAGCitation:
    citation_id: int
    document_id: uuid.UUID
    filename: str
    page_number: int
    excerpt: str
    relevance_score: float


@dataclass
class RAGAnswerResult:
    query: str
    answer: str
    citations: List[RAGCitation]
    retrieved_chunks_count: int


async def answer_question_with_rag(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
    top_k: int = 4,
    document_id: Optional[uuid.UUID] = None,
    model_id: str = "nexa-standard",
) -> RAGAnswerResult:
    """Execute RAG Q&A workflow: search relevant document chunks, build grounded prompt, generate answer & citations."""
    # 1. Retrieve top matching chunks
    chunks: List[SearchResultChunk] = await search_user_documents(
        db=db,
        user_id=user_id,
        query_text=question,
        top_k=top_k,
        document_id=document_id,
    )

    if not chunks:
        return RAGAnswerResult(
            query=question,
            answer="No relevant documents found in your library to answer this question. Please upload a document first.",
            citations=[],
            retrieved_chunks_count=0,
        )

    # 2. Build Citations List and Grounded Context
    citations: List[RAGCitation] = []
    context_blocks: List[str] = []

    for idx, chunk in enumerate(chunks, start=1):
        citations.append(
            RAGCitation(
                citation_id=idx,
                document_id=chunk.document_id,
                filename=chunk.filename,
                page_number=chunk.page_number,
                excerpt=chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                relevance_score=chunk.similarity_score,
            )
        )
        context_blocks.append(
            f"[Source {idx} - File: {chunk.filename}, Page: {chunk.page_number}]\n{chunk.content}"
        )

    grounded_context = "\n\n---\n\n".join(context_blocks)

    # 3. Formulate RAG Prompt for AI Provider
    system_prompt = (
        "You are NexaAI Document Assistant. Answer the user question based ONLY on the provided document sources. "
        "If the answer is not contained within the provided sources, state clearly that the information is not present in the documents. "
        "Include source citation tags (e.g. [Source 1], [Source 2]) where applicable."
    )

    messages = [
        ChatMessagePayload(role="system", content=system_prompt),
        ChatMessagePayload(
            role="user",
            content=f"RETRIEVED DOCUMENT SOURCES:\n\n{grounded_context}\n\nUSER QUESTION:\n{question}",
        ),
    ]

    # 4. Generate AI Provider Completion
    provider = get_ai_provider()
    completion = await provider.generate(messages=messages, model=model_id)

    return RAGAnswerResult(
        query=question,
        answer=completion.text,
        citations=citations,
        retrieved_chunks_count=len(chunks),
    )
