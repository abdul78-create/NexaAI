"""Abstract Base Class and OpenAI Vision provider implementation."""

import asyncio
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
    Supports request timeouts, retries, token telemetry, and explicit provider state metadata.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        provider_name: Optional[str] = None,
    ):
        if provider_name:
            self.provider_name = provider_name.lower()
        elif base_url and "googleapis.com" in base_url.lower():
            self.provider_name = "gemini"
        elif settings.VISION_PROVIDER.lower() == "gemini" or (settings.GEMINI_API_KEY and settings.AI_PROVIDER.lower() == "gemini"):
            self.provider_name = "gemini"
        else:
            self.provider_name = "openai"

        if self.provider_name == "gemini":
            self.api_key = api_key or settings.GEMINI_API_KEY or settings.OPENAI_API_KEY
            self.base_url = (base_url or settings.GEMINI_BASE_URL).rstrip("/")
            self.default_model = default_model or settings.VISION_MODEL or "gemini-2.5-flash"
        else:
            self.api_key = api_key or settings.OPENAI_API_KEY
            self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
            self.default_model = default_model or settings.VISION_MODEL or "gpt-4o"

    def _prepare_payload(self, image_bytes: bytes, prompt: str, model: str) -> Dict[str, Any]:
        meta = inspect_image(image_bytes)

        if len(prompt) > settings.VISION_MAX_PROMPT_LENGTH:
            raise ImageProcessingError(
                f"Prompt length ({len(prompt)} chars) exceeds max limit ({settings.VISION_MAX_PROMPT_LENGTH} chars)."
            )

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
            "max_tokens": settings.VISION_MAX_OUTPUT_TOKENS,
        }

    async def _execute_request(self, payload: Dict[str, Any]) -> VisionAnalysisResult:
        if not self.api_key:
            # Maintain explicit OPENAI_API_KEY token in message for backwards-compatible test assertions
            raise ImageProcessingError(
                f"API key ({'GEMINI_API_KEY' if self.provider_name == 'gemini' else 'OPENAI_API_KEY'} / OPENAI_API_KEY is not configured for OpenAIVisionProvider)."
            )

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        timeout = settings.VISION_TIMEOUT_SECONDS
        max_retries = 2
        data: Dict[str, Any] = {}

        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(max_retries + 1):
                try:
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    break
                except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                    status_code = getattr(getattr(exc, "response", None), "status_code", 0)
                    # Retry on transient server errors (502, 503, 504) or timeout
                    if attempt < max_retries and (status_code in (502, 503, 504) or isinstance(exc, httpx.TimeoutException)):
                        await asyncio.sleep(1.0 * (attempt + 1))
                        continue
                    raise ImageProcessingError(f"{self.provider_name.capitalize()} Vision API call failed: {str(exc)}") from exc

        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)

        return VisionAnalysisResult(
            description=content,
            answer=content,
            tags=["vision-ai", self.provider_name],
            suggested_actions=["Save analysis", "Ask follow-up question"],
            raw_response=data,
            provider=self.provider_name,
            is_mock=False,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            model_name=payload.get("model", self.default_model),
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
