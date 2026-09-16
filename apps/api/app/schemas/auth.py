"""Authentication request and response schemas."""

import re
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserResponse


class UserRegisterRequest(BaseModel):
    """Payload for registering a new account."""

    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password must contain at least 8 characters, including upper, lower, and a number",
    )
    display_name: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Full name or display pseudonym",
    )

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLoginRequest(BaseModel):
    """Payload for user credentials authentication."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """JWT access token response model."""

    access_token: str = Field(..., description="JWT bearer access token")
    token_type: str = Field(default="bearer", description="Token scheme")
    expires_in: int = Field(..., description="Access token lifetime in seconds")
    user: Optional[UserResponse] = Field(
        default=None,
        description="Public user profile representation",
    )


class RefreshTokenRequest(BaseModel):
    """Optional payload fallback if refresh token is provided via request body."""

    refresh_token: Optional[str] = None


class AuthMessageResponse(BaseModel):
    """Generic status response for auth operations like logout."""

    success: bool = True
    message: str
