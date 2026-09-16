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
    
    # Generic fallback for unknown or OpenAI-compatible models
    return ModelCapabilities(
        model_id=model_id,
        name=model_id,
        text=True,
        vision="vision" in model_id.lower() or "4o" in model_id.lower(),
        audio=False,
        documents=True,
        streaming=True,
        max_context_tokens=16384,
    )
