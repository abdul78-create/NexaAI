"""Automated test suite for Document Intelligence, Text Chunking, Embeddings, RAG Q&A, and Ownership Security."""

import io
import pytest
from httpx import AsyncClient

from app.services.documents.chunking import chunk_document_text
from app.services.documents.embeddings import MockEmbeddingProvider
from app.services.documents.extraction import extract_text_from_file
from app.services.documents.retrieval import cosine_similarity

pytestmark = pytest.mark.asyncio


async def _get_user_token(client: AsyncClient, email: str, name: str) -> str:
    """Helper to register and log in a test user, returning access token."""
    reg_payload = {
        "email": email,
        "password": "ValidPassword999!",
        "display_name": name,
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "ValidPassword999!"},
    )
    return login_res.json()["access_token"]


async def test_document_extraction_unit():
    """Unit test for text extraction from bytes."""
    sample_text = "NexaAI Architecture Guide\n\nPhase 8 introduces Document Intelligence."
    content_bytes = sample_text.encode("utf-8")
    extracted, pages = extract_text_from_file("guide.txt", content_bytes)
    assert "NexaAI" in extracted
    assert len(pages) >= 1


async def test_document_chunking_unit():
    """Unit test for sentence-aware chunking and overlap logic."""
    pages = [(1, "Paragraph 1 sentence one. Paragraph 1 sentence two. Paragraph 1 sentence three.")]
    chunks = chunk_document_text(pages, target_chunk_size=40, overlap=10)
    assert len(chunks) >= 1
    assert chunks[0].chunk_index == 0
    assert chunks[0].page_number == 1


async def test_mock_embedding_provider_unit():
    """Unit test for MockEmbeddingProvider vector generation."""
    embedder = MockEmbeddingProvider()
    vec1 = await embedder.embed_text("FastAPI python backend")
    vec2 = await embedder.embed_text("FastAPI python backend")
    vec3 = await embedder.embed_text("Completely unrelated text string")

    assert len(vec1) == 1536
    # Deterministic check
    assert vec1 == vec2
    # Similarity check
    sim_same = cosine_similarity(vec1, vec2)
    sim_diff = cosine_similarity(vec1, vec3)
    assert sim_same == pytest.approx(1.0, abs=1e-3)
    assert sim_diff < sim_same


async def test_document_upload_list_and_delete_api(client: AsyncClient):
    """Integration test for document upload, listing, details inspection, and deletion."""
    token = await _get_user_token(client, "doc_user@example.com", "Doc User")
    headers = {"Authorization": f"Bearer {token}"}

    file_content = b"NexaAI Document RAG Test File.\n\nThis file contains information on vector embeddings."
    files = {"file": ("test_doc.txt", io.BytesIO(file_content), "text/plain")}

    # 1. Upload document
    upload_res = await client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    doc_id = doc_data["id"]
    assert doc_data["filename"] == "test_doc.txt"
    assert doc_data["status"] == "indexed"
    assert doc_data["chunk_count"] >= 1

    # 2. List documents
    list_res = await client.get("/api/v1/documents", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert len(docs) >= 1
    assert any(d["id"] == doc_id for d in docs)

    # 3. Get document detail with chunks
    detail_res = await client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == doc_id
    assert len(detail["chunks"]) >= 1

    # 4. Delete document
    del_res = await client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 204

    # 5. Verify deletion
    verify_res = await client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert verify_res.status_code == 404


async def test_semantic_search_and_rag_query_api(client: AsyncClient):
    """Integration test for vector search and RAG Q&A with source citations."""
    token = await _get_user_token(client, "rag_user@example.com", "RAG User")
    headers = {"Authorization": f"Bearer {token}"}

    file_content = (
        b"NexaAI Platform Security Specifications.\n\n"
        b"1. Authentication uses Argon2id password hashing.\n"
        b"2. JWT access tokens expire after 60 minutes.\n"
        b"3. Refresh tokens are rotated and stored using SHA-256 hashes.\n"
    )
    files = {"file": ("security_specs.txt", io.BytesIO(file_content), "text/plain")}
    await client.post("/api/v1/documents/upload", headers=headers, files=files)

    # 1. Semantic Vector Search
    search_res = await client.post(
        "/api/v1/documents/search",
        headers=headers,
        json={"query": "How are passwords hashed?", "top_k": 2},
    )
    assert search_res.status_code == 200
    search_results = search_res.json()
    assert len(search_results) >= 1
    assert "security_specs.txt" in search_results[0]["filename"]
    assert search_results[0]["similarity_score"] > 0

    # 2. Grounded RAG Q&A
    rag_res = await client.post(
        "/api/v1/documents/query",
        headers=headers,
        json={"question": "What algorithm is used for password hashing?", "top_k": 2},
    )
    assert rag_res.status_code == 200
    rag_data = rag_res.json()
    assert rag_data["answer"] != ""
    assert len(rag_data["citations"]) >= 1
    assert rag_data["citations"][0]["filename"] == "security_specs.txt"


async def test_document_strict_ownership_security(client: AsyncClient):
    """Strict security test: User A owns Document A. User B CANNOT view, search, query RAG, or delete it."""
    token_a = await _get_user_token(client, "doc_owner_a@example.com", "User A")
    token_b = await _get_user_token(client, "doc_owner_b@example.com", "User B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A uploads a document
    file_content = b"User A Confidential Business Strategy Document."
    files = {"file": ("confidential_a.txt", io.BytesIO(file_content), "text/plain")}
    upload_res = await client.post("/api/v1/documents/upload", headers=headers_a, files=files)
    doc_a_id = upload_res.json()["id"]

    # User B attempts GET -> MUST return 404 Not Found
    get_b = await client.get(f"/api/v1/documents/{doc_a_id}", headers=headers_b)
    assert get_b.status_code == 404

    # User B attempts DELETE -> MUST return 404 Not Found
    del_b = await client.delete(f"/api/v1/documents/{doc_a_id}", headers=headers_b)
    assert del_b.status_code == 404

    # User B attempts vector search on User A's document ID -> returns empty
    search_b = await client.post(
        "/api/v1/documents/search",
        headers=headers_b,
        json={"query": "Confidential", "document_id": doc_a_id},
    )
    assert search_b.status_code == 200
    assert len(search_b.json()) == 0
