"""Automated test suite for AI Providers, Chat SSE Streaming, and Ownership Isolation."""

import pytest
from httpx import AsyncClient

from app.services.ai.base import ChatMessagePayload
from app.services.ai.factory import get_ai_provider
from app.services.ai.mock_provider import MockAIProvider

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


async def test_mock_ai_provider_unit():
    """Unit test for MockAIProvider generate and stream implementations."""
    provider = MockAIProvider()

    # 1. Non-streaming generate
    messages = [ChatMessagePayload(role="user", content="Explain Python FastAPI")]
    gen_result = await provider.generate(messages, model="nexa-standard")
    assert "FastAPI" in gen_result.text or "NexaAI" in gen_result.text
    assert gen_result.input_tokens > 0
    assert gen_result.output_tokens > 0

    # 2. SSE streaming stream
    events = []
    async for event in provider.stream(messages, model="nexa-standard"):
        events.append(event)

    event_names = [e.event for e in events]
    assert "message_start" in event_names
    assert "token" in event_names
    assert "usage" in event_names
    assert "message_end" in event_names


async def test_ai_provider_factory():
    """Test AI Provider factory instantiates MockAIProvider by default when key is empty."""
    provider = get_ai_provider()
    assert isinstance(provider, MockAIProvider)


async def test_models_endpoint(client: AsyncClient):
    """Test GET /api/v1/chat/models returns available models list."""
    res = await client.get("/api/v1/chat/models")
    assert res.status_code == 200
    models = res.json()
    assert len(models) >= 3
    model_ids = [m["id"] for m in models]
    assert "nexa-ultra" in model_ids
    assert "nexa-standard" in model_ids


async def test_create_list_and_delete_conversation(client: AsyncClient):
    """Test conversation lifecycle for an authenticated user."""
    token = await _get_user_token(client, "user_conv@example.com", "Conv User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create conversation
    create_res = await client.post(
        "/api/v1/chat/conversations",
        headers=headers,
        json={"title": "My First Project", "model": "nexa-coder"},
    )
    assert create_res.status_code == 201
    conv_data = create_res.json()
    conv_id = conv_data["id"]
    assert conv_data["title"] == "My First Project"
    assert conv_data["model"] == "nexa-coder"

    # 2. List conversations
    list_res = await client.get("/api/v1/chat/conversations", headers=headers)
    assert list_res.status_code == 200
    convs = list_res.json()
    assert len(convs) >= 1
    assert any(c["id"] == conv_id for c in convs)

    # 3. Get conversation detail
    detail_res = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == conv_id

    # 4. Update title
    patch_res = await client.patch(
        f"/api/v1/chat/conversations/{conv_id}",
        headers=headers,
        json={"title": "Renamed Project"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Renamed Project"

    # 5. Delete conversation
    del_res = await client.delete(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Verify deletion
    verify_res = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert verify_res.status_code == 404


async def test_strict_ownership_isolation(client: AsyncClient):
    """Strict security test: User A owns Conversation A. User B CANNOT access, update, or delete it."""
    token_a = await _get_user_token(client, "user_a@example.com", "User A")
    token_b = await _get_user_token(client, "user_b@example.com", "User B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a conversation
    create_res = await client.post(
        "/api/v1/chat/conversations",
        headers=headers_a,
        json={"title": "User A Private Data", "model": "nexa-ultra"},
    )
    conv_a_id = create_res.json()["id"]

    # User B attempts GET -> MUST return 404 Not Found
    get_b = await client.get(f"/api/v1/chat/conversations/{conv_a_id}", headers=headers_b)
    assert get_b.status_code == 404

    # User B attempts PATCH -> MUST return 404 Not Found
    patch_b = await client.patch(
        f"/api/v1/chat/conversations/{conv_a_id}",
        headers=headers_b,
        json={"title": "Hacked Title"},
    )
    assert patch_b.status_code == 404

    # User B attempts DELETE -> MUST return 404 Not Found
    del_b = await client.delete(f"/api/v1/chat/conversations/{conv_a_id}", headers=headers_b)
    assert del_b.status_code == 404

    # User B attempts STREAM completion into User A's conversation -> MUST return SSE error (NOT_FOUND)
    stream_b = await client.post(
        "/api/v1/chat/stream",
        headers=headers_b,
        json={"conversation_id": conv_a_id, "content": "Unauthorized message"},
    )
    assert stream_b.status_code == 200
    stream_content = stream_b.text
    assert "error" in stream_content
    assert "NOT_FOUND" in stream_content or "access denied" in stream_content


async def test_stream_chat_sse_endpoint(client: AsyncClient):
    """Test full SSE streaming endpoint and message persistence."""
    token = await _get_user_token(client, "stream_user@example.com", "Stream User")
    headers = {"Authorization": f"Bearer {token}"}

    stream_res = await client.post(
        "/api/v1/chat/stream",
        headers=headers,
        json={"content": "Explain async Python programming", "model": "nexa-standard"},
    )
    assert stream_res.status_code == 200
    assert "text/event-stream" in stream_res.headers.get("content-type", "")

    body_text = stream_res.text
    assert "event: message_start" in body_text
    assert "event: token" in body_text
    assert "event: usage" in body_text
    assert "event: message_end" in body_text

    # Extract conversation ID from list endpoint
    list_res = await client.get("/api/v1/chat/conversations", headers=headers)
    convs = list_res.json()
    assert len(convs) >= 1
    created_conv_id = convs[0]["id"]

    # Retrieve detail to verify user and assistant messages were saved
    detail_res = await client.get(f"/api/v1/chat/conversations/{created_conv_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["messages"]) == 2
    assert detail["messages"][0]["role"] == "user"
    assert detail["messages"][1]["role"] == "assistant"
