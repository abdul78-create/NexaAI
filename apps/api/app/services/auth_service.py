"""Authentication and account business logic service."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.models.auth import RefreshToken
from app.db.models.oauth_account import OAuthAccount
from app.db.models.user import User
from app.schemas.auth import UserRegisterRequest


class AuthService:
    """Service handling user registration, authentication, and token lifecycle."""

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Fetch user by case-insensitive email address with eager-loaded OAuth accounts."""
        normalized_email = email.strip().lower()
        stmt = (
            select(User)
            .where(User.email == normalized_email)
            .options(selectinload(User.oauth_accounts))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        """Fetch user by UUID identifier with eager-loaded OAuth accounts."""
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.oauth_accounts))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    async def register_user(
        cls,
        db: AsyncSession,
        data: UserRegisterRequest,
    ) -> User:
        """Register a new user account with Argon2id password hashing.

        Raises:
            HTTPException: 400 if email is already taken.
        """
        existing = await cls.get_user_by_email(db, data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        hashed = hash_password(data.password)
        new_user = User(
            email=data.email.strip().lower(),
            hashed_password=hashed,
            display_name=data.display_name.strip(),
            is_active=True,
            is_verified=False,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user, ["oauth_accounts"])
        return new_user

    @classmethod
    async def authenticate_user(
        cls,
        db: AsyncSession,
        email: str,
        password: str,
    ) -> User:
        """Authenticate user credentials.

        Raises:
            HTTPException: 401 on invalid credentials, 403 if account disabled.
        """
        user = await cls.get_user_by_email(db, email)
        if user and user.hashed_password is None:
            providers = [oa.provider.capitalize() for oa in user.oauth_accounts]
            prov_str = " or ".join(providers) if providers else "Google or GitHub"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This account was created via social login. Please sign in with {prov_str}.",
            )

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated.",
            )

        return user

    @classmethod
    async def create_session_tokens(
        cls,
        db: AsyncSession,
        user: User,
    ) -> Tuple[str, str, int]:
        """Generate JWT access token and persist a hashed refresh token.

        Returns:
            Tuple of (access_token, raw_refresh_token, expires_in_seconds)
        """
        access_token = create_access_token(
            subject=str(user.id),
            extra_claims={"email": user.email, "display_name": user.display_name},
        )
        raw_refresh_token, token_hash = create_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
        )

        db_refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked=False,
        )
        db.add(db_refresh_token)
        await db.commit()

        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        return access_token, raw_refresh_token, expires_in

    @classmethod
    async def rotate_refresh_token(
        cls,
        db: AsyncSession,
        raw_token: str,
    ) -> Tuple[User, str, str, int]:
        """Rotate a refresh token: validate, revoke old token, issue new token pair.

        Raises:
            HTTPException: 401 if refresh token is missing, expired, or revoked.
        """
        if not raw_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token required.",
            )

        target_hash = hash_token(raw_token)
        stmt = (
            select(RefreshToken)
            .where(RefreshToken.token_hash == target_hash)
            .options(selectinload(RefreshToken.user).selectinload(User.oauth_accounts))
        )
        result = await db.execute(stmt)
        token_record = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        expires_at = token_record.expires_at
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if (
            not token_record
            or token_record.revoked
            or (expires_at is not None and expires_at <= now)
            or not token_record.user
            or not token_record.user.is_active
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired, or revoked refresh token.",
            )

        # Invalidate the consumed refresh token (token rotation security)
        token_record.revoked = True
        await db.flush()

        # Issue new token pair
        user = token_record.user
        access_token, new_raw_refresh, expires_in = await cls.create_session_tokens(
            db,
            user,
        )
        return user, access_token, new_raw_refresh, expires_in

    @classmethod
    async def revoke_refresh_token(
        cls,
        db: AsyncSession,
        raw_token: Optional[str],
    ) -> bool:
        """Revoke a specific refresh token."""
        if not raw_token:
            return False

        target_hash = hash_token(raw_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == target_hash)
        result = await db.execute(stmt)
        token_record = result.scalar_one_or_none()

        if token_record and not token_record.revoked:
            token_record.revoked = True
            await db.commit()
            return True

        return False

    @classmethod
    async def create_or_link_oauth_user(
        cls,
        db: AsyncSession,
        provider: str,
        provider_account_id: str,
        email: Optional[str] = None,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        email_verified: bool = True,
    ) -> User:
        """Create or link a user authenticated via OAuth provider.

        1. Check if OAuthAccount exists -> return linked user (sync avatar if not set).
        2. Require email verification before linking to existing User or creating new.
        3. If User with matching email exists -> link OAuthAccount without duplicating user.
        4. If no matching user -> create new User (hashed_password=None) + OAuthAccount.
        5. Populate avatar_url from provider if user has no avatar yet.
        """
        norm_provider = provider.lower()
        target_email = email.strip().lower() if email else None

        # 1. Check existing OAuth link
        stmt = (
            select(OAuthAccount)
            .where(
                OAuthAccount.provider == norm_provider,
                OAuthAccount.provider_account_id == str(provider_account_id),
            )
            .options(selectinload(OAuthAccount.user).selectinload(User.oauth_accounts))
        )
        result = await db.execute(stmt)
        oauth_acc = result.scalar_one_or_none()

        if oauth_acc and oauth_acc.user:
            user = oauth_acc.user
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is deactivated.",
                )
            if target_email and not oauth_acc.provider_email:
                oauth_acc.provider_email = target_email
            # Avatar sync: populate if user currently has no avatar
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            await db.commit()
            await db.refresh(user, ["oauth_accounts"])
            return user

        # 2. Check email verification before linking or creating
        if not target_email or not email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A verified email address is required to sign in with OAuth.",
            )

        # 3. Check if user with matching email already exists
        user = await cls.get_user_by_email(db, target_email)

        if user:
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is deactivated.",
                )
            # Link to existing user without creating duplicate
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            if not user.is_verified:
                user.is_verified = True
        else:
            # 4. Create new User with hashed_password=None
            effective_name = display_name.strip() if display_name else target_email.split("@")[0]
            user = User(
                email=target_email,
                hashed_password=None,
                display_name=effective_name,
                avatar_url=avatar_url,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()

        # Link new OAuthAccount
        new_oauth = OAuthAccount(
            user_id=user.id,
            provider=norm_provider,
            provider_account_id=str(provider_account_id),
            provider_email=target_email,
        )
        db.add(new_oauth)
        await db.commit()
        await db.refresh(user, ["oauth_accounts"])
        return user

