"""Abstract Base AI Provider interface and data structures."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator, Dict, List, Optional, Any


@dataclass
class ChatMessagePayload:
    """Input message payload for AI providers."""
    role: str
    content: str


@dataclass
class CompletionResult:
    """Non-streaming completion result."""
    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    model: str = ""
    finish_reason: str = "stop"


@dataclass
class StreamEvent:
    """Server-Sent Event structure for streaming token chunks and metadata."""
    event: str
    data: Dict[str, Any] = field(default_factory=dict)


class BaseAIProvider(ABC):
    """Abstract base class for all NexaAI provider implementations."""

    @abstractmethod
    async def generate(
        self,
        messages: List[ChatMessagePayload],
        model: str,
        temperature: Optional[float] = None,
    ) -> CompletionResult:
        """Generate a complete non-streaming response."""
        pass

    @abstractmethod
    async def stream(
        self,
        messages: List[ChatMessagePayload],
        model: str,
        temperature: Optional[float] = None,
    ) -> AsyncIterator[StreamEvent]:
        """Generate a streaming response yielding SSE StreamEvent items."""
        pass

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """List models supported by this provider."""
        pass
