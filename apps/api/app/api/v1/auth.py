"""Authentication endpoints router."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import (
    AuthMessageResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.schemas.user import UserMeResponse, UserResponse, UserUsageSummary
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


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


def _clear_refresh_cookie(response: Response) -> None:
    """Helper to remove the refresh token cookie."""
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Register a new user with Argon2id-hashed credentials."""
    user = await AuthService.register_user(db, data)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive access token",
)
async def login(
    data: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate email and password, issuing an access token and HttpOnly refresh cookie."""
    user = await AuthService.authenticate_user(db, data.email, data.password)
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


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token and issue new access token",
)
async def refresh(
    request: Request,
    response: Response,
    fallback_body: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchange a valid refresh token cookie for a new access token and rotated refresh token."""
    raw_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not raw_token and fallback_body and fallback_body.refresh_token:
        raw_token = fallback_body.refresh_token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found in cookie or request body.",
        )

    user, new_access_token, new_raw_refresh, expires_in = (
        await AuthService.rotate_refresh_token(db, raw_token)
    )

    _set_refresh_cookie(response, new_raw_refresh)

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke refresh token and clear auth session",
)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Revoke the current refresh token and clear the refresh cookie."""
    raw_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if raw_token:
        await AuthService.revoke_refresh_token(db, raw_token)

    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get(
    "/me",
    response_model=UserMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get profile and usage for authenticated user",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserMeResponse:
    """Retrieve identity and account usage stats for the authenticated caller."""
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        has_password=current_user.has_password,
        oauth_providers=current_user.oauth_providers,
        usage=UserUsageSummary(
            total_tokens=0,
            conversations=0,
            documents=0,
        ),
    )
