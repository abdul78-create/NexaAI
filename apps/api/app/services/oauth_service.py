"""OAuth service for handling third-party authentication flows (Google, GitHub)."""

import logging
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class OAuthService:
    """Handles OAuth 2.0 URL generation, token exchanges, and profile fetching."""

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
        query = "&".join(f"{k}={httpx.URL('', params={k: v}).query.decode()}" for k, v in params.items())
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
        query = "&".join(f"{k}={httpx.URL('', params={k: v}).query.decode()}" for k, v in params.items())
        return f"https://github.com/login/oauth/authorize?{query}"

    # ── Code Exchange & Profile Fetching ──────────────────────────────────

    @classmethod
    async def handle_google_callback(cls, code: str) -> Dict[str, Any]:
        """Exchange Google authorization code for user profile."""
        if not cls.is_google_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is not configured.",
            )

        redirect_uri = cls.get_google_redirect_uri()
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data=token_data,
            )
            if token_resp.status_code != 200:
                logger.error(f"Google token exchange failed: {token_resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to authenticate with Google. Invalid code.",
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

        return {
            "provider": "google",
            "provider_account_id": str(profile.get("sub")),
            "email": profile.get("email"),
            "display_name": profile.get("name") or profile.get("email", "").split("@")[0],
            "avatar_url": profile.get("picture"),
        }

    @classmethod
    async def handle_github_callback(cls, code: str) -> Dict[str, Any]:
        """Exchange GitHub authorization code for user profile."""
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
                    detail="Failed to authenticate with GitHub. Invalid code.",
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
            email = profile.get("email")

            # If email is private on GitHub, fetch from user/emails endpoint
            if not email:
                emails_resp = await client.get("https://api.github.com/user/emails", headers=headers)
                if emails_resp.status_code == 200:
                    emails_data = emails_resp.json()
                    for em in emails_data:
                        if em.get("primary") and em.get("verified"):
                            email = em.get("email")
                            break
                    if not email and emails_data:
                        email = emails_data[0].get("email")

        return {
            "provider": "github",
            "provider_account_id": str(profile.get("id")),
            "email": email,
            "display_name": profile.get("name") or profile.get("login"),
            "avatar_url": profile.get("avatar_url"),
        }
