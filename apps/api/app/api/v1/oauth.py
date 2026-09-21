"""OAuth API endpoints for Google and GitHub authentication."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
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
from app.services.oauth_service import OAuthService, get_oauth_cookie_kwargs

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
async def get_authorization_url(provider: str, response: Response) -> OAuthAuthorizeUrlResponse:
    """Generates an authorization URL for the specified provider (google or github) and sets a state cookie."""
    normalized_provider = provider.lower()
    if normalized_provider not in ("google", "github"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider '{provider}'. Supported: google, github",
        )

    state = OAuthService.generate_oauth_state(normalized_provider)

    if normalized_provider == "google":
        url = OAuthService.get_google_auth_url(state)
    else:
        url = OAuthService.get_github_auth_url(state)

    # Set CSRF protection state cookie
    response.set_cookie(
        key="nexaai_oauth_state",
        value=state,
        **get_oauth_cookie_kwargs(),
    )

    return OAuthAuthorizeUrlResponse(provider=normalized_provider, url=url, state=state)


@router.get(
    "/{provider}",
    summary="Direct browser redirect to OAuth provider",
)
async def redirect_to_provider(provider: str) -> RedirectResponse:
    """Redirects the browser directly to the third-party OAuth provider login with state cookie."""
    normalized_provider = provider.lower()
    if normalized_provider not in ("google", "github"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider '{provider}'. Supported: google, github",
        )

    state = OAuthService.generate_oauth_state(normalized_provider)

    if normalized_provider == "google":
        url = OAuthService.get_google_auth_url(state)
    else:
        url = OAuthService.get_github_auth_url(state)

    redirect_resp = RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    redirect_resp.set_cookie(
        key="nexaai_oauth_state",
        value=state,
        **get_oauth_cookie_kwargs(),
    )
    return redirect_resp


@router.post(
    "/callback",
    response_model=TokenResponse,
    summary="Exchange OAuth code for JWT session tokens (SPA flow)",
)
async def oauth_callback(
    data: OAuthCallbackRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchanges an authorization code with the provider, creates or links the user,

    and returns a JWT token pair with an HTTP-only refresh cookie.
    """
    provider = data.provider.lower()
    cookie_state = request.cookies.get("nexaai_oauth_state")

    # 1. Verify CSRF State
    OAuthService.verify_oauth_state(
        state=data.state,
        expected_provider=provider,
        cookie_state=cookie_state,
    )

    # 2. Clear state cookie after successful verification
    response.delete_cookie(
        key="nexaai_oauth_state",
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )

    # 3. Handle provider code exchange & user profile
    if provider == "google":
        profile = await OAuthService.handle_google_callback(
            code=data.code,
            redirect_uri=data.redirect_uri,
        )
    elif provider == "github":
        profile = await OAuthService.handle_github_callback(data.code)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider '{data.provider}'.",
        )

    # 4. Link or create user with avatar synchronization and verified email check
    user = await AuthService.create_or_link_oauth_user(
        db=db,
        provider=profile["provider"],
        provider_account_id=profile["provider_account_id"],
        email=profile.get("email"),
        display_name=profile.get("display_name"),
        avatar_url=profile.get("avatar_url"),
        email_verified=profile.get("email_verified", True),
    )

    # 5. Issue JWT and refresh token
    access_token, raw_refresh, expires_in = await AuthService.create_session_tokens(
        db,
        user,
    )

    _set_refresh_cookie(response, raw_refresh)

    # Ensure oauth_accounts relationship is loaded before UserResponse serialization
    await db.refresh(user, ["oauth_accounts"])

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
    request: Request,
    code: str = Query(...),
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Handles direct browser callback from OAuth providers and redirects to the frontend app."""
    norm_provider = provider.lower()
    cookie_state = request.cookies.get("nexaai_oauth_state")

    # Verify CSRF State
    OAuthService.verify_oauth_state(
        state=state,
        expected_provider=norm_provider,
        cookie_state=cookie_state,
    )

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
        avatar_url=profile.get("avatar_url"),
        email_verified=profile.get("email_verified", True),
    )

    access_token, raw_refresh, _ = await AuthService.create_session_tokens(
        db,
        user,
    )

    target_url = f"{settings.AUTH_FRONTEND_URL.rstrip('/')}/app?token={access_token}"
    response = RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)
    response.delete_cookie(key="nexaai_oauth_state", path="/", domain=settings.COOKIE_DOMAIN)
    _set_refresh_cookie(response, raw_refresh)
    return response
