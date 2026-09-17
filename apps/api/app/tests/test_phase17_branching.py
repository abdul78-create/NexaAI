"""Comprehensive unit and API test suite for Phase 17 Message Editing, Assistant Regeneration, and Branch Tree Selection."""

import asyncio
import pytest
from httpx import AsyncClient

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


async def _stream_chat(client: AsyncClient, headers: dict, content: str, model: str = "nexa-standard"):
    """Helper to stream completion using client.stream context manager."""
    async with client.stream(
        "POST",
        "/api/v1/chat/stream",
        headers=headers,
        json={"content": content, "model": model},
    ) as response:
        assert response.status_code == 200
        await response.aread()
    await asyncio.sleep(0.1)


async def test_user_message_editing_and_branch_creation(client: AsyncClient):
    """Test editing a user message prompt to create a sibling branch."""
    token = await _get_user_token(client, "edit_user@example.com", "Edit User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create initial conversation with 1 message pair via SSE stream
    await _stream_chat(client, headers, "What is Python?")

    # Retrieve conversation detail
    convs_res = await client.get("/api/v1/chat/conversations", headers=headers)
    convs = convs_res.json()
    assert len(convs) == 1
    conv_id = convs[0]["id"]

    detail_res = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert detail_res.status_code == 200
    conv_detail = detail_res.json()
    messages = conv_detail["messages"]
    assert len(messages) == 2
    user_msg_id = messages[0]["id"]
    asst_msg_id = messages[1]["id"]
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "What is Python?"
    assert messages[0]["sibling_index"] == 1
    assert messages[0]["sibling_count"] == 1

    # 2. Edit user message prompt
    edit_res = await client.post(
        f"/api/v1/chat/messages/{user_msg_id}/edit",
        headers=headers,
        json={"content": "What is Python programming language?"},
    )
    assert edit_res.status_code == 200
    branch_data = edit_res.json()
    active_msgs = branch_data["messages"]
    assert len(active_msgs) == 2
    assert active_msgs[0]["content"] == "What is Python programming language?"
    assert active_msgs[0]["sibling_index"] == 2
    assert active_msgs[0]["sibling_count"] == 2

    # 3. Switch back to original branch
    select_res = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/select-branch",
        headers=headers,
        json={"message_id": asst_msg_id},
    )
    assert select_res.status_code == 200
    orig_branch = select_res.json()
    assert orig_branch["messages"][0]["content"] == "What is Python?"
    assert orig_branch["messages"][0]["sibling_index"] == 1
    assert orig_branch["messages"][0]["sibling_count"] == 2


async def test_assistant_regeneration(client: AsyncClient):
    """Test regenerating an assistant response to produce alternative siblings."""
    token = await _get_user_token(client, "regen_user@example.com", "Regen User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create initial conversation
    await _stream_chat(client, headers, "Explain quantum computing")

    convs = (await client.get("/api/v1/chat/conversations", headers=headers)).json()
    conv_id = convs[0]["id"]
    conv_detail = (await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)).json()
    assert len(conv_detail["messages"]) == 2
    asst_msg_id = conv_detail["messages"][1]["id"]
    assert conv_detail["messages"][1]["role"] == "assistant"

    # 2. Regenerate assistant response
    regen_res = await client.post(
        f"/api/v1/chat/messages/{asst_msg_id}/regenerate",
        headers=headers,
    )
    assert regen_res.status_code == 200
    regen_branch = regen_res.json()
    active_msgs = regen_branch["messages"]
    assert len(active_msgs) == 2
    assert active_msgs[1]["role"] == "assistant"
    assert active_msgs[1]["sibling_index"] == 2
    assert active_msgs[1]["sibling_count"] == 2


async def test_branching_cross_user_isolation(client: AsyncClient):
    """Test strict cross-user security isolation on branching endpoints."""
    token_a = await _get_user_token(client, "iso_a@example.com", "User A")
    token_b = await _get_user_token(client, "iso_b@example.com", "User B")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a conversation
    await _stream_chat(client, headers_a, "User A secret topic")

    convs_a = (await client.get("/api/v1/chat/conversations", headers=headers_a)).json()
    conv_a_id = convs_a[0]["id"]
    detail_a = (await client.get(f"/api/v1/chat/conversations/{conv_a_id}", headers=headers_a)).json()
    msg_a_id = detail_a["messages"][0]["id"]

    # User B attempts to edit User A's message -> 400 Bad Request
    edit_err = await client.post(
        f"/api/v1/chat/messages/{msg_a_id}/edit",
        headers=headers_b,
        json={"content": "Hacked content"},
    )
    assert edit_err.status_code == 400

    # User B attempts to select branch on User A's conversation -> 404 Not Found
    select_err = await client.post(
        f"/api/v1/chat/conversations/{conv_a_id}/select-branch",
        headers=headers_b,
        json={"message_id": msg_a_id},
    )
    assert select_err.status_code == 404
