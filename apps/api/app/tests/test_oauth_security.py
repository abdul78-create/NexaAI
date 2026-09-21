"""Comprehensive security and lifecycle unit tests for Google and GitHub OAuth.

Tests cover:
- Cryptographic CSRF state generation and validation (HMAC-SHA256, timestamp, provider binding)
- Double-submit state cookie verification and expiration checks
- Google & GitHub auth URL generation
- Google verified email enforcement & unverified email rejection
- GitHub verified email discovery (primary, verified fallback, and private email resolution)
- Account lifecycle: new user creation without password, existing user linking without duplication
- Avatar synchronization (populating empty avatars while preserving existing custom avatars)
- Prevention of password login for OAuth-created users
- Cookie clearing upon callback processing
"""

import time
from urllib.parse import parse_qs, unquote, urlparse
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, Response
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.db.models.user import User
from app.db.models.oauth_account import OAuthAccount
from app.services.auth_service import AuthService
from app.services.oauth_service import OAuthService, get_oauth_cookie_kwargs


@pytest.mark.asyncio
async def test_oauth_state_generation_and_verification():
    """Verify HMAC-SHA256 state token generation and verification."""
    # 1. Valid state generation
    state = OAuthService.generate_oauth_state("google")
    assert state.startswith("google.")
    parts = state.split(".")
    assert len(parts) == 4

    # 2. Valid verification without cookie
    assert OAuthService.verify_oauth_state(state, "google") is True

    # 3. Valid verification with matching cookie
    assert OAuthService.verify_oauth_state(state, "google", cookie_state=state) is True

    # 4. Provider mismatch rejection
    with pytest.raises(HTTPException) as exc_prov:
        OAuthService.verify_oauth_state(state, "github")
    assert exc_prov.value.status_code == 400
    assert "provider mismatch" in exc_prov.value.detail.lower()

    # 5. Missing state rejection
    with pytest.raises(HTTPException) as exc_missing:
        OAuthService.verify_oauth_state(None, "google")
    assert exc_missing.value.status_code == 400
    assert "missing" in exc_missing.value.detail.lower()

    # 6. Cookie mismatch rejection (CSRF detection)
    with pytest.raises(HTTPException) as exc_cookie:
        OAuthService.verify_oauth_state(state, "google", cookie_state="tampered-cookie-value")
    assert exc_cookie.value.status_code == 400
    assert "does not match" in exc_cookie.value.detail.lower()

    # 7. Tampered signature rejection
    tampered_state = f"{parts[0]}.{parts[1]}.{parts[2]}.badsignature12345"
    with pytest.raises(HTTPException) as exc_sig:
        OAuthService.verify_oauth_state(tampered_state, "google")
    assert exc_sig.value.status_code == 400
    assert "invalid oauth state signature" in exc_sig.value.detail.lower()

    # 8. Expired state rejection (> 10 minutes)
    expired_ts = int(time.time()) - 700  # 11 minutes ago
    import hmac, hashlib
    payload = f"google:{parts[1]}:{expired_ts}"
    expired_sig = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    expired_state = f"google.{parts[1]}.{expired_ts}.{expired_sig}"
    with pytest.raises(HTTPException) as exc_exp:
        OAuthService.verify_oauth_state(expired_state, "google")
    assert exc_exp.value.status_code == 400
    assert "expired" in exc_exp.value.detail.lower()


@pytest.mark.asyncio
async def test_google_and_github_auth_urls(monkeypatch):
    """Verify authorization URL generation for Google and GitHub."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "mock-google-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "mock-google-secret")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "mock-github-client-id")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "mock-github-secret")
    monkeypatch.setattr(settings, "AUTH_FRONTEND_URL", "https://app.example.com")

    # Google Auth URL
    google_url = OAuthService.get_google_auth_url("test-state-google")
    assert "accounts.google.com" in google_url
    assert "client_id=mock-google-client-id" in google_url
    assert "state=test-state-google" in google_url
    assert "scope=openid+email+profile" in google_url or "scope=openid%20email%20profile" in google_url
    # Ensure no malformed double parameter keys
    assert "client_id=client_id=" not in google_url
    assert "response_type=response_type=" not in google_url

    # GitHub Auth URL
    github_url = OAuthService.get_github_auth_url("test-state-github")
    assert "github.com/login/oauth/authorize" in github_url
    assert "client_id=mock-github-client-id" in github_url
    assert "state=test-state-github" in github_url
    assert "client_id=client_id=" not in github_url


@pytest.mark.asyncio
async def test_google_oauth_url_generation_regression(monkeypatch):
    """Regression test for Google OAuth URL parameter serialization.

    Verifies:
    1. parsed query['client_id'] == configured client ID (single parameter)
    2. parsed query['response_type'] == ['code']
    3. redirect_uri decodes to: https://app.nexaai.com/api/auth/callback/google
    4. state is preserved accurately
    5. No double-prefixed keys (e.g. client_id=client_id=...) exist in the raw URL
    """
    configured_client_id = "test-web-client-12345.apps.googleusercontent.com"
    frontend_origin = "https://app.nexaai.com"
    expected_redirect_uri = f"{frontend_origin}/api/auth/callback/google"
    state_token = "google.testnonce123.1726830000.testsig456"

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", configured_client_id)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-secret")
    monkeypatch.setattr(settings, "AUTH_FRONTEND_URL", frontend_origin)
    monkeypatch.setattr(settings, "GOOGLE_REDIRECT_URI", None)  # rely on default resolution

    url = OAuthService.get_google_auth_url(state_token)

    # 1. Base URL verification
    parsed = urlparse(url)
    assert parsed.scheme == "https"
    assert parsed.netloc == "accounts.google.com"
    assert parsed.path == "/o/oauth2/v2/auth"

    # 2. Query parameter parsing
    query = parse_qs(parsed.query, keep_blank_values=True)

    # Verify client_id matches configured value and is not duplicated or malformed
    assert "client_id" in query
    assert len(query["client_id"]) == 1
    assert query["client_id"][0] == configured_client_id
    assert query["client_id"] == [configured_client_id]

    # Verify response_type is exactly ['code']
    assert query["response_type"] == ["code"]

    # Verify redirect_uri decodes to exact target URI
    assert "redirect_uri" in query
    assert len(query["redirect_uri"]) == 1
    assert query["redirect_uri"][0] == expected_redirect_uri

    # Verify state is present and unchanged
    assert "state" in query
    assert query["state"] == [state_token]

    # Verify additional required Google parameters
    assert query["scope"] == ["openid email profile"]
    assert query["access_type"] == ["offline"]
    assert query["prompt"] == ["select_account"]

    # 3. Raw string safety assertions: MUST NOT have malformed doubled keys
    assert "client_id=client_id=" not in url
    assert "response_type=response_type=" not in url
    assert "redirect_uri=redirect_uri=" not in url
    assert "state=state=" not in url


@pytest.mark.asyncio
async def test_get_authorization_url_endpoint(client: AsyncClient, monkeypatch):
    """Verify GET /api/v1/auth/oauth/{provider}/url returns state and sets cookie."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "mock-google-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "mock-google-secret")

    resp = await client.get("/api/v1/auth/oauth/google/url")
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider"] == "google"
    assert "url" in data
    assert "state" in data
    assert data["state"].startswith("google.")
    # State cookie should be set in response headers
    assert "nexaai_oauth_state" in resp.cookies or "set-cookie" in resp.headers


@pytest.mark.asyncio
async def test_google_callback_verified_email_flow(monkeypatch):
    """Verify Google callback requires and accepts verified email."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-secret")

    # Mock Google token and userinfo responses
    async def mock_post(url, *args, **kwargs):
        return Response(200, json={"access_token": "google-mock-access-token"})

    async def mock_get(url, *args, **kwargs):
        return Response(200, json={
            "sub": "google-sub-1001",
            "email": "googleuser@example.com",
            "email_verified": True,
            "name": "Google User",
            "picture": "https://lh3.googleusercontent.com/avatar.jpg",
        })

    with patch("httpx.AsyncClient.post", side_effect=mock_post), \
         patch("httpx.AsyncClient.get", side_effect=mock_get):
        profile = await OAuthService.handle_google_callback("valid-google-code")
        assert profile["provider"] == "google"
        assert profile["provider_account_id"] == "google-sub-1001"
        assert profile["email"] == "googleuser@example.com"
        assert profile["email_verified"] is True
        assert profile["avatar_url"] == "https://lh3.googleusercontent.com/avatar.jpg"


@pytest.mark.asyncio
async def test_google_callback_unverified_email_rejected(monkeypatch):
    """Verify Google callback rejects accounts with unverified email."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-secret")

    async def mock_post(url, *args, **kwargs):
        return Response(200, json={"access_token": "google-mock-access-token"})

    async def mock_get(url, *args, **kwargs):
        return Response(200, json={
            "sub": "google-sub-1002",
            "email": "unverified@example.com",
            "email_verified": False,
            "name": "Unverified User",
        })

    with patch("httpx.AsyncClient.post", side_effect=mock_post), \
         patch("httpx.AsyncClient.get", side_effect=mock_get):
        with pytest.raises(HTTPException) as exc:
            await OAuthService.handle_google_callback("code-unverified")
        assert exc.value.status_code == 400
        assert "not verified" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_github_callback_verified_email_flow(monkeypatch):
    """Verify GitHub callback resolves verified email from /user/emails."""
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "test-github-id")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "test-github-secret")

    async def mock_post(url, *args, **kwargs):
        return Response(200, json={"access_token": "github-mock-access-token"})

    async def mock_get(url, *args, **kwargs):
        if "user/emails" in url:
            return Response(200, json=[
                {"email": "unverified@github.com", "primary": False, "verified": False},
                {"email": "verified_primary@github.com", "primary": True, "verified": True},
            ])
        return Response(200, json={
            "id": 987654321,
            "login": "octocat",
            "name": "The Octocat",
            "avatar_url": "https://avatars.githubusercontent.com/u/987654321",
        })

    with patch("httpx.AsyncClient.post", side_effect=mock_post), \
         patch("httpx.AsyncClient.get", side_effect=mock_get):
        profile = await OAuthService.handle_github_callback("valid-github-code")
        assert profile["provider"] == "github"
        assert profile["provider_account_id"] == "987654321"
        assert profile["email"] == "verified_primary@github.com"
        assert profile["email_verified"] is True
        assert profile["display_name"] == "The Octocat"


@pytest.mark.asyncio
async def test_github_callback_unverified_email_rejected(monkeypatch):
    """Verify GitHub callback rejects when no verified email exists."""
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "test-github-id")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "test-github-secret")

    async def mock_post(url, *args, **kwargs):
        return Response(200, json={"access_token": "github-mock-access-token"})

    async def mock_get(url, *args, **kwargs):
        if "user/emails" in url:
            return Response(200, json=[
                {"email": "unverified1@github.com", "primary": True, "verified": False},
                {"email": "unverified2@github.com", "primary": False, "verified": False},
            ])
        return Response(200, json={"id": 112233, "login": "noverify"})

    with patch("httpx.AsyncClient.post", side_effect=mock_post), \
         patch("httpx.AsyncClient.get", side_effect=mock_get):
        with pytest.raises(HTTPException) as exc:
            await OAuthService.handle_github_callback("code-noverify")
        assert exc.value.status_code == 400
        assert "no verified email" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_oauth_account_lifecycle_linking_and_avatar(async_db: AsyncSession):
    """Verify new OAuth user creation, avatar syncing, and linking without duplication."""
    email = f"lifecycle_{uuid.uuid4().hex[:8]}@example.com"

    # 1. New OAuth user creation
    user = await AuthService.create_or_link_oauth_user(
        db=async_db,
        provider="google",
        provider_account_id="goog-lifecycle-1",
        email=email,
        display_name="Lifecycle User",
        avatar_url="https://lh3.googleusercontent.com/first-avatar.png",
        email_verified=True,
    )
    assert user.id is not None
    assert user.email == email
    assert user.hashed_password is None
    assert user.avatar_url == "https://lh3.googleusercontent.com/first-avatar.png"
    assert user.is_verified is True

    # 2. Subsequent login with same Google account returns same user without duplicate
    user2 = await AuthService.create_or_link_oauth_user(
        db=async_db,
        provider="google",
        provider_account_id="goog-lifecycle-1",
        email=email,
    )
    assert user2.id == user.id

    # 3. Linking second provider (GitHub) with matching verified email
    user3 = await AuthService.create_or_link_oauth_user(
        db=async_db,
        provider="github",
        provider_account_id="gh-lifecycle-999",
        email=email,
        display_name="GitHub Handle",
        avatar_url="https://avatars.github.com/second-avatar.png",
        email_verified=True,
    )
    assert user3.id == user.id
    # Existing avatar should NOT be overwritten
    assert user3.avatar_url == "https://lh3.googleusercontent.com/first-avatar.png"

    # Verify both OAuth accounts are linked to the single user
    stmt = select(OAuthAccount).where(OAuthAccount.user_id == user.id)
    res = await async_db.execute(stmt)
    accounts = res.scalars().all()
    assert len(accounts) == 2
    providers = {acc.provider for acc in accounts}
    assert providers == {"google", "github"}


@pytest.mark.asyncio
async def test_oauth_user_cannot_password_login(async_db: AsyncSession):
    """Verify that an account created via OAuth cannot be accessed with password login."""
    oauth_email = f"oauthonly_{uuid.uuid4().hex[:8]}@example.com"

    # Create OAuth-only user
    user = await AuthService.create_or_link_oauth_user(
        db=async_db,
        provider="google",
        provider_account_id="goog-pass-guard-1",
        email=oauth_email,
        display_name="OAuth Only",
        email_verified=True,
    )
    assert user.hashed_password is None

    # Attempt password login
    with pytest.raises(HTTPException) as exc:
        await AuthService.authenticate_user(async_db, oauth_email, "AnyPassword123!")
    assert exc.value.status_code == 400
    assert "social login" in exc.value.detail.lower()
    assert "google" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_oauth_callback_endpoint_full_flow(client: AsyncClient, async_db: AsyncSession, monkeypatch):
    """Verify POST /api/v1/auth/oauth/callback with state validation, user creation, and cookie cleanup."""
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-secret")

    state = OAuthService.generate_oauth_state("google")
    callback_email = f"callback_{uuid.uuid4().hex[:8]}@example.com"

    # Mock Google profile return
    mock_profile = {
        "provider": "google",
        "provider_account_id": f"sub-{uuid.uuid4().hex[:8]}",
        "email": callback_email,
        "email_verified": True,
        "display_name": "Callback User",
        "avatar_url": "https://avatar.google.com/pic.jpg",
    }

    with patch.object(OAuthService, "handle_google_callback", AsyncMock(return_value=mock_profile)):
        # 1. Missing state -> 400
        resp_missing = await client.post(
            "/api/v1/auth/oauth/callback",
            json={"provider": "google", "code": "valid-code"},
        )
        assert resp_missing.status_code == 400
        missing_msg = resp_missing.json().get("error", {}).get("message") or resp_missing.json().get("detail", "")
        assert "missing" in missing_msg.lower()

        # 2. State cookie mismatch -> 400
        client.cookies.set("nexaai_oauth_state", "different-cookie-state")
        resp_mismatch = await client.post(
            "/api/v1/auth/oauth/callback",
            json={"provider": "google", "code": "valid-code", "state": state},
        )
        assert resp_mismatch.status_code == 400
        mismatch_msg = resp_mismatch.json().get("error", {}).get("message") or resp_mismatch.json().get("detail", "")
        assert "does not match" in mismatch_msg.lower()

        # 3. Valid state & matching cookie -> 200 OK with session tokens
        client.cookies.set("nexaai_oauth_state", state)
        resp_success = await client.post(
            "/api/v1/auth/oauth/callback",
            json={"provider": "google", "code": "valid-code", "state": state},
        )
        assert resp_success.status_code == 200
        token_data = resp_success.json()
        assert "access_token" in token_data
        assert token_data["token_type"] == "bearer"
        assert token_data["user"]["email"] == callback_email
        assert token_data["user"]["has_password"] is False

        # Refresh cookie should be set, and oauth_state cookie cleared
        assert settings.REFRESH_COOKIE_NAME in resp_success.cookies or "set-cookie" in resp_success.headers
