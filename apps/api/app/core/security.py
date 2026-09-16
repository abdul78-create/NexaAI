"""Security and authentication utilities for NexaAI.

Implements Argon2id password hashing, RFC 7519 JWT generation/verification,
and cryptographically secure refresh token hashing.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple, Union

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import VerificationError, VerifyMismatchError

from app.core.config import settings

# Initialize Argon2id password hasher with RFC-recommended parameters
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    type=Type.ID,
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2 hash.

    Returns False safely on mismatch or invalid hash format.
    """
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, Exception):
        return False


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        subject: The unique user identifier (sub claim).
        expires_delta: Optional custom lifetime timedelta.
        extra_claims: Optional additional claims to include in the payload.

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token.

    Args:
        token: Encoded JWT string.

    Returns:
        Decoded claims dictionary.

    Raises:
        jwt.ExpiredSignatureError: If token has expired.
        jwt.InvalidTokenError: If token signature or structure is invalid.
    """
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Invalid token type: expected access token")
    return payload


def hash_token(raw_token: str) -> str:
    """Compute deterministic SHA-256 hash of a raw token for database storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_refresh_token() -> Tuple[str, str]:
    """Generate a high-entropy raw refresh token and its SHA-256 hash.

    Returns:
        Tuple of (raw_token, token_hash)
        - raw_token is sent to client via HTTP-only cookie
        - token_hash is persisted to the database
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash


def generate_secret_token(nbytes: int = 32) -> str:
    """Generate a cryptographically secure random URL-safe token."""
    return secrets.token_urlsafe(nbytes)


def is_secure_configured() -> bool:
    """Check if the SECRET_KEY has been modified from the default development value."""
    return (
        settings.SECRET_KEY != "dev_secret_key_change_in_production_min_32_chars_long"
        and len(settings.SECRET_KEY) >= 32
    )
