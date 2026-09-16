"""Automated test suite for authentication endpoints, token rotation, and security."""

import pytest
from httpx import AsyncClient

from app.core.config import settings

pytestmark = pytest.mark.asyncio


async def test_register_user_success(client: AsyncClient):
    """Test standard user registration returning 201 Created."""
    payload = {
        "email": "abdul@example.com",
        "password": "SecurePassword123!",
        "display_name": "Abdul Developer",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["email"] == "abdul@example.com"
    assert data["display_name"] == "Abdul Developer"
    assert "id" in data
    assert data["is_active"] is True


async def test_register_duplicate_email_fails(client: AsyncClient):
    """Test duplicate registration returns 400 Bad Request."""
    payload = {
        "email": "duplicate@example.com",
        "password": "SecurePassword123!",
        "display_name": "Original User",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["error"]["message"]


async def test_register_weak_password_validation(client: AsyncClient):
    """Test validation reject on weak passwords."""
    # Too short
    res_short = await client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "Ab1", "display_name": "User"},
    )
    assert res_short.status_code == 422

    # No uppercase
    res_no_upper = await client.post(
        "/api/v1/auth/register",
        json={"email": "upper@example.com", "password": "password123!", "display_name": "User"},
    )
    assert res_no_upper.status_code == 422

    # No number
    res_no_num = await client.post(
        "/api/v1/auth/register",
        json={"email": "num@example.com", "password": "SecurePassword!", "display_name": "User"},
    )
    assert res_no_num.status_code == 422


async def test_login_success_and_cookie(client: AsyncClient):
    """Test login issuing access token and HttpOnly refresh token cookie."""
    # First register
    reg_payload = {
        "email": "login_user@example.com",
        "password": "ValidPassword999!",
        "display_name": "Login Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Now login
    login_payload = {
        "email": "login_user@example.com",
        "password": "ValidPassword999!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert data["user"]["email"] == "login_user@example.com"

    # Verify refresh token cookie is set
    assert settings.REFRESH_COOKIE_NAME in response.cookies
    assert response.cookies[settings.REFRESH_COOKIE_NAME] != ""


async def test_login_invalid_credentials(client: AsyncClient):
    """Test login failure on wrong password and non-existent email."""
    # Wrong password
    reg_payload = {
        "email": "auth_fail@example.com",
        "password": "ValidPassword999!",
        "display_name": "Fail Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    bad_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "auth_fail@example.com", "password": "WrongPassword999!"},
    )
    assert bad_res.status_code == 401

    # Unregistered email
    unknown_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "ValidPassword999!"},
    )
    assert unknown_res.status_code == 401


async def test_protected_me_endpoint(client: AsyncClient):
    """Test /api/v1/auth/me requiring valid Bearer access token."""
    reg_payload = {
        "email": "profile_user@example.com",
        "password": "ValidPassword999!",
        "display_name": "Profile Person",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "profile_user@example.com", "password": "ValidPassword999!"},
    )
    token = login_res.json()["access_token"]

    # 1. Access with valid token
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "profile_user@example.com"
    assert me_data["display_name"] == "Profile Person"
    assert "usage" in me_data

    # 2. Access without token should fail
    unauth_res = await client.get("/api/v1/auth/me")
    assert unauth_res.status_code in [401, 403]

    # 3. Access with bogus token should fail with 401
    bogus_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token_xyz"},
    )
    assert bogus_res.status_code == 401


async def test_refresh_token_rotation(client: AsyncClient):
    """Test token refresh rotation using HttpOnly cookie."""
    reg_payload = {
        "email": "refresh_user@example.com",
        "password": "ValidPassword999!",
        "display_name": "Refresher",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "refresh_user@example.com", "password": "ValidPassword999!"},
    )
    initial_cookie = login_res.cookies[settings.REFRESH_COOKIE_NAME]

    # Call /refresh with cookie
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={settings.REFRESH_COOKIE_NAME: initial_cookie},
    )
    assert refresh_res.status_code == 200
    refresh_data = refresh_res.json()
    assert "access_token" in refresh_data

    # Verify a new rotated refresh token was issued
    new_cookie = refresh_res.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert new_cookie is not None
    assert new_cookie != initial_cookie

    # Attempting to reuse the old consumed refresh token MUST fail (rotation security)
    stale_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={settings.REFRESH_COOKIE_NAME: initial_cookie},
    )
    assert stale_res.status_code == 401


async def test_logout_and_revocation(client: AsyncClient):
    """Test logout clears cookie and revokes token in database."""
    reg_payload = {
        "email": "logout_user@example.com",
        "password": "ValidPassword999!",
        "display_name": "Logout Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "logout_user@example.com", "password": "ValidPassword999!"},
    )
    refresh_cookie = login_res.cookies[settings.REFRESH_COOKIE_NAME]

    # Call logout
    logout_res = await client.post(
        "/api/v1/auth/logout",
        cookies={settings.REFRESH_COOKIE_NAME: refresh_cookie},
    )
    assert logout_res.status_code == 204

    # Now trying to refresh with that cookie must fail with 401
    retry_refresh = await client.post(
        "/api/v1/auth/refresh",
        cookies={settings.REFRESH_COOKIE_NAME: refresh_cookie},
    )
    assert retry_refresh.status_code == 401
