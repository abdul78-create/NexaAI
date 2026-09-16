"""AI Provider factory for dynamic provider instantiation based on environment configuration."""

from typing import Optional

from app.core.config import settings
from app.services.ai.base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.openai_provider import OpenAIProvider


def get_ai_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    """Factory function resolving active BaseAIProvider instance.
    
    If provider_name is specified, attempts to resolve that provider.
    Otherwise falls back to settings.AI_PROVIDER / OPENAI_API_KEY settings.
    """
    target_provider = (provider_name or settings.AI_PROVIDER).lower()

    if target_provider == "mock":
        return MockAIProvider()

    # Check for valid OpenAI configuration
    api_key = settings.OPENAI_API_KEY
    if not api_key or api_key.strip() in ("", "mock", "your-secret-key"):
        if settings.ENABLE_MOCK_AI_FALLBACK:
            return MockAIProvider()
        raise ValueError("OPENAI_API_KEY is not configured and ENABLE_MOCK_AI_FALLBACK is False.")

    return OpenAIProvider(
        api_key=api_key,
        base_url=settings.OPENAI_BASE_URL,
        default_model=settings.OPENAI_MODEL,
        timeout=settings.AI_REQUEST_TIMEOUT,
    )
