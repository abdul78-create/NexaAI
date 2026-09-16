"""API v1 router for User Settings & Preferences operations."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.db.models.preferences import UserPreferences
from app.db.session import get_db
from app.schemas.settings import (
    UserPreferencesResponse,
    UserPreferencesUpdate,
    UserProfileResponse,
    UserProfileUpdate,
)

router = APIRouter(prefix="/settings", tags=["settings"])


async def _get_or_create_user_preferences(
    db: AsyncSession,
    user_id: User,
) -> UserPreferences:
    """Fetch existing user preferences or initialize defaults."""
    stmt = select(UserPreferences).where(UserPreferences.user_id == user_id)
    res = await db.execute(stmt)
    prefs = res.scalar_one_or_none()

    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)

    return prefs


@router.get(
    "/preferences",
    response_model=UserPreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get caller's user preferences settings",
)
async def get_user_preferences(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferencesResponse:
    """Retrieve theme, default model, auto-OCR, auto-RAG, and privacy settings."""
    prefs = await _get_or_create_user_preferences(db, current_user.id)
    return UserPreferencesResponse.model_validate(prefs)


@router.patch(
    "/preferences",
    response_model=UserPreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user preferences settings",
)
async def update_user_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserPreferencesResponse:
    """Update appearance, AI defaults, or privacy disclosures."""
    prefs = await _get_or_create_user_preferences(db, current_user.id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None and hasattr(prefs, field):
            setattr(prefs, field, val)

    await db.commit()
    await db.refresh(prefs)
    return UserPreferencesResponse.model_validate(prefs)


@router.get(
    "/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user profile details",
)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserProfileResponse:
    """Retrieve current user profile data."""
    return UserProfileResponse.model_validate(current_user)


@router.patch(
    "/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update display name or profile details",
)
async def update_user_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """Update display name for active user."""
    if payload.display_name:
        current_user.display_name = payload.display_name.strip()
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)

    return UserProfileResponse.model_validate(current_user)
