"""Vector retrieval engine computing similarity scores across user document chunks."""

import json
import math
import uuid
from dataclasses import dataclass
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.document import Document, DocumentChunk
from app.services.documents.embeddings import get_embedding_provider


@dataclass
class SearchResultChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    content: str
    page_number: int
    similarity_score: float


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity score between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    score = dot_product / (norm_a * norm_b)
    return max(0.0, min(1.0, score))


async def search_user_documents(
    db: AsyncSession,
    user_id: uuid.UUID,
    query_text: str,
    top_k: int = 4,
    document_id: Optional[uuid.UUID] = None,
) -> List[SearchResultChunk]:
    """Perform semantic vector search over user's indexed documents with strict user ownership isolation.
    
    Args:
        db: AsyncSession database handle.
        user_id: Authenticated user ID.
        query_text: Natural language search query.
        top_k: Number of top results to return.
        document_id: Optional filter for a specific document.
        
    Returns:
        List of SearchResultChunk items ranked by similarity score.
    """
    # 1. Generate Query Vector Embedding
    embedder = get_embedding_provider()
    query_vector = await embedder.embed_text(query_text)

    # 2. Query user's documents and associated chunks
    stmt = (
        select(DocumentChunk)
        .join(Document, DocumentChunk.document_id == Document.id)
        .options(selectinload(DocumentChunk.document))
        .where(
            Document.user_id == user_id,
            Document.status == "indexed",
        )
    )

    if document_id:
        stmt = stmt.where(Document.id == document_id)

    res = await db.execute(stmt)
    chunks = list(res.scalars().all())

    if not chunks:
        return []

    # 3. Calculate similarity scores
    scored_results: List[SearchResultChunk] = []

    for chunk in chunks:
        try:
            chunk_vec = json.loads(chunk.embedding_json)
            score = cosine_similarity(query_vector, chunk_vec)
            scored_results.append(
                SearchResultChunk(
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    filename=chunk.document.filename if chunk.document else "Document",
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    page_number=chunk.page_number,
                    similarity_score=round(score, 4),
                )
            )
        except Exception:
            continue

    # 4. Sort by score descending and return top_k
    scored_results.sort(key=lambda r: r.similarity_score, reverse=True)
    return scored_results[:top_k]
