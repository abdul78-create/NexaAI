"""OAuth API endpoints for Google and GitHub authentication."""

import logging
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.auth import TokenResponse
from app.schemas.oauth import (
    OAuthAuthorizeUrlResponse,
    OAuthCallbackRequest,
    OAuthProvidersResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.oauth_service import OAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/oauth", tags=["OAuth Authentication"])


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Helper to attach an HTTP-only secure refresh token cookie."""
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=raw_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )


@router.get(
    "/providers",
    response_model=OAuthProvidersResponse,
    summary="List available and configured OAuth providers",
)
async def list_providers() -> OAuthProvidersResponse:
    """Returns the list of OAuth providers currently configured on the server."""
    return OAuthProvidersResponse(providers=OAuthService.get_configured_providers())


@router.get(
    "/{provider}/url",
    response_model=OAuthAuthorizeUrlResponse,
    summary="Get OAuth authorization URL for frontend redirect",
)
async def get_authorization_url(provider: str) -> OAuthAuthorizeUrlResponse:
    """Generates an authorization URL for the specified provider (google or github)."""
    normalized_provider = provider.lower()
    state = secrets.token_urlsafe(32)

    if normalized_provider == "google":
        url = OAuthService.get_google_auth_url(state)
    elif normalized_provider == "github":
        url = OAuthService.get_github_auth_url(state)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider '{provider}'. Supported: google, github",
        )

    return OAuthAuthorizeUrlResponse(provider=normalized_provider, url=url, state=state)


@router.get(
    "/{provider}",
    summary="Direct browser redirect to OAuth provider",
)
async def redirect_to_provider(provider: str) -> RedirectResponse:
    """Redirects the browser directly to the third-party OAuth provider login."""
    normalized_provider = provider.lower()
    state = secrets.token_urlsafe(32)

    if normalized_provider == "google":
        url = OAuthService.get_google_auth_url(state)
    elif normalized_provider == "github":
        url = OAuthService.get_github_auth_url(state)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider '{provider}'.",
        )

    return RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.post(
    "/callback",
    response_model=TokenResponse,
    summary="Exchange OAuth code for JWT session tokens (SPA flow)",
)
async def oauth_callback(
    data: OAuthCallbackRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchanges an authorization code with the provider, creates or links the user,

    and returns a JWT token pair with an HTTP-only refresh cookie.
    """
    provider = data.provider.lower()

    if provider == "google":
        profile = await OAuthService.handle_google_callback(data.code)
    elif provider == "github":
        profile = await OAuthService.handle_github_callback(data.code)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider '{data.provider}'.",
        )

    user = await AuthService.create_or_link_oauth_user(
        db=db,
        provider=profile["provider"],
        provider_account_id=profile["provider_account_id"],
        email=profile.get("email"),
        display_name=profile.get("display_name"),
    )

    access_token, raw_refresh, expires_in = await AuthService.create_session_tokens(
        db,
        user,
    )

    _set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/{provider}/callback",
    summary="Direct OAuth callback from provider redirect",
)
async def direct_oauth_callback(
    provider: str,
    code: str = Query(...),
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Handles direct browser callback from OAuth providers and redirects to the frontend app."""
    norm_provider = provider.lower()

    if norm_provider == "google":
        profile = await OAuthService.handle_google_callback(code)
    elif norm_provider == "github":
        profile = await OAuthService.handle_github_callback(code)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider '{provider}'.",
        )

    user = await AuthService.create_or_link_oauth_user(
        db=db,
        provider=profile["provider"],
        provider_account_id=profile["provider_account_id"],
        email=profile.get("email"),
        display_name=profile.get("display_name"),
    )

    access_token, raw_refresh, _ = await AuthService.create_session_tokens(
        db,
        user,
    )

    target_url = f"{settings.AUTH_FRONTEND_URL.rstrip('/')}/app?token={access_token}"
    response = RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)
    _set_refresh_cookie(response, raw_refresh)
    return response
