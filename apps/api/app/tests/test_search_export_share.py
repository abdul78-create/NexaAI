"""Comprehensive backend unit and API test suite for Phase 16 (Search, Export, Sharing)."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

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


async def test_search_conversations_and_messages(client: AsyncClient):
    """Test global search across user conversation titles and message content."""
    token = await _get_user_token(client, "search_user@example.com", "Search User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a conversation via SSE stream to generate messages
    stream_res = await client.post(
        "/api/v1/chat/stream",
        headers=headers,
        json={"content": "What is quantum entanglement and superposition?", "model": "nexa-pro"},
    )
    assert stream_res.status_code == 200

    # Retrieve conversation detail
    list_res = await client.get("/api/v1/chat/conversations", headers=headers)
    convs = list_res.json()
    assert len(convs) >= 1
    conv_id = convs[0]["id"]

    # Update conversation title
    await client.patch(
        f"/api/v1/chat/conversations/{conv_id}",
        headers=headers,
        json={"title": "Quantum Computing Research Overview"},
    )

    # 2. Search title match
    resp = await client.get("/api/v1/search?q=Quantum", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "Quantum"
    assert data["total_results"] >= 1
    assert any(item["title"] == "Quantum Computing Research Overview" for item in data["items"])

    # 3. Search message content match
    resp = await client.get("/api/v1/search?q=entanglement", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_messages"] >= 1
    assert any("entanglement" in item["snippet"].lower() for item in data["items"])

    # 4. Search with role filter
    resp = await client.get("/api/v1/search?q=entanglement&role=user", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert all(item["role"] == "user" for item in data["items"] if item["type"] == "message")


async def test_search_user_isolation(client: AsyncClient):
    """Verify search queries strictly isolate records by authenticated user."""
    token_1 = await _get_user_token(client, "iso1_user@example.com", "Iso User 1")
    token_2 = await _get_user_token(client, "iso2_user@example.com", "Iso User 2")

    headers_1 = {"Authorization": f"Bearer {token_1}"}
    headers_2 = {"Authorization": f"Bearer {token_2}"}

    # User 2 creates a conversation
    create_res = await client.post(
        "/api/v1/chat/conversations",
        headers=headers_2,
        json={"title": "Secret Project Blueprint X99", "model": "nexa-pro"},
    )
    assert create_res.status_code == 201

    # User 1 searches for Secret Project Blueprint -> 0 results
    resp_1 = await client.get("/api/v1/search?q=Blueprint", headers=headers_1)
    assert resp_1.status_code == 200
    assert resp_1.json()["total_results"] == 0

    # User 2 searches for Secret Project Blueprint -> 1 result
    resp_2 = await client.get("/api/v1/search?q=Blueprint", headers=headers_2)
    assert resp_2.status_code == 200
    assert resp_2.json()["total_results"] == 1
    assert resp_2.json()["items"][0]["title"] == "Secret Project Blueprint X99"


async def test_export_conversation_formats(client: AsyncClient):
    """Test exporting owned conversation to Markdown, JSON, and PDF."""
    token = await _get_user_token(client, "export_user@example.com", "Export User")
    headers = {"Authorization": f"Bearer {token}"}

    # Create conversation with messages
    stream_res = await client.post(
        "/api/v1/chat/stream",
        headers=headers,
        json={"content": "Summarize the document chunk metrics.", "model": "nexa-standard"},
    )
    assert stream_res.status_code == 200

    list_res = await client.get("/api/v1/chat/conversations", headers=headers)
    conv_id = list_res.json()[0]["id"]

    await client.patch(
        f"/api/v1/chat/conversations/{conv_id}",
        headers=headers,
        json={"title": "Multimodal RAG Summary"},
    )

    # 1. Markdown export
    resp_md = await client.get(f"/api/v1/conversations/{conv_id}/export?format=markdown", headers=headers)
    assert resp_md.status_code == 200
    assert "text/markdown" in resp_md.headers["content-type"]
    assert "Multimodal RAG Summary" in resp_md.text
    assert "attachment; filename=" in resp_md.headers["content-disposition"]

    # 2. JSON export
    resp_json = await client.get(f"/api/v1/conversations/{conv_id}/export?format=json", headers=headers)
    assert resp_json.status_code == 200
    assert "application/json" in resp_json.headers["content-type"]
    json_data = resp_json.json()
    assert json_data["conversation_id"] == str(conv_id)
    assert len(json_data["messages"]) >= 2

    # 3. PDF export
    resp_pdf = await client.get(f"/api/v1/conversations/{conv_id}/export?format=pdf", headers=headers)
    assert resp_pdf.status_code == 200
    assert "application/pdf" in resp_pdf.headers["content-type"]
    assert resp_pdf.content.startswith(b"%PDF-1.4")


async def test_export_cross_user_isolation(client: AsyncClient):
    """Verify unauthorized export attempts return HTTP 404."""
    token_1 = await _get_user_token(client, "exp_u1@example.com", "Exp User 1")
    token_2 = await _get_user_token(client, "exp_u2@example.com", "Exp User 2")

    headers_1 = {"Authorization": f"Bearer {token_1}"}
    headers_2 = {"Authorization": f"Bearer {token_2}"}

    create_res = await client.post(
        "/api/v1/chat/conversations",
        headers=headers_2,
        json={"title": "Private User 2 Conversation"},
    )
    conv_id = create_res.json()["id"]

    resp = await client.get(f"/api/v1/conversations/{conv_id}/export?format=json", headers=headers_1)
    assert resp.status_code == 404


async def test_conversation_sharing_lifecycle(client: AsyncClient):
    """Test creating share link, owner status check, public viewing, and revocation."""
    token = await _get_user_token(client, "share_owner@example.com", "Share Owner")
    headers = {"Authorization": f"Bearer {token}"}

    stream_res = await client.post(
        "/api/v1/chat/stream",
        headers=headers,
        json={"content": "Guide for deploying AI infrastructure.", "model": "nexa-pro"},
    )
    assert stream_res.status_code == 200

    list_res = await client.get("/api/v1/chat/conversations", headers=headers)
    conv_id = list_res.json()[0]["id"]
    await client.patch(
        f"/api/v1/chat/conversations/{conv_id}",
        headers=headers,
        json={"title": "Public Knowledge Base Article"},
    )

    # 1. Create share link with 7-day expiration
    create_resp = await client.post(
        f"/api/v1/conversations/{conv_id}/share",
        headers=headers,
        json={"expires_in_days": 7},
    )
    assert create_resp.status_code == 200
    share_data = create_resp.json()
    assert share_data["is_enabled"] is True
    share_token = share_data["share_token"]
    assert share_token is not None

    # 2. Retrieve public shared view as unauthenticated viewer
    unauth_client = AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")
    public_resp = await unauth_client.get(f"/api/v1/shared/{share_token}")
    assert public_resp.status_code == 200
    assert public_resp.headers["x-robots-tag"] == "noindex, nofollow"
    public_data = public_resp.json()
    assert public_data["title"] == "Public Knowledge Base Article"
    assert len(public_data["messages"]) >= 2
    # Verify owner credentials are NOT returned
    assert "user_id" not in public_data
    assert "email" not in public_data

    # 3. Owner checks status
    status_resp = await client.get(f"/api/v1/conversations/{conv_id}/share", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["is_enabled"] is True

    # 4. Revoke share link
    revoke_resp = await client.delete(f"/api/v1/conversations/{conv_id}/share", headers=headers)
    assert revoke_resp.status_code == 200

    # 5. Attempt public view after revocation -> 410 Gone
    public_resp_after = await unauth_client.get(f"/api/v1/shared/{share_token}")
    assert public_resp_after.status_code == 410
