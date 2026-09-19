"""Zero-config Mock AI Provider for testing and keyless development."""

import asyncio
import random
from typing import AsyncIterator, Dict, List, Optional, Any

from app.services.ai.base import (
    BaseAIProvider,
    ChatMessagePayload,
    CompletionResult,
    StreamEvent,
)


class MockAIProvider(BaseAIProvider):
    """Mock AI Provider for zero-config offline execution, guest mode, and pytest testing."""

    provider_name: str = "mock"

    SUPPORTED_MODELS = [
        {
            "id": "nexa-ultra",
            "name": "Nexa Ultra 4.5",
            "tagline": "Most capable model for complex reasoning and deep tasks",
            "description": "High-intelligence model engineered for complex problem solving, architecture, and code analysis.",
            "badge": "Flagship",
            "speed": "Deep",
            "reasoning": "Maximum",
            "contextWindow": "128k",
            "isAvailable": True,
        },
        {
            "id": "nexa-standard",
            "name": "Nexa Standard 4.0",
            "tagline": "Balanced for everyday queries, summaries, and chat",
            "description": "Fast and intelligent model ideal for general assistant tasks and quick answers.",
            "badge": "Popular",
            "speed": "Fast",
            "reasoning": "Standard",
            "contextWindow": "64k",
            "isAvailable": True,
        },
        {
            "id": "nexa-coder",
            "name": "Nexa Coder Pro",
            "tagline": "Specialized in full-stack code generation and debugging",
            "description": "Fine-tuned for Python, TypeScript, SQL, and DevOps automation workflows.",
            "badge": "Code",
            "speed": "Ultra Fast",
            "reasoning": "Advanced",
            "contextWindow": "128k",
            "isAvailable": True,
        },
    ]

    def _generate_mock_text(self, prompt: str, model: str) -> str:
        prompt_lower = prompt.lower()
        if "python" in prompt_lower or "code" in prompt_lower or "fastapi" in prompt_lower:
            return (
                f"Here is an efficient solution using Python and FastAPI for model `{model}`:\n\n"
                "```python\n"
                "from fastapi import FastAPI\n\n"
                "app = FastAPI(title='NexaAI Service')\n\n"
                "@app.get('/health')\n"
                "async def health_check():\n"
                "    return {'status': 'healthy', 'engine': 'NexaAI Core'}\n"
                "```\n\n"
                "This implementation provides asynchronous performance and typed Pydantic validation."
            )
        elif "explain" in prompt_lower or "what is" in prompt_lower:
            return (
                f"As NexaAI running `{model}`, here is a clear breakdown:\n\n"
                "1. **Core Concept**: Modern AI systems combine high-dimensional vector representations with attention mechanisms.\n"
                "2. **Streaming Execution**: Tokens are streamed incrementally to optimize user interface responsiveness.\n"
                "3. **Security Boundary**: API keys are isolated in backend environments to maintain security."
            )
        else:
            return (
                f"Thank you for your message! As an AI assistant powered by NexaAI ({model}), "
                f"I am ready to help you analyze data, write clean code, or explore complex concepts. "
                f"You asked: '{prompt[:100]}'."
            )

    async def generate(
        self,
        messages: List[ChatMessagePayload],
        model: str,
        temperature: Optional[float] = None,
    ) -> CompletionResult:
        last_user_msg = next((m.content for m in reversed(messages) if m.role == "user"), "Hello")
        response_text = self._generate_mock_text(last_user_msg, model)
        input_tokens = max(1, len(last_user_msg) // 4)
        output_tokens = max(1, len(response_text) // 4)
        return CompletionResult(
            text=response_text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=model,
            finish_reason="stop",
        )

    async def stream(
        self,
        messages: List[ChatMessagePayload],
        model: str,
        temperature: Optional[float] = None,
    ) -> AsyncIterator[StreamEvent]:
        last_user_msg = next((m.content for m in reversed(messages) if m.role == "user"), "Hello")
        response_text = self._generate_mock_text(last_user_msg, model)
        input_tokens = max(1, len(last_user_msg) // 4)
        output_tokens = max(1, len(response_text) // 4)

        # 1. message_start event
        yield StreamEvent(
            event="message_start",
            data={"model": model},
        )

        # 2. Token chunks
        import re
        words = re.split(r'(\s+)', response_text)
        for word in words:
            if word:
                yield StreamEvent(
                    event="token",
                    data={"text": word},
                )
                await asyncio.sleep(0.01)

        # 3. usage event
        yield StreamEvent(
            event="usage",
            data={"input_tokens": input_tokens, "output_tokens": output_tokens},
        )

        # 4. message_end event
        yield StreamEvent(
            event="message_end",
            data={"finish_reason": "stop"},
        )

    async def list_models(self) -> List[Dict[str, Any]]:
        return self.SUPPORTED_MODELS
