"""Regression tests for Gemini 3.6 Flash streaming pipeline, SSE token forwarding,
guaranteed message_end event, empty stream, 503 retry/error handling, server timeout,
and partial content preservation.
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, patch
from openai import InternalServerError, RateLimitError, APIError

from app.core.config import settings
from app.services.ai.base import ChatMessagePayload, StreamEvent
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.orchestrator import MultimodalAIOrchestrator


class DummyUsage:
    prompt_tokens = 15
    completion_tokens = 25


class DummyDelta:
    def __init__(self, content=None, reasoning_content=None):
        self.content = content
        self.reasoning_content = reasoning_content


class DummyChoice:
    def __init__(self, delta=None, finish_reason=None):
        self.delta = delta or DummyDelta()
        self.finish_reason = finish_reason


class DummyChunk:
    def __init__(self, choices=None, usage=None):
        self.choices = choices or []
        self.usage = usage


@pytest.mark.asyncio
async def test_gemini_36_streaming_chunks_content():
    """Verify Gemini 3.6 streaming chunks with content and finish_reason."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    async def mock_create(**kwargs):
        async def stream():
            yield DummyChunk(choices=[DummyChoice(delta=DummyDelta(content="Hello "))])
            yield DummyChunk(choices=[DummyChoice(delta=DummyDelta(content="world!"))])
            yield DummyChunk(choices=[DummyChoice(delta=DummyDelta(), finish_reason="stop")], usage=DummyUsage())
        return stream()

    prov.client.chat.completions.create = mock_create
    messages = [ChatMessagePayload(role="user", content="Hi")]
    events = [ev async for ev in prov.stream(messages=messages, model="nexa-standard")]

    assert events[0].event == "message_start"
    assert events[1].event == "token"
    assert events[1].data["text"] == "Hello "
    assert events[2].event == "token"
    assert events[2].data["text"] == "world!"
    assert events[3].event == "usage"
    assert events[3].data["input_tokens"] == 15
    assert events[3].data["output_tokens"] == 25
    assert events[4].event == "message_end"
    assert events[4].data["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_gemini_36_reasoning_content_fallback():
    """Verify reasoning_content is captured when content is None (Gemini thinking mode)."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    async def mock_create(**kwargs):
        async def stream():
            yield DummyChunk(choices=[DummyChoice(delta=DummyDelta(content=None, reasoning_content="Thinking step 1"))])
            yield DummyChunk(choices=[DummyChoice(delta=DummyDelta(content="Final answer"))])
            yield DummyChunk(choices=[DummyChoice(delta=DummyDelta(), finish_reason="stop")])
        return stream()

    prov.client.chat.completions.create = mock_create
    messages = [ChatMessagePayload(role="user", content="Reason about this")]
    tokens = [ev.data["text"] async for ev in prov.stream(messages=messages, model="nexa-standard") if ev.event == "token"]

    assert "Thinking step 1" in tokens
    assert "Final answer" in tokens


@pytest.mark.asyncio
async def test_guaranteed_message_end_on_empty_stream():
    """Verify message_end is ALWAYS emitted even if the stream yields 0 chunks."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    async def mock_create(**kwargs):
        async def empty_stream():
            if False:
                yield None
        return empty_stream()

    prov.client.chat.completions.create = mock_create
    messages = [ChatMessagePayload(role="user", content="Hello")]
    events = [ev async for ev in prov.stream(messages=messages, model="nexa-standard")]

    assert events[0].event == "message_start"
    assert events[-1].event == "message_end"
    assert events[-1].data["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_provider_503_internal_server_error_handling():
    """Verify provider 503 error is translated to PROVIDER_UNAVAILABLE error event."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    import httpx
    fake_request = httpx.Request("POST", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
    fake_response = httpx.Response(503, request=fake_request, text="The model is overloaded. Please try again later.")

    async def failing_create(**kwargs):
        raise InternalServerError(
            message="The model is overloaded. Please try again later.",
            response=fake_response,
            body={"error": {"code": 503, "message": "Service Unavailable"}},
        )

    prov.client.chat.completions.create = failing_create
    messages = [ChatMessagePayload(role="user", content="Hello")]
    events = [ev async for ev in prov.stream(messages=messages, model="nexa-standard")]

    assert len(events) == 2
    assert events[0].event == "message_start"
    assert events[1].event == "error"
    assert events[1].data["code"] == "PROVIDER_UNAVAILABLE"
    assert "503" in events[1].data["message"]


@pytest.mark.asyncio
async def test_provider_429_rate_limit_handling():
    """Verify provider 429 rate limit is caught and structured cleanly."""
    prov = OpenAIProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        provider_name="gemini",
    )

    import httpx
    fake_request = httpx.Request("POST", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
    fake_response = httpx.Response(429, request=fake_request, text="Quota exceeded.")

    async def failing_create(**kwargs):
        raise RateLimitError(
            message="Rate limit exceeded",
            response=fake_response,
            body={"error": {"code": 429, "message": "Rate limit exceeded"}},
        )

    prov.client.chat.completions.create = failing_create
    messages = [ChatMessagePayload(role="user", content="Hello")]
    events = [ev async for ev in prov.stream(messages=messages, model="nexa-standard")]

    assert events[1].event == "error"
    assert events[1].data["code"] == "RATE_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_orchestrator_sse_forwarding_and_completion(async_db):
    """Verify orchestrator properly formats SSE tokens and emits guaranteed message_end."""
    from app.db.models.user import User
    import uuid
    user = User(
        id=uuid.uuid4(),
        email=f"orch_{uuid.uuid4().hex[:8]}@example.com",
        display_name="Orchestrator User",
        hashed_password="hashed_pass_test",
        is_active=True,
        is_verified=True,
    )
    async_db.add(user)
    await async_db.commit()

    orchestrator = MultimodalAIOrchestrator(async_db)

    class MockProvider:
        provider_name = "gemini"

        async def stream(self, messages, model, temperature=None):
            yield StreamEvent(event="message_start", data={"model": model})
            yield StreamEvent(event="token", data={"text": "Hello"})
            yield StreamEvent(event="token", data={"text": " from NexaAI!"})
            yield StreamEvent(event="usage", data={"input_tokens": 5, "output_tokens": 10})
            yield StreamEvent(event="message_end", data={"finish_reason": "stop"})

    with patch("app.services.ai.orchestrator.get_ai_provider", return_value=MockProvider()):
        frames = []
        async for frame in orchestrator.generate_multimodal_sse_stream(
            user_id=user.id,
            conversation_id=None,
            user_prompt="Hello",
            model_id="nexa-standard",
        ):
            frames.append(frame)

        text = "".join(frames)
        assert "event: message_start" in text
        assert "event: token" in text
        assert "Hello" in text
        assert " from NexaAI!" in text
        assert "event: message_end" in text
        assert '"finish_reason": "stop"' in text


@pytest.mark.asyncio
async def test_orchestrator_server_side_timeout(async_db, monkeypatch):
    """Verify orchestrator bounds streaming with a timeout and emits STREAMING_TIMEOUT error."""
    from app.db.models.user import User
    import uuid
    user = User(
        id=uuid.uuid4(),
        email=f"timeout_{uuid.uuid4().hex[:8]}@example.com",
        display_name="Timeout User",
        hashed_password="hashed_pass_test",
        is_active=True,
        is_verified=True,
    )
    async_db.add(user)
    await async_db.commit()

    orchestrator = MultimodalAIOrchestrator(async_db)
    monkeypatch.setattr(settings, "AI_STREAM_TIMEOUT_SECONDS", 0.5)

    class StallingProvider:
        provider_name = "gemini"

        async def stream(self, messages, model, temperature=None):
            yield StreamEvent(event="token", data={"text": "Partial start..."})
            await asyncio.sleep(2.0)  # Exceeds the 0.5s timeout
            yield StreamEvent(event="token", data={"text": "Never reached"})

    with patch("app.services.ai.orchestrator.get_ai_provider", return_value=StallingProvider()):
        frames = []
        async for frame in orchestrator.generate_multimodal_sse_stream(
            user_id=user.id,
            conversation_id=None,
            user_prompt="Timeout test",
            model_id="nexa-standard",
        ):
            frames.append(frame)

        text = "".join(frames)
        assert "event: token" in text
        assert "Partial start..." in text
        assert "event: error" in text
        assert "STREAMING_TIMEOUT" in text
