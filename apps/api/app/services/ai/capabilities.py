"""Model Capabilities Registry for NexaAI Multimodal AI Engine."""

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class ModelCapabilities:
    """Capabilities and token limits of an AI model."""

    model_id: str
    name: str
    text: bool = True
    vision: bool = False
    audio: bool = False
    documents: bool = True
    streaming: bool = True
    max_context_tokens: int = 16384
    max_output_tokens: int = 4096


# Static registry of available models and their capabilities
MODEL_CAPABILITIES_REGISTRY: Dict[str, ModelCapabilities] = {
    "nexa-standard": ModelCapabilities(
        model_id="nexa-standard",
        name="Nexa Standard",
        text=True,
        vision=True,  # Vision support via OpenAI Vision or OCR fallback
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=16384,
    ),
    "nexa-pro": ModelCapabilities(
        model_id="nexa-pro",
        name="Nexa Pro (Reasoning)",
        text=True,
        vision=True,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=32768,
    ),
    "gpt-4o": ModelCapabilities(
        model_id="gpt-4o",
        name="GPT-4o (Omni)",
        text=True,
        vision=True,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=128000,
    ),
    "gpt-4o-mini": ModelCapabilities(
        model_id="gpt-4o-mini",
        name="GPT-4o Mini",
        text=True,
        vision=True,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=128000,
    ),
    "gemini-2.5-flash": ModelCapabilities(
        model_id="gemini-2.5-flash",
        name="Gemini 2.5 Flash",
        text=True,
        vision=True,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=1048576,
        max_output_tokens=8192,
    ),
    "gemini-2.5-pro": ModelCapabilities(
        model_id="gemini-2.5-pro",
        name="Gemini 2.5 Pro",
        text=True,
        vision=True,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=2097152,
        max_output_tokens=8192,
    ),
    "gemini-3.8-flash": ModelCapabilities(
        model_id="gemini-3.8-flash",
        name="Gemini 3.8 Flash",
        text=True,
        vision=True,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=1048576,
        max_output_tokens=8192,
    ),
    "gemini-1.5-flash": ModelCapabilities(
        model_id="gemini-1.5-flash",
        name="Gemini 1.5 Flash",
        text=True,
        vision=True,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=1048576,
        max_output_tokens=8192,
    ),
    "mock-model": ModelCapabilities(
        model_id="mock-model",
        name="Mock AI Model",
        text=True,
        vision=True,
        audio=True,
        documents=True,
        streaming=True,
        max_context_tokens=8192,
    ),
}


def get_model_capabilities(model_id: str) -> ModelCapabilities:
    """Retrieve capabilities for target model, defaulting to standard text+doc capabilities."""
    if model_id in MODEL_CAPABILITIES_REGISTRY:
        return MODEL_CAPABILITIES_REGISTRY[model_id]
    
    # Generic fallback: detect multimodal vision capability without fragile 4o-only checks
    m_lower = model_id.lower()
    is_vision = any(k in m_lower for k in ("vision", "4o", "gemini", "flash"))
    max_context = 1048576 if "gemini" in m_lower else 16384

    return ModelCapabilities(
        model_id=model_id,
        name=model_id,
        text=True,
        vision=is_vision,
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=max_context,
    )
