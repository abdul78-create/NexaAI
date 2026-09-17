"""Chat Mode Router for resolving model architectures, parameters, and quotas based on user selection."""

from enum import Enum
from typing import Any, Dict, Optional
from app.core.config import settings


class ChatMode(str, Enum):
    LOW = "low"
    STANDARD = "standard"
    HIGH = "high"


def normalize_chat_mode(val: Optional[str]) -> ChatMode:
    """Normalize input strings (including 'quick') to canonical ChatMode enum."""
    if not val:
        return ChatMode.STANDARD
    cleaned = val.strip().lower()
    if cleaned in ("quick", "low", "fast"):
        return ChatMode.LOW
    if cleaned in ("high", "pro", "deep"):
        return ChatMode.HIGH
    return ChatMode.STANDARD


def resolve_model_for_mode(mode: Optional[str] | ChatMode) -> str:
    """Resolves the configured AI model identifier for the selected chat mode."""
    canonical = normalize_chat_mode(mode if isinstance(mode, str) else (mode.value if mode else None))
    if canonical == ChatMode.LOW:
        return settings.CHAT_MODE_LOW_MODEL
    elif canonical == ChatMode.HIGH:
        return settings.CHAT_MODE_HIGH_MODEL
    return settings.CHAT_MODE_STANDARD_MODEL


def get_mode_generation_params(mode: Optional[str] | ChatMode) -> Dict[str, Any]:
    """Returns generation parameters (temperature, max_tokens, etc.) tailored to the mode."""
    canonical = normalize_chat_mode(mode if isinstance(mode, str) else (mode.value if mode else None))
    if canonical == ChatMode.LOW:
        return {
            "mode": canonical.value,
            "model": settings.CHAT_MODE_LOW_MODEL,
            "max_tokens": 1024,
            "temperature": 0.7,
            "label": "Quick",
            "description": "Fast responses optimized for everyday tasks and quick lookups",
        }
    elif canonical == ChatMode.HIGH:
        return {
            "mode": canonical.value,
            "model": settings.CHAT_MODE_HIGH_MODEL,
            "max_tokens": 4096,
            "temperature": 0.5,
            "label": "High",
            "description": "Maximum reasoning depth with advanced models for complex analysis",
        }
    else:
        return {
            "mode": canonical.value,
            "model": settings.CHAT_MODE_STANDARD_MODEL,
            "max_tokens": 2048,
            "temperature": 0.7,
            "label": "Standard",
            "description": "Balanced intelligence and speed for general productivity and writing",
        }
