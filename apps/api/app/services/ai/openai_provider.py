"""OpenAI-compatible AI Provider integration supporting standard OpenAI, Ollama, vLLM, Groq, & DeepSeek."""

from typing import AsyncIterator, Dict, List, Optional, Any
from openai import (
    AsyncOpenAI,
    APIError,
    APIConnectionError,
    RateLimitError,
    AuthenticationError,
    InternalServerError,
)

from app.services.ai.base import (
    BaseAIProvider,
    ChatMessagePayload,
    CompletionResult,
    StreamEvent,
)


class OpenAIProvider(BaseAIProvider):
    """OpenAI-compatible AI Provider supporting Gemini, OpenAI, Ollama, vLLM, & Groq."""

    OPENAI_MODEL_MAP = {
        "nexa-standard": "gpt-4o-mini",
        "nexa-fast": "gpt-4o-mini",
        "nexa-coder": "gpt-4o-mini",
        "nexa-reasoning": "gpt-4o",
        "nexa-pro": "gpt-4o",
        "nexa-ultra": "gpt-4o",
    }

    GEMINI_MODEL_MAP = {
        "nexa-standard": "gemini-3.6-flash",
        "nexa-fast": "gemini-3.6-flash",
        "nexa-coder": "gemini-3.6-flash",
        "nexa-reasoning": "gemini-3.6-flash",
        "nexa-pro": "gemini-3.6-flash",
        "nexa-ultra": "gemini-3.6-flash",
        "nexa-high": "gemini-3.6-flash",
    }

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/",
        default_model: Optional[str] = None,
        timeout: float = 30.0,
        provider_name: Optional[str] = None,
    ):
        self.api_key = api_key
        if base_url:
            self.base_url = base_url if base_url.endswith("/") else f"{base_url}/"
        else:
            self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        self.timeout = timeout

        if provider_name:
            self.provider_name = provider_name.lower()
        elif "googleapis.com" in self.base_url.lower():
            self.provider_name = "gemini"
        else:
            self.provider_name = "openai"

        if default_model:
            self.default_model = default_model
        elif self.provider_name == "gemini":
            self.default_model = "gemini-3.6-flash"
        else:
            self.default_model = "gpt-4o-mini"

        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=self.base_url,
            timeout=timeout,
        )

    def _resolve_model(self, model: Optional[str]) -> str:
        if not model or model in ("default", ""):
            return self.default_model
        model_map = self.GEMINI_MODEL_MAP if self.provider_name == "gemini" else self.OPENAI_MODEL_MAP
        if model in model_map:
            return model_map[model]
        if self.provider_name == "gemini":
            if model in ("gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"):
                return "gemini-3.6-flash"
            if model.startswith("gemini-"):
                return model
        if self.provider_name == "openai" and (
            model.startswith("gpt-") or model.startswith("o1") or model.startswith("o3")
        ):
            return model
        return self.default_model

    async def generate(
        self,
        messages: List[ChatMessagePayload],
        model: str,
        temperature: Optional[float] = None,
    ) -> CompletionResult:
        resolved_model = self._resolve_model(model)
        formatted_msgs = [{"role": m.role, "content": m.content} for m in messages]
        kwargs: Dict[str, Any] = {
            "model": resolved_model,
            "messages": formatted_msgs,
        }
        if temperature is not None:
            kwargs["temperature"] = temperature

        try:
            response = await self.client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            usage = response.usage
            return CompletionResult(
                text=choice.message.content or "",
                input_tokens=usage.prompt_tokens if usage else 0,
                output_tokens=usage.completion_tokens if usage else 0,
                model=response.model or resolved_model,
                finish_reason=choice.finish_reason or "stop",
            )
        except Exception as e:
            raise RuntimeError(f"OpenAI completion error: {str(e)}") from e

    async def stream(
        self,
        messages: List[ChatMessagePayload],
        model: str,
        temperature: Optional[float] = None,
    ) -> AsyncIterator[StreamEvent]:
        resolved_model = self._resolve_model(model)
        formatted_msgs = [{"role": m.role, "content": m.content} for m in messages]
        kwargs: Dict[str, Any] = {
            "model": resolved_model,
            "messages": formatted_msgs,
            "stream": True,
        }
        # CRITICAL: Google's Gemini OpenAI-compatible endpoint rejects stream_options with 400 Bad Request.
        # Only include stream_options when targeting native OpenAI.
        if self.provider_name != "gemini" and "googleapis.com" not in self.base_url.lower():
            kwargs["stream_options"] = {"include_usage": True}
        if temperature is not None:
            kwargs["temperature"] = temperature

        yield StreamEvent(
            event="message_start",
            data={"model": resolved_model},
        )

        total_input_tokens = 0
        total_output_tokens = 0
        accumulated_chars = 0
        finish_reason = "stop"
        has_emitted_tokens = False

        try:
            stream = await self.client.chat.completions.create(**kwargs)
            async for chunk in stream:
                # Handle usage metadata chunk if provided by provider
                if hasattr(chunk, "usage") and chunk.usage:
                    total_input_tokens = getattr(chunk.usage, "prompt_tokens", None) or total_input_tokens
                    total_output_tokens = getattr(chunk.usage, "completion_tokens", None) or total_output_tokens

                if getattr(chunk, "choices", None) and len(chunk.choices) > 0:
                    choice = chunk.choices[0]
                    chunk_finish = getattr(choice, "finish_reason", None)
                    if chunk_finish:
                        finish_reason = chunk_finish

                    delta = getattr(choice, "delta", None)
                    if delta:
                        content = getattr(delta, "content", None)
                        # Fallback to reasoning_content if content is None (Gemini thinking / reasoning models)
                        if content is None:
                            content = getattr(delta, "reasoning_content", None)

                        if content:
                            has_emitted_tokens = True
                            accumulated_chars += len(content)
                            yield StreamEvent(
                                event="token",
                                data={"text": content},
                            )

            # Standard fallback estimation if provider doesn't report stream usage
            if total_input_tokens == 0:
                total_input_tokens = sum(max(1, len(m.content) // 4) for m in messages)
            if total_output_tokens == 0:
                total_output_tokens = max(1, accumulated_chars // 4) if has_emitted_tokens else 1

            yield StreamEvent(
                event="usage",
                data={"input_tokens": total_input_tokens, "output_tokens": total_output_tokens},
            )

            yield StreamEvent(
                event="message_end",
                data={"finish_reason": finish_reason or "stop"},
            )

        except AuthenticationError as e:
            yield StreamEvent(
                event="error",
                data={"code": "AUTHENTICATION_ERROR", "message": "Invalid or missing AI API Key."},
            )
        except RateLimitError as e:
            yield StreamEvent(
                event="error",
                data={"code": "RATE_LIMIT_EXCEEDED", "message": "AI provider rate limit exceeded (429). Please retry shortly."},
            )
        except InternalServerError as e:
            yield StreamEvent(
                event="error",
                data={"code": "PROVIDER_UNAVAILABLE", "message": "AI provider is temporarily overloaded (503 Service Unavailable). Please retry shortly."},
            )
        except APIConnectionError as e:
            yield StreamEvent(
                event="error",
                data={"code": "CONNECTION_ERROR", "message": "Failed to connect to AI provider service."},
            )
        except APIError as e:
            err_msg = getattr(e, "message", str(e))
            yield StreamEvent(
                event="error",
                data={"code": "PROVIDER_API_ERROR", "message": str(err_msg)},
            )
        except Exception as e:
            yield StreamEvent(
                event="error",
                data={"code": "AI_PROVIDER_ERROR", "message": f"Unexpected streaming failure: {str(e)}"},
            )

    async def list_models(self) -> List[Dict[str, Any]]:
        if self.provider_name == "gemini":
            return [
                {
                    "id": "nexa-ultra",
                    "name": "Nexa Ultra (Gemini 2.5 Pro)",
                    "tagline": "Most capable model for complex reasoning and deep analytical tasks",
                    "description": "Powered by Google Gemini 2.5 Pro for advanced multimodal problem solving.",
                    "badge": "Flagship",
                    "speed": "Deep",
                    "reasoning": "Maximum",
                    "contextWindow": "2M",
                    "isAvailable": True,
                },
                {
                    "id": "nexa-standard",
                    "name": "Nexa Standard (Gemini 2.5 Flash)",
                    "tagline": "Balanced for everyday queries, summaries, and chat",
                    "description": "Ultra-fast and intelligent model ideal for general assistant tasks.",
                    "badge": "Popular",
                    "speed": "Ultra Fast",
                    "reasoning": "Standard",
                    "contextWindow": "1M",
                    "isAvailable": True,
                },
                {
                    "id": "nexa-coder",
                    "name": "Nexa Coder Pro",
                    "tagline": "Specialized in full-stack code generation and debugging",
                    "description": "Optimized for programming, script generation, and system design.",
                    "badge": "Code",
                    "speed": "Ultra Fast",
                    "reasoning": "Advanced",
                    "contextWindow": "1M",
                    "isAvailable": True,
                },
            ]

        # Return standard NexaAI models mapped to backend OpenAI models
        return [
            {
                "id": "nexa-ultra",
                "name": "Nexa Ultra (GPT-4o)",
                "tagline": "Most capable model for complex reasoning and deep tasks",
                "description": "Powered by OpenAI GPT-4o for ultimate problem solving.",
                "badge": "Flagship",
                "speed": "Deep",
                "reasoning": "Maximum",
                "contextWindow": "128k",
                "isAvailable": True,
            },
            {
                "id": "nexa-standard",
                "name": "Nexa Standard (GPT-4o mini)",
                "tagline": "Balanced for everyday queries, summaries, and chat",
                "description": "Fast and intelligent model ideal for general assistant tasks.",
                "badge": "Popular",
                "speed": "Fast",
                "reasoning": "Standard",
                "contextWindow": "128k",
                "isAvailable": True,
            },
            {
                "id": "nexa-coder",
                "name": "Nexa Coder Pro",
                "tagline": "Specialized in full-stack code generation and debugging",
                "description": "Optimized for programming, script generation, and system design.",
                "badge": "Code",
                "speed": "Ultra Fast",
                "reasoning": "Advanced",
                "contextWindow": "128k",
                "isAvailable": True,
            },
        ]
