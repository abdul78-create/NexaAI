"""Comprehensive regression tests for Gemini 3.6 Flash migration,
model alias resolutions, streaming response formatting, error handling,
and chat session conversation ID safety.
"""

import pytest
from unittest.mock import AsyncMock, patch
from app.core.config import settings
from app.services.ai.base import ChatMessagePayload, StreamEvent
from app.services.ai.capabilities import get_model_capabilities
from app.services.ai.factory import get_ai_provider
from app.services.ai.mode_router import ChatMode, resolve_model_for_mode
from app.services.ai.openai_provider import OpenAIProvider


@pytest.mark.asyncio
async def test_nexa_standard_resolves_to_supported_gemini():
    """1. nexa-standard resolves to gemini-3.6-flash."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )
    assert prov._resolve_model("nexa-standard") == "gemini-3.6-flash"
    assert resolve_model_for_mode(ChatMode.STANDARD) == "gemini-3.6-flash"


@pytest.mark.asyncio
async def test_nexa_high_resolves_to_supported_gemini():
    """2. nexa-high resolves to gemini-3.6-flash."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )
    assert prov._resolve_model("nexa-high") == "gemini-3.6-flash"
    assert resolve_model_for_mode(ChatMode.HIGH) == "gemini-3.6-flash"


@pytest.mark.asyncio
async def test_nexa_reasoning_resolves_to_supported_gemini():
    """3. nexa-reasoning resolves to gemini-3.6-flash."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )
    assert prov._resolve_model("nexa-reasoning") == "gemini-3.6-flash"
    assert prov._resolve_model("nexa-pro") == "gemini-3.6-flash"
    assert prov._resolve_model("nexa-ultra") == "gemini-3.6-flash"


@pytest.mark.asyncio
async def test_legacy_gemini_models_normalized():
    """Verify legacy 2.5/1.5 models are automatically mapped to gemini-3.6-flash."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )
    assert prov._resolve_model("gemini-2.5-flash") == "gemini-3.6-flash"
    assert prov._resolve_model("gemini-2.5-pro") == "gemini-3.6-flash"
    assert prov._resolve_model("gemini-1.5-flash") == "gemini-3.6-flash"
    assert prov._resolve_model("gemini-1.5-pro") == "gemini-3.6-flash"


@pytest.mark.asyncio
async def test_gemini_request_configuration():
    """8. Verify Gemini request parameters: no stream_options, model=gemini-3.6-flash."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )
    captured = {}

    async def fake_create(**kwargs):
        nonlocal captured
        captured = kwargs
        async def mock_stream():
            if False:
                yield None
        return mock_stream()

    prov.client.chat.completions.create = fake_create
    messages = [ChatMessagePayload(role="user", content="Test prompt")]
    async for _ in prov.stream(messages=messages, model="nexa-standard", temperature=0.7):
        pass

    assert captured.get("model") == "gemini-3.6-flash"
    assert captured.get("stream") is True
    assert captured.get("temperature") == 0.7
    assert "stream_options" not in captured


@pytest.mark.asyncio
async def test_gemini_streaming_response():
    """4. Verify streaming tokens and message_end generation."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    class MockDelta:
        content = "Hello world"

    class MockChoice:
        delta = MockDelta()
        finish_reason = None

    class MockChunk:
        choices = [MockChoice()]
        usage = None

    async def fake_create(**kwargs):
        async def mock_stream():
            yield MockChunk()
        return mock_stream()

    prov.client.chat.completions.create = fake_create
    messages = [ChatMessagePayload(role="user", content="Hello")]
    events = []
    async for ev in prov.stream(messages=messages, model="nexa-standard"):
        events.append(ev)

    assert len(events) >= 3
    assert events[0].event == "message_start"
    assert events[1].event == "token"
    assert events[1].data["text"] == "Hello world"
    assert events[-1].event == "message_end"


@pytest.mark.asyncio
async def test_gemini_36_capabilities():
    """Verify capabilities catalog registers gemini-3.6-flash with full multimodal support."""
    cap = get_model_capabilities("gemini-3.6-flash")
    assert cap.model_id == "gemini-3.6-flash"
    assert cap.text is True
    assert cap.vision is True
    assert cap.streaming is True
    assert cap.documents is True
    assert cap.max_context_tokens >= 1000000


@pytest.mark.asyncio
async def test_provider_error_handling():
    """5. Verify provider handles upstream errors gracefully as Error stream events."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    async def failing_create(**kwargs):
        raise RuntimeError("API key invalid or model unavailable")

    prov.client.chat.completions.create = failing_create
    messages = [ChatMessagePayload(role="user", content="Hello")]
    events = []
    async for ev in prov.stream(messages=messages, model="nexa-standard"):
        events.append(ev)

    assert len(events) >= 2
    assert events[0].event == "message_start"
    assert events[1].event == "error"
    assert "API key invalid or model unavailable" in events[1].data["message"]
