"""OpenAI Whisper Speech-to-Text provider implementation for NexaAI."""

import asyncio
import time
from typing import Optional

import httpx

from app.core.config import settings
from app.services.speech.base import BaseSTTProvider, SpeechProcessingError, TranscriptionResult


class OpenAISTTProvider(BaseSTTProvider):
    """
    OpenAI Speech-to-Text (Whisper API) provider.
    Transmits audio bytes via multipart request to the OpenAI audio transcriptions endpoint.
    Handles timeouts, exponential backoff for transient errors, and sanitizes API errors.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.STT_MODEL or "whisper-1"

    async def transcribe(
        self,
        *,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> TranscriptionResult:
        if not self.api_key or self.api_key.strip() in ("", "mock-key", "your-openai-api-key"):
            raise SpeechProcessingError(
                message="OpenAI API key is not configured for Speech-to-Text",
                code="provider_not_configured",
                status_code=400,
            )

        if prompt and len(prompt) > settings.AUDIO_MAX_PROMPT_LENGTH:
            raise SpeechProcessingError(
                message=f"Prompt exceeds maximum length of {settings.AUDIO_MAX_PROMPT_LENGTH} characters",
                code="prompt_too_long",
                status_code=400,
            )

        start_time = time.time()
        url = f"{self.base_url}/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        data = {"model": self.model_name}
        if language:
            data["language"] = language
        if prompt:
            data["prompt"] = prompt

        files = {
            "file": (filename or "audio.wav", audio_bytes, content_type or "audio/wav")
        }

        timeout = httpx.Timeout(settings.STT_TIMEOUT_SECONDS, connect=10.0)
        max_retries = 2
        last_exc: Optional[Exception] = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        data=data,
                        files=files,
                    )

                if response.status_code == 200:
                    result_json = response.json()
                    transcript_text = result_json.get("text", "").strip()
                    detected_lang = result_json.get("language") or language or "en"
                    audio_duration = result_json.get("duration")

                    elapsed_ms = int((time.time() - start_time) * 1000)

                    return TranscriptionResult(
                        text=transcript_text,
                        language=detected_lang,
                        provider="openai",
                        model_name=self.model_name,
                        is_mock=False,
                        duration_ms=elapsed_ms,
                        audio_duration_seconds=float(audio_duration) if audio_duration else None,
                    )

                # Unrecoverable error codes (auth, client error, bad request)
                if response.status_code in (400, 401, 403, 422):
                    error_detail = "Invalid request or configuration"
                    try:
                        err_data = response.json()
                        if isinstance(err_data, dict) and "error" in err_data:
                            error_detail = err_data["error"].get("message", error_detail)
                    except Exception:
                        pass

                    raise SpeechProcessingError(
                        message=f"Speech provider error: {error_detail}",
                        code="provider_auth_error" if response.status_code in (401, 403) else "invalid_audio_request",
                        status_code=400,
                    )

                # Transient server errors (502, 503, 504, 429) -> retry with backoff
                if response.status_code in (429, 502, 503, 504) and attempt < max_retries:
                    await asyncio.sleep(1.0 * (2 ** attempt))
                    continue

                # Fallback for other status codes
                raise SpeechProcessingError(
                    message=f"Speech provider HTTP failure (status {response.status_code})",
                    code="provider_http_error",
                    status_code=502,
                )

            except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as e:
                last_exc = e
                if attempt < max_retries:
                    await asyncio.sleep(1.0 * (2 ** attempt))
                    continue
                break
            except SpeechProcessingError:
                raise
            except Exception as e:
                last_exc = e
                break

        raise SpeechProcessingError(
            message=f"Speech-to-Text provider request failed: {str(last_exc) if last_exc else 'Timeout'}",
            code="provider_request_failed",
            status_code=504 if isinstance(last_exc, httpx.TimeoutException) else 502,
        )
