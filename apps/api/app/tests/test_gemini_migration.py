"""Unit tests verifying Phase 2: Google Gemini migration, provider resolution,
model routing, capability detection, stream_options omission, and fallback behaviors.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.config import settings
from app.services.ai.base import ChatMessagePayload
from app.services.ai.capabilities import get_model_capabilities
from app.services.ai.factory import get_ai_provider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.mode_router import ChatMode, resolve_model_for_mode
from app.services.ai.openai_provider import OpenAIProvider
from app.services.documents.embeddings import (
    GeminiEmbeddingProvider,
    MockEmbeddingProvider,
    OpenAIEmbeddingProvider,
    get_embedding_provider,
)
from app.services.images.providers.mock import MockVisionProvider
from app.services.images.providers.vision import OpenAIVisionProvider
from app.services.images.service import get_vision_provider
from app.services.speech.mock import MockSTTProvider
from app.services.speech.providers.openai import OpenAISTTProvider
from app.services.speech.service import get_speech_provider


@pytest.mark.asyncio
async def test_gemini_provider_factory_resolution(monkeypatch):
    """Verify get_ai_provider resolves Gemini when configured and falls back correctly."""
    # 1. When GEMINI_API_KEY is configured and AI_PROVIDER is gemini
    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-gemini-key-12345")
    monkeypatch.setattr(settings, "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")

    provider = get_ai_provider()
    assert isinstance(provider, OpenAIProvider)
    assert provider.provider_name == "gemini"
    assert "generativelanguage.googleapis.com" in provider.base_url
    assert provider.default_model == "gemini-3.6-flash"

    # 2. When explicitly requesting "mock"
    mock_prov = get_ai_provider("mock")
    assert isinstance(mock_prov, MockAIProvider)
    assert mock_prov.provider_name == "mock"

    # 3. When explicitly requesting "openai" with valid key
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test-openai-key")
    openai_prov = get_ai_provider("openai")
    assert isinstance(openai_prov, OpenAIProvider)
    assert openai_prov.provider_name == "openai"
    assert "api.openai.com" in openai_prov.base_url

    # 4. When keys are empty and mock fallback enabled
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "ENABLE_MOCK_AI_FALLBACK", True)
    fallback_prov = get_ai_provider()
    assert isinstance(fallback_prov, MockAIProvider)


@pytest.mark.asyncio
async def test_gemini_model_mapping():
    gemini_prov = OpenAIProvider(
        api_key="fake-gemini-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )
    assert gemini_prov.base_url == "https://generativelanguage.googleapis.com/v1beta/openai/"
    assert gemini_prov._resolve_model("nexa-standard") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("nexa-fast") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("nexa-coder") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("nexa-reasoning") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("nexa-pro") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("nexa-ultra") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("gemini-2.5-flash") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("gemini-2.5-pro") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("gemini-3.6-flash") == "gemini-3.6-flash"
    assert gemini_prov._resolve_model("unrecognized-alias") == "gemini-3.6-flash"

    openai_prov = OpenAIProvider(
        api_key="fake-openai-key",
        base_url="https://api.openai.com/v1",
        provider_name="openai",
    )
    assert openai_prov._resolve_model("nexa-standard") == "gpt-4o-mini"
    assert openai_prov._resolve_model("nexa-fast") == "gpt-4o-mini"
    assert openai_prov._resolve_model("nexa-reasoning") == "gpt-4o"
    assert openai_prov._resolve_model("nexa-pro") == "gpt-4o"
    assert openai_prov._resolve_model("nexa-ultra") == "gpt-4o"


@pytest.mark.asyncio
async def test_gemini_capabilities_registration():
    """Verify Gemini models are registered with vision capabilities and large context limits."""
    cap_flash = get_model_capabilities("gemini-2.5-flash")
    assert cap_flash.vision is True
    assert cap_flash.text is True
    assert cap_flash.documents is True
    assert cap_flash.max_context_tokens >= 1000000

    cap_pro = get_model_capabilities("gemini-2.5-pro")
    assert cap_pro.vision is True
    assert cap_pro.max_context_tokens >= 2000000

    cap_38 = get_model_capabilities("gemini-3.8-flash")
    assert cap_38.vision is True

    # Unknown gemini model dynamically resolves vision=True and 1M context
    cap_custom = get_model_capabilities("gemini-custom-experiment")
    assert cap_custom.vision is True
    assert cap_custom.max_context_tokens == 1048576


@pytest.mark.asyncio
async def test_gemini_stream_does_not_send_stream_options():
    """CRITICAL: Google Gemini rejects stream_options with 400 Bad Request.

    Verify that Gemini stream calls omit stream_options while OpenAI stream calls retain it.
    """
    gemini_prov = OpenAIProvider(
        api_key="fake-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    captured_kwargs = {}

    async def fake_create(**kwargs):
        nonlocal captured_kwargs
        captured_kwargs = kwargs
        # Create an async generator yielding empty chunks
        async def empty_stream():
            if False:
                yield None
        return empty_stream()

    gemini_prov.client.chat.completions.create = fake_create

    messages = [ChatMessagePayload(role="user", content="Hello Gemini")]
    async for _ in gemini_prov.stream(messages=messages, model="gemini-3.6-flash"):
        pass

    assert "stream_options" not in captured_kwargs
    assert captured_kwargs.get("stream") is True
    assert captured_kwargs.get("model") == "gemini-3.6-flash"

    async for _ in gemini_prov.stream(messages=messages, model="nexa-reasoning"):
        pass
    assert captured_kwargs.get("model") == "gemini-3.6-flash"

    async for _ in gemini_prov.stream(messages=messages, model="nexa-fast"):
        pass
    assert captured_kwargs.get("model") == "gemini-3.6-flash"

    # Now verify that OpenAI requests DO include stream_options
    openai_prov = OpenAIProvider(
        api_key="fake-openai-key",
        base_url="https://api.openai.com/v1",
        provider_name="openai",
    )
    openai_captured = {}

    async def fake_openai_create(**kwargs):
        nonlocal openai_captured
        openai_captured = kwargs
        async def empty_stream():
            if False:
                yield None
        return empty_stream()

    openai_prov.client.chat.completions.create = fake_openai_create
    async for _ in openai_prov.stream(messages=messages, model="gpt-4o"):
        pass

    assert "stream_options" in openai_captured
    assert openai_captured["stream_options"] == {"include_usage": True}


@pytest.mark.asyncio
async def test_vision_provider_gemini_configuration(monkeypatch):
    """Verify get_vision_provider configures Gemini correctly while preserving OpenAI."""
    monkeypatch.setattr(settings, "VISION_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-gemini-vision-key")
    monkeypatch.setattr(settings, "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
    monkeypatch.setattr(settings, "VISION_MODEL", "gemini-3.6-flash")

    prov = get_vision_provider()
    assert isinstance(prov, OpenAIVisionProvider)
    assert prov.provider_name == "gemini"
    assert prov.default_model == "gemini-3.6-flash"
    assert "generativelanguage.googleapis.com" in prov.base_url

    # Fallback to mock when key is empty
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    mock_vision = get_vision_provider()
    assert isinstance(mock_vision, MockVisionProvider)


@pytest.mark.asyncio
async def test_embedding_provider_resolution(monkeypatch):
    """Verify Gemini and OpenAI embedding provider factories."""
    # 1. Gemini embedding provider
    monkeypatch.setattr(settings, "EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-gemini-embed-key")
    monkeypatch.setattr(settings, "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
    monkeypatch.setattr(settings, "EMBEDDING_MODEL", "gemini-embedding-001")

    embed_prov = get_embedding_provider()
    assert isinstance(embed_prov, GeminiEmbeddingProvider)
    assert embed_prov.model == "gemini-embedding-001"

    # 2. OpenAI embedding provider
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-openai-key")
    openai_embed = get_embedding_provider("openai")
    assert isinstance(openai_embed, OpenAIEmbeddingProvider)
    assert openai_embed.model == "text-embedding-3-small"

    # 3. Mock embedding provider when keys missing
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    mock_embed = get_embedding_provider()
    assert isinstance(mock_embed, MockEmbeddingProvider)


@pytest.mark.asyncio
async def test_speech_stt_remains_independent(monkeypatch):
    """Verify speech STT remains completely independent of Gemini."""
    # When OPENAI_API_KEY is not configured -> Mock STT
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    stt_mock = get_speech_provider()
    assert isinstance(stt_mock, MockSTTProvider)

    # When OPENAI_API_KEY is set -> OpenAISTTProvider
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-real-openai-key")
    monkeypatch.setattr(settings, "STT_PROVIDER", "openai")
    stt_openai = get_speech_provider()
    assert isinstance(stt_openai, OpenAISTTProvider)
    assert stt_openai.model_name == "whisper-1"
