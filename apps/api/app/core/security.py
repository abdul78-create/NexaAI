"""Security and authentication utilities foundation."""

import secrets
from typing import Optional
from app.core.config import settings


def generate_secret_token(nbytes: int = 32) -> str:
    """Generate a cryptographically secure random URL-safe token."""
    return secrets.token_urlsafe(nbytes)


def is_secure_configured() -> bool:
    """Check if the SECRET_KEY has been modified from the default development value."""
    return (
        settings.SECRET_KEY != "dev_secret_key_change_in_production_min_32_chars_long"
        and len(settings.SECRET_KEY) >= 32
    )
