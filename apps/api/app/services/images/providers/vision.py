"""Abstract Base Class and OpenAI Vision provider implementation."""

import base64
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings
from app.services.images.base import (
    VisionAnalysisResult,
    ImageProcessingError,
)
from app.services.images.preprocessing import inspect_image


class BaseVisionProvider(ABC):
    """Abstract base class for Vision AI providers."""

    @abstractmethod
    async def describe_image(
        self,
        image_bytes: bytes,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        """Generate a visual description of the image content."""
        pass

    @abstractmethod
    async def answer_image_question(
        self,
        image_bytes: bytes,
        question: str,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        """Answer a question about the image."""
        pass

    @abstractmethod
    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: Optional[str] = None,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        """Perform comprehensive visual analysis based on optional prompt instructions."""
        pass


class OpenAIVisionProvider(BaseVisionProvider):
    """
    OpenAI-compatible Vision AI Provider.
    Encodes image bytes as base64 data URLs and transmits requests to OpenAI vision models.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.default_model = default_model or settings.OPENAI_MODEL or "gpt-4o"

    def _prepare_payload(self, image_bytes: bytes, prompt: str, model: str) -> Dict[str, Any]:
        meta = inspect_image(image_bytes)
        b64_data = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{meta.mime_type};base64,{b64_data}"

        return {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url, "detail": "auto"},
                        },
                    ],
                }
            ],
            "max_tokens": 1000,
        }

    async def _execute_request(self, payload: Dict[str, Any]) -> VisionAnalysisResult:
        if not self.api_key:
            raise ImageProcessingError("OPENAI_API_KEY is not configured for OpenAIVisionProvider.")

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
            except Exception as exc:
                raise ImageProcessingError(f"OpenAI Vision API call failed: {str(exc)}") from exc

        content = data["choices"][0]["message"]["content"]
        return VisionAnalysisResult(
            description=content,
            answer=content,
            tags=["vision-ai", "openai"],
            suggested_actions=["Save analysis", "Ask follow-up question"],
            raw_response=data,
        )

    async def describe_image(
        self,
        image_bytes: bytes,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        model_to_use = model or self.default_model
        prompt = "Describe this image in detail, including key visual elements, objects, colors, and layout."
        payload = self._prepare_payload(image_bytes, prompt, model_to_use)
        res = await self._execute_request(payload)
        res.description = res.answer or prompt
        return res

    async def answer_image_question(
        self,
        image_bytes: bytes,
        question: str,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        model_to_use = model or self.default_model
        payload = self._prepare_payload(image_bytes, question, model_to_use)
        return await self._execute_request(payload)

    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: Optional[str] = None,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        model_to_use = model or self.default_model
        effective_prompt = prompt or "Analyze this image and list key findings, visual structure, and context."
        payload = self._prepare_payload(image_bytes, effective_prompt, model_to_use)
        return await self._execute_request(payload)
