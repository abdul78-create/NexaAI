import hashlib
import hmac
import logging
import secrets
import time
from typing import Any, Dict, Optional
from urllib.parse import urlencode
import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

STATE_EXPIRATION_SECONDS = 600  # 10 minutes


def get_oauth_cookie_kwargs() -> Dict[str, Any]:
    """Return cookie kwargs appropriate for local dev or cross-domain production."""
    if settings.COOKIE_SECURE or settings.APP_ENV == "production":
        samesite = "none"
        secure = True
    else:
        samesite = settings.COOKIE_SAMESITE or "lax"
        secure = settings.COOKIE_SECURE

    return {
        "max_age": STATE_EXPIRATION_SECONDS,
        "httponly": True,
        "secure": secure,
        "samesite": samesite,
        "domain": settings.COOKIE_DOMAIN,
        "path": "/",
    }


class OAuthService:
    """Handles OAuth 2.0 URL generation, token exchanges, profile fetching, and CSRF protection."""

    # ── CSRF State Management ─────────────────────────────────────────────

    @classmethod
    def generate_oauth_state(cls, provider: str) -> str:
        """Generate a cryptographically signed state token.

        Format: {provider}.{nonce}.{timestamp}.{signature}
        """
        nonce = secrets.token_urlsafe(24)
        timestamp = int(time.time())
        payload = f"{provider.lower()}:{nonce}:{timestamp}"
        signature = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return f"{provider.lower()}.{nonce}.{timestamp}.{signature}"

    @classmethod
    def verify_oauth_state(
        cls,
        state: Optional[str],
        expected_provider: str,
        cookie_state: Optional[str] = None,
    ) -> bool:
        """Verify an OAuth state token against signature, provider, timestamp, and browser cookie.

        Raises:
            HTTPException: 400 if state is missing, malformed, mismatched, expired, or tampered.
        """
        if not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing OAuth state parameter.",
            )

        if cookie_state and not hmac.compare_digest(state, cookie_state):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state does not match browser session.",
            )

        parts = state.split(".")
        if len(parts) != 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed OAuth state parameter.",
            )

        provider, nonce, ts_str, signature = parts
        if provider.lower() != expected_provider.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth state provider mismatch: expected {expected_provider}, got {provider}.",
            )

        try:
            timestamp = int(ts_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid timestamp in OAuth state parameter.",
            )

        now = int(time.time())
        if now - timestamp > STATE_EXPIRATION_SECONDS or timestamp > now + 60:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state parameter has expired. Please try signing in again.",
            )

        expected_payload = f"{provider.lower()}:{nonce}:{timestamp}"
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            expected_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OAuth state signature.",
            )

        return True

    # ── Configuration checks ──────────────────────────────────────────────

    @staticmethod
    def is_google_configured() -> bool:
        return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

    @staticmethod
    def is_github_configured() -> bool:
        return bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET)

    @classmethod
    def get_configured_providers(cls) -> list[str]:
        providers = []
        if cls.is_google_configured():
            providers.append("google")
        if cls.is_github_configured():
            providers.append("github")
        return providers

    # ── Redirect URI Resolution ───────────────────────────────────────────

    @classmethod
    def get_google_redirect_uri(cls) -> str:
        if settings.GOOGLE_REDIRECT_URI:
            return settings.GOOGLE_REDIRECT_URI
        return f"{settings.AUTH_FRONTEND_URL.rstrip('/')}/api/auth/callback/google"

    @classmethod
    def get_github_redirect_uri(cls) -> str:
        if settings.GITHUB_REDIRECT_URI:
            return settings.GITHUB_REDIRECT_URI
        return f"{settings.AUTH_FRONTEND_URL.rstrip('/')}/api/auth/callback/github"

    # ── Authorization URLs ────────────────────────────────────────────────

    @classmethod
    def get_google_auth_url(cls, state: str) -> str:
        if not cls.is_google_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is not configured on this server.",
            )
        redirect_uri = cls.get_google_redirect_uri()
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "state": state,
            "prompt": "select_account",
        }
        query = urlencode(params)
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

    @classmethod
    def get_github_auth_url(cls, state: str) -> str:
        if not cls.is_github_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitHub OAuth is not configured on this server.",
            )
        redirect_uri = cls.get_github_redirect_uri()
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "read:user user:email",
            "state": state,
        }
        query = urlencode(params)
        return f"https://github.com/login/oauth/authorize?{query}"

    # ── Code Exchange & Profile Fetching ──────────────────────────────────

    @classmethod
    async def handle_google_callback(cls, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """Exchange Google authorization code for user profile with verified email."""
        if not cls.is_google_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is not configured.",
            )

        effective_redirect_uri = (
            redirect_uri.strip().strip("'\"").rstrip("/")
            if redirect_uri
            else cls.get_google_redirect_uri()
        )
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": effective_redirect_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data=token_data,
            )
            if token_resp.status_code != 200:
                err_code = "token_exchange_failed"
                err_desc = "Invalid or expired code."
                try:
                    err_json = token_resp.json()
                    err_code = err_json.get("error", "token_exchange_failed")
                    err_desc = err_json.get("error_description", err_code)
                except Exception:
                    err_desc = token_resp.text[:200]

                # Sanitize: never log secrets, codes, or tokens
                safe_redirect = effective_redirect_uri.split("?")[0] if effective_redirect_uri else ""
                logger.error(
                    f"Google token exchange rejected: status={token_resp.status_code}, "
                    f"error={err_code}, description={err_desc}, redirect_uri={safe_redirect}"
                )

                if err_code == "redirect_uri_mismatch":
                    msg = f"Google OAuth redirect URI mismatch. Expected URI: {safe_redirect}"
                elif err_code == "invalid_client":
                    msg = "Google OAuth client credentials rejected by Google."
                elif err_code == "invalid_grant":
                    msg = f"Failed to authenticate with Google. Authorization code is invalid or already used ({err_desc})."
                else:
                    msg = f"Failed to authenticate with Google: {err_code} ({err_desc})."

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=msg,
                )

            tokens = token_resp.json()
            access_token = tokens.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google did not return an access token.",
                )

            # Fetch user profile
            profile_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch user profile from Google.",
                )

            profile = profile_resp.json()

        email = profile.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google did not provide an email address.",
            )

        email_verified = profile.get("email_verified", False)
        if isinstance(email_verified, str):
            email_verified = email_verified.lower() == "true"

        if not email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account email is not verified. Please verify your email with Google first.",
            )

        return {
            "provider": "google",
            "provider_account_id": str(profile.get("sub")),
            "email": email.strip().lower(),
            "email_verified": True,
            "display_name": profile.get("name") or email.split("@")[0],
            "avatar_url": profile.get("picture"),
        }

    @classmethod
    async def handle_github_callback(cls, code: str) -> Dict[str, Any]:
        """Exchange GitHub authorization code for user profile with verified email."""
        if not cls.is_github_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitHub OAuth is not configured.",
            )

        redirect_uri = cls.get_github_redirect_uri()
        token_data = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data=token_data,
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                logger.error(f"GitHub token exchange failed: {token_resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to authenticate with GitHub. Invalid or expired code.",
                )

            tokens = token_resp.json()
            access_token = tokens.get("access_token")
            if not access_token:
                error_desc = tokens.get("error_description", "Unknown error")
                logger.error(f"GitHub OAuth error: {error_desc}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"GitHub OAuth error: {error_desc}",
                )

            # Fetch user profile
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            }
            profile_resp = await client.get("https://api.github.com/user", headers=headers)
            if profile_resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch user profile from GitHub.",
                )

            profile = profile_resp.json()

            # GitHub email verification: Always inspect /user/emails for verified status
            verified_email = None
            emails_resp = await client.get("https://api.github.com/user/emails", headers=headers)
            if emails_resp.status_code == 200:
                emails_data = emails_resp.json()
                if isinstance(emails_data, list):
                    # Priority 1: primary and verified
                    for em in emails_data:
                        if em.get("primary") and em.get("verified") and em.get("email"):
                            verified_email = em.get("email").strip().lower()
                            break
                    # Priority 2: any verified email
                    if not verified_email:
                        for em in emails_data:
                            if em.get("verified") and em.get("email"):
                                verified_email = em.get("email").strip().lower()
                                break

            if not verified_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No verified email address found on your GitHub account. Please add and verify an email on GitHub.",
                )

        return {
            "provider": "github",
            "provider_account_id": str(profile.get("id")),
            "email": verified_email,
            "email_verified": True,
            "display_name": profile.get("name") or profile.get("login") or verified_email.split("@")[0],
            "avatar_url": profile.get("avatar_url"),
        }
