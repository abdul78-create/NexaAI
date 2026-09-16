"""Unit and API integration tests for Phase 15 Usage Analytics & Settings."""

import uuid
import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, suffix: str = "") -> dict:
    """Create a unique user and return Bearer auth headers."""
    email = f"u_sett_{suffix or uuid.uuid4().hex[:8]}@example.com"
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "display_name": "Usage Settings User",
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
async def test_usage_summary_and_timeseries(client: AsyncClient):
    """Verify `/api/v1/usage/summary` and `/api/v1/usage/timeseries` endpoints."""
    headers = await _register_and_login(client, "usage1")

    # 1. Get summary
    sum_res = await client.get("/api/v1/usage/summary", headers=headers)
    assert sum_res.status_code == 200, sum_res.text
    sum_data = sum_res.json()
    assert "total_requests" in sum_data
    assert "total_tokens" in sum_data

    # 2. Get timeseries
    ts_res = await client.get("/api/v1/usage/timeseries?days=7", headers=headers)
    assert ts_res.status_code == 200, ts_res.text
    ts_data = ts_res.json()
    assert len(ts_data) == 7

    # 3. Get quotas
    q_res = await client.get("/api/v1/usage/quotas", headers=headers)
    assert q_res.status_code == 200, q_res.text
    q_data = q_res.json()
    assert "quotas" in q_data
    assert "requests" in q_data["quotas"]

    # 4. Export usage data
    exp_res = await client.get("/api/v1/usage/export?format=csv", headers=headers)
    assert exp_res.status_code == 200
    assert "id,feature_type" in exp_res.text


@pytest.mark.asyncio
async def test_user_preferences_crud(client: AsyncClient):
    """Verify `/api/v1/settings/preferences` GET and PATCH operations."""
    headers = await _register_and_login(client, "prefs1")

    # 1. Get defaults
    get_res = await client.get("/api/v1/settings/preferences", headers=headers)
    assert get_res.status_code == 200, get_res.text
    prefs_data = get_res.json()
    assert prefs_data["theme"] == "dark"
    assert prefs_data["default_model"] == "nexa-standard"

    # 2. Patch preferences
    patch_res = await client.patch(
        "/api/v1/settings/preferences",
        headers=headers,
        json={
            "theme": "light",
            "default_model": "gpt-4o",
            "auto_ocr_enabled": False,
        },
    )
    assert patch_res.status_code == 200, patch_res.text
    updated = patch_res.json()
    assert updated["theme"] == "light"
    assert updated["default_model"] == "gpt-4o"
    assert updated["auto_ocr_enabled"] is False

    # 3. Verify persistence
    get_res_2 = await client.get("/api/v1/settings/preferences", headers=headers)
    assert get_res_2.json()["theme"] == "light"
