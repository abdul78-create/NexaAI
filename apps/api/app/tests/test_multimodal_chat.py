"""Unit and API integration tests for Phase 14 Multimodal Chat Composer."""

import io
import uuid
import pytest
from httpx import AsyncClient

from app.services.ai.capabilities import get_model_capabilities


async def _register_and_login(client: AsyncClient, suffix: str = "") -> dict:
    """Create a unique user and return Bearer auth headers."""
    email = f"multi_{suffix or uuid.uuid4().hex[:8]}@example.com"
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "display_name": "Multimodal User",
        },
    )
    assert reg.status_code == 201, reg.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_model_capabilities_registry():
    """Verify ModelCapabilities registry returns expected capability objects."""
    cap_std = get_model_capabilities("nexa-standard")
    assert cap_std.text is True
    assert cap_std.vision is True

    cap_gpt = get_model_capabilities("gpt-4o")
    assert cap_gpt.max_context_tokens == 128000


@pytest.mark.asyncio
async def test_multimodal_chat_stream_with_image_attachment(client: AsyncClient):
    """Integration test: Upload image attachment and send multimodal chat stream request."""
    headers = await _register_and_login(client, "multichat1")

    # 1. Generate sample image
    from PIL import Image
    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    # 2. Upload image attachment
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=headers,
        files={"file": ("sample_multimodal.jpg", img_bytes, "image/jpeg")},
    )
    assert upload_res.status_code == 201, upload_res.text
    att_id = upload_res.json()["id"]

    # 3. Stream multimodal chat completion
    stream_res = await client.post(
        "/api/v1/chat/stream",
        headers=headers,
        json={
            "content": "What is in this attached image?",
            "model": "nexa-standard",
            "attachments": [{"attachment_id": att_id, "kind": "image"}],
        },
    )
    assert stream_res.status_code == 200, stream_res.text
    response_body = stream_res.text
    assert "event: message_start" in response_body
    assert "event: message_end" in response_body or "event: token" in response_body


@pytest.mark.asyncio
async def test_multimodal_chat_cross_user_attachment_denied(client: AsyncClient):
    """Verify user B cannot send user A's attachment in a chat stream request."""
    headers_a = await _register_and_login(client, "usera_att")
    headers_b = await _register_and_login(client, "userb_att")

    # User A uploads attachment
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=headers_a,
        files={"file": ("usera_doc.txt", b"Private data", "text/plain")},
    )
    att_id_a = upload_res.json()["id"]

    # User B attempts to attach User A's file
    stream_res = await client.post(
        "/api/v1/chat/stream",
        headers=headers_b,
        json={
            "content": "Explain this file",
            "attachments": [{"attachment_id": att_id_a, "kind": "document"}],
        },
    )
    assert stream_res.status_code == 200
    assert "attachment_not_found" in stream_res.text or "error" in stream_res.text
