"""Tests for OAuth endpoints, Chat Modes, Prompt Library, and High-mode quotas."""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.oauth_account import OAuthAccount
from app.db.models.prompt import Prompt
from app.services.auth_service import AuthService
from app.services.ai.mode_router import ChatMode, normalize_chat_mode, resolve_model_for_mode


@pytest.mark.asyncio
async def test_mode_router_resolution():
    """Verify chat mode normalization and model resolution."""
    assert normalize_chat_mode("quick") == ChatMode.LOW
    assert normalize_chat_mode("low") == ChatMode.LOW
    assert normalize_chat_mode("high") == ChatMode.HIGH
    assert normalize_chat_mode("standard") == ChatMode.STANDARD
    assert normalize_chat_mode(None) == ChatMode.STANDARD
    assert normalize_chat_mode("invalid") == ChatMode.STANDARD

    assert resolve_model_for_mode(ChatMode.LOW) == "gemini-2.5-flash"
    assert resolve_model_for_mode(ChatMode.STANDARD) == "gemini-2.5-flash"
    assert resolve_model_for_mode(ChatMode.HIGH) == "gemini-2.5-pro"


@pytest.mark.asyncio
async def test_oauth_providers_endpoint(client: AsyncClient):
    """Test listing available OAuth providers."""
    resp = await client.get("/api/v1/auth/oauth/providers")
    assert resp.status_code == 200
    data = resp.json()
    assert "providers" in data
    assert isinstance(data["providers"], list)


@pytest.mark.asyncio
async def test_oauth_user_creation_and_linking(async_db: AsyncSession):
    """Test creating user via OAuth without password, and linking provider."""
    user = await AuthService.create_or_link_oauth_user(
        db=async_db,
        provider="github",
        provider_account_id="12345678",
        email="developer@example.com",
        display_name="Dev Tester",
    )
    assert user.id is not None
    assert user.email == "developer@example.com"
    assert user.hashed_password is None
    assert user.display_name == "Dev Tester"

    # Subsequent login with same OAuth ID returns existing user
    user2 = await AuthService.create_or_link_oauth_user(
        db=async_db,
        provider="github",
        provider_account_id="12345678",
        email="developer@example.com",
    )
    assert user2.id == user.id


@pytest.mark.asyncio
async def test_prompts_crud(client: AsyncClient, async_db: AsyncSession):
    """Test listing system prompts, creating custom prompt, and updating/deleting."""
    # Register test user
    user_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "promptuser@example.com",
            "password": "Password123!",
            "display_name": "Prompt Tester",
        },
    )
    assert user_resp.status_code == 201

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "promptuser@example.com", "password": "Password123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. List prompts (should include seeded system prompts)
    list_resp = await client.get("/api/v1/prompts", headers=auth_headers)
    assert list_resp.status_code == 200
    prompts_data = list_resp.json()
    assert prompts_data["total"] > 0
    assert len(prompts_data["items"]) > 0
    assert "coding" in prompts_data["categories"]

    # 2. Create custom prompt
    create_resp = await client.post(
        "/api/v1/prompts",
        headers=auth_headers,
        json={
            "title": "My Custom Refactor",
            "description": "Refactor python code into functional style",
            "content": "Rewrite this code functionally:\n{{code}}",
            "category": "coding",
            "is_public": False,
        },
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    prompt_id = created["id"]
    assert created["title"] == "My Custom Refactor"

    # 3. Update custom prompt
    update_resp = await client.patch(
        f"/api/v1/prompts/{prompt_id}",
        headers=auth_headers,
        json={"title": "Updated Refactor Prompt"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated Refactor Prompt"

    # 4. Use prompt
    use_resp = await client.post(f"/api/v1/prompts/{prompt_id}/use", headers=auth_headers)
    assert use_resp.status_code == 200

    # 5. Delete custom prompt
    del_resp = await client.delete(f"/api/v1/prompts/{prompt_id}", headers=auth_headers)
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_high_mode_quota_endpoint(client: AsyncClient):
    """Test GET /usage/high-mode-status."""
    # Register & login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "quotatest@example.com",
            "password": "Password123!",
            "display_name": "Quota Tester",
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "quotatest@example.com", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/usage/high-mode-status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "high"
    assert data["limit"] == 5
    assert data["used"] == 0
    assert data["remaining"] == 5
