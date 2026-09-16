"""Embedding Provider abstraction for vector generation."""

from abc import ABC, abstractmethod
import hashlib
import math
import re
from typing import List, Optional

from app.core.config import settings


class BaseEmbeddingProvider(ABC):
    """Abstract interface for embedding generation."""

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generate vector embedding for input text string."""
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a list of text strings."""
        pass


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """Deterministic Mock Embedding Provider producing normalized 1536-dim vectors."""

    DIMENSION = 1536

    def _text_to_vector(self, text: str) -> List[float]:
        clean = text.lower().strip()
        words = re.findall(r"\b\w+\b", clean)

        # Generate a seed from MD5 hash of text
        seed_hash = hashlib.md5(clean.encode("utf-8")).digest()
        
        vec = [0.0] * self.DIMENSION
        for i in range(self.DIMENSION):
            byte_val = seed_hash[i % len(seed_hash)]
            val = (byte_val / 255.0) * 2.0 - 1.0
            vec[i] = val

        # Enrich vector dimensions with word frequencies
        for w in words:
            w_hash = int(hashlib.sha256(w.encode("utf-8")).hexdigest()[:8], 16)
            idx = w_hash % self.DIMENSION
            vec[idx] += 1.5

        # L2 Normalize
        magnitude = math.sqrt(sum(v * v for v in vec))
        if magnitude > 0:
            vec = [v / magnitude for v in vec]

        return vec

    async def embed_text(self, text: str) -> List[float]:
        return self._text_to_vector(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self._text_to_vector(t) for t in texts]


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """OpenAI Embedding Provider wrapping text-embedding-3-small."""

    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1", model: str = "text-embedding-3-small"):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def embed_text(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        response = await self.client.embeddings.create(
            model=self.model,
            input=texts,
        )
        return [data.embedding for data in response.data]


def get_embedding_provider(provider_name: Optional[str] = None) -> BaseEmbeddingProvider:
    """Factory function resolving active BaseEmbeddingProvider."""
    target = (provider_name or settings.AI_PROVIDER).lower()
    api_key = settings.OPENAI_API_KEY

    if target == "mock" or not api_key or api_key.strip() in ("", "mock", "your-secret-key"):
        return MockEmbeddingProvider()

    return OpenAIEmbeddingProvider(
        api_key=api_key,
        base_url=settings.OPENAI_BASE_URL,
    )
