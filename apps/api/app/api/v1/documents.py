"""Document Intelligence and RAG endpoints router."""

import json
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user
from app.db.models.document import Document, DocumentChunk
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.documents import (
    DocumentChunkResponse,
    DocumentDetailResponse,
    DocumentResponse,
    DocumentSearchRequest,
    RAGCitationResponse,
    RAGQueryRequest,
    RAGQueryResponse,
    SearchResultChunkResponse,
)
from app.services.documents.chunking import chunk_document_text
from app.services.documents.embeddings import get_embedding_provider
from app.services.documents.extraction import extract_text_from_file
from app.services.documents.rag import answer_question_with_rag
from app.services.documents.retrieval import search_user_documents

router = APIRouter(prefix="/documents", tags=["Document Intelligence & RAG"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and index a document for RAG search",
)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Upload PDF, DOCX, TXT, or MD document, extract text, chunk, embed, and store."""
    filename = file.filename or "uploaded_file.txt"
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Allowed formats: PDF, DOCX, TXT, MD.",
        )

    content_bytes = await file.read()
    file_size = len(content_bytes)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed limit of 10MB.",
        )

    # 1. Create Document Record
    doc = Document(
        user_id=current_user.id,
        filename=filename,
        file_type=ext.upper(),
        file_size=file_size,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        # 2. Extract Text & Pages
        full_text, pages = extract_text_from_file(filename, content_bytes)

        # 3. Chunk Text
        text_chunks = chunk_document_text(pages)

        # 4. Generate Embeddings
        embedder = get_embedding_provider()
        chunk_texts = [c.content for c in text_chunks]
        embeddings = await embedder.embed_batch(chunk_texts)

        # 5. Persist Chunks into Database
        for i, (chunk, vec) in enumerate(zip(text_chunks, embeddings)):
            db_chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                page_number=chunk.page_number,
                embedding_json=json.dumps(vec),
            )
            db.add(db_chunk)

        doc.chunk_count = len(text_chunks)
        doc.status = "indexed"
        await db.commit()
        await db.refresh(doc)

    except Exception as e:
        doc.status = "failed"
        doc.error_message = str(e)
        await db.commit()
        await db.refresh(doc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document indexing failed: {str(e)}",
        )

    return DocumentResponse.model_validate(doc)


@router.get(
    "",
    response_model=List[DocumentResponse],
    summary="List all documents uploaded by current authenticated user",
)
async def list_documents(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[DocumentResponse]:
    """Retrieve all document records for caller with strict user ownership filtering."""
    stmt = (
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    res = await db.execute(stmt)
    docs = list(res.scalars().all())
    return [DocumentResponse.model_validate(d) for d in docs]


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get document details and chunk list by ID",
)
async def get_document_detail(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentDetailResponse:
    """Get document detail with strict ownership check."""
    stmt = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    return DocumentDetailResponse(
        id=doc.id,
        user_id=doc.user_id,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        status=doc.status,
        error_message=doc.error_message,
        chunk_count=doc.chunk_count,
        created_at=doc.created_at,
        chunks=[DocumentChunkResponse.model_validate(c) for c in doc.chunks],
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete document and associated vector chunks",
)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete document owned by current user."""
    stmt = select(Document).where(
        Document.id == document_id,
        Document.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    await db.delete(doc)
    await db.commit()
    return None


@router.post(
    "/search",
    response_model=List[SearchResultChunkResponse],
    summary="Perform semantic vector search over document library",
)
async def search_documents(
    payload: DocumentSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[SearchResultChunkResponse]:
    """Execute vector cosine similarity search over user's document chunks."""
    results = await search_user_documents(
        db=db,
        user_id=current_user.id,
        query_text=payload.query,
        top_k=payload.top_k or 4,
        document_id=payload.document_id,
    )
    return [
        SearchResultChunkResponse(
            chunk_id=r.chunk_id,
            document_id=r.document_id,
            filename=r.filename,
            chunk_index=r.chunk_index,
            content=r.content,
            page_number=r.page_number,
            similarity_score=r.similarity_score,
        )
        for r in results
    ]


@router.post(
    "/query",
    response_model=RAGQueryResponse,
    summary="Execute grounded RAG Question Answering with source citations",
)
async def query_rag(
    payload: RAGQueryRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> RAGQueryResponse:
    """Execute grounded RAG Q&A returning AI answer + source citations."""
    rag_res = await answer_question_with_rag(
        db=db,
        user_id=current_user.id,
        question=payload.question,
        top_k=payload.top_k or 4,
        document_id=payload.document_id,
        model_id=payload.model or "nexa-standard",
    )

    return RAGQueryResponse(
        query=rag_res.query,
        answer=rag_res.answer,
        citations=[
            RAGCitationResponse(
                citation_id=c.citation_id,
                document_id=c.document_id,
                filename=c.filename,
                page_number=c.page_number,
                excerpt=c.excerpt,
                relevance_score=c.relevance_score,
            )
            for c in rag_res.citations
        ],
        retrieved_chunks_count=rag_res.retrieved_chunks_count,
    )
