"""AI Provider factory for dynamic provider instantiation based on environment configuration."""

from typing import Optional

from app.core.config import settings
from app.services.ai.base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.openai_provider import OpenAIProvider


def get_ai_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    """Factory function resolving active BaseAIProvider instance.
    
    If provider_name is specified, attempts to resolve that provider.
    Otherwise defaults to settings.AI_PROVIDER (with automatic fallback based on configured keys).
    """
    requested = (provider_name or settings.AI_PROVIDER).lower()

    if requested == "mock":
        return MockAIProvider()

    # Determine if Gemini is the active target
    is_gemini_target = requested == "gemini" or (
        provider_name is None
        and bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() not in ("", "mock", "your-secret-key", "your-gemini-api-key"))
    )

    if is_gemini_target:
        gemini_key = settings.GEMINI_API_KEY
        if gemini_key and gemini_key.strip() not in ("", "mock", "your-secret-key", "your-gemini-api-key"):
            return OpenAIProvider(
                api_key=gemini_key,
                base_url=settings.GEMINI_BASE_URL,
                default_model=settings.GEMINI_MODEL,
                timeout=settings.AI_REQUEST_TIMEOUT,
                provider_name="gemini",
            )
        # Fallback to OpenAI if Gemini key is missing but OpenAI key is available
        openai_key = settings.OPENAI_API_KEY
        if openai_key and openai_key.strip() not in ("", "mock", "your-secret-key"):
            return OpenAIProvider(
                api_key=openai_key,
                base_url=settings.OPENAI_BASE_URL,
                default_model=settings.OPENAI_MODEL,
                timeout=settings.AI_REQUEST_TIMEOUT,
                provider_name="openai",
            )
        if settings.ENABLE_MOCK_AI_FALLBACK:
            return MockAIProvider()
        raise ValueError("GEMINI_API_KEY is not configured and ENABLE_MOCK_AI_FALLBACK is False.")

    # Explicit or fallback target is OpenAI
    openai_key = settings.OPENAI_API_KEY
    if not openai_key or openai_key.strip() in ("", "mock", "your-secret-key"):
        gemini_key = settings.GEMINI_API_KEY
        if gemini_key and gemini_key.strip() not in ("", "mock", "your-secret-key", "your-gemini-api-key"):
            return OpenAIProvider(
                api_key=gemini_key,
                base_url=settings.GEMINI_BASE_URL,
                default_model=settings.GEMINI_MODEL,
                timeout=settings.AI_REQUEST_TIMEOUT,
                provider_name="gemini",
            )
        if settings.ENABLE_MOCK_AI_FALLBACK:
            return MockAIProvider()
        raise ValueError("OPENAI_API_KEY is not configured and ENABLE_MOCK_AI_FALLBACK is False.")

    return OpenAIProvider(
        api_key=openai_key,
        base_url=settings.OPENAI_BASE_URL,
        default_model=settings.OPENAI_MODEL,
        timeout=settings.AI_REQUEST_TIMEOUT,
        provider_name="openai",
    )
