"""OCR Provider abstraction and Mock implementation."""

from abc import ABC, abstractmethod
from typing import Optional

from app.services.images.base import (
    OCRResult,
    OCRBoundingBox,
    CorruptImageError,
)
from app.services.images.preprocessing import inspect_image


class BaseOCRProvider(ABC):
    """Abstract Base Class for OCR providers."""

    @abstractmethod
    async def extract_text(
        self,
        image_bytes: bytes,
        language: Optional[str] = None,
    ) -> OCRResult:
        """
        Extract text from raw image bytes.

        Returns an OCRResult with extracted text, overall confidence,
        detected language, and word bounding box metadata.
        """
        pass


class MockOCRProvider(BaseOCRProvider):
    """
    Mock OCR Provider for offline development and automated testing.
    Provides deterministic structured text extraction from image data.
    """

    async def extract_text(
        self,
        image_bytes: bytes,
        language: Optional[str] = None,
    ) -> OCRResult:
        # Validate image format and sanity
        meta = inspect_image(image_bytes)
        lang = language or "en"

        mock_text = (
            "NexaAI Architecture Overview\n"
            "High performance multimodal platform.\n"
            "Phase 11 Image Intelligence Active."
        )

        blocks = [
            OCRBoundingBox(
                text="NexaAI",
                confidence=0.98,
                x_min=0.10,
                y_min=0.15,
                x_max=0.30,
                y_max=0.25,
            ),
            OCRBoundingBox(
                text="Architecture",
                confidence=0.96,
                x_min=0.32,
                y_min=0.15,
                x_max=0.60,
                y_max=0.25,
            ),
            OCRBoundingBox(
                text="Overview",
                confidence=0.95,
                x_min=0.62,
                y_min=0.15,
                x_max=0.85,
                y_max=0.25,
            ),
            OCRBoundingBox(
                text="Multimodal",
                confidence=0.97,
                x_min=0.10,
                y_min=0.35,
                x_max=0.45,
                y_max=0.45,
            ),
            OCRBoundingBox(
                text="Platform",
                confidence=0.99,
                x_min=0.47,
                y_min=0.35,
                x_max=0.75,
                y_max=0.45,
            ),
        ]

        words = mock_text.split()
        word_count = len(words)

        return OCRResult(
            extracted_text=mock_text,
            confidence=0.96,
            language=lang,
            word_count=word_count,
            blocks=blocks,
        )
