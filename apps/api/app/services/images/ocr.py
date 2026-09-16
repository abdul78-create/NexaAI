"""OCR Provider abstraction, Tesseract implementation, and Mock provider."""

import io
from abc import ABC, abstractmethod
from typing import Optional
from PIL import Image

from app.core.config import settings
from app.services.images.base import (
    OCRResult,
    OCRBoundingBox,
    ProviderNotConfiguredError,
    CorruptImageError,
)
from app.services.images.preprocessing import inspect_image

# Attempt optional pytesseract import
try:
    import pytesseract  # type: ignore
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


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
        detected language, word bounding box metadata, and provider status.
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
        meta = inspect_image(image_bytes)
        lang = language or settings.OCR_DEFAULT_LANGUAGE

        mock_text = (
            "NexaAI Architecture Overview\n"
            "High performance multimodal platform.\n"
            "Phase 12 Production OCR Active."
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
                text="Production",
                confidence=0.97,
                x_min=0.10,
                y_min=0.35,
                x_max=0.45,
                y_max=0.45,
            ),
            OCRBoundingBox(
                text="OCR",
                confidence=0.99,
                x_min=0.47,
                y_min=0.35,
                x_max=0.75,
                y_max=0.45,
            ),
        ]

        words = mock_text.split()

        return OCRResult(
            extracted_text=mock_text,
            confidence=0.96,
            language=lang,
            word_count=len(words),
            blocks=blocks,
            provider="mock",
            is_mock=True,
        )


class TesseractOCRProvider(BaseOCRProvider):
    """
    Real Tesseract OCR Provider using `pytesseract`.
    Extracts text, word confidence scores, and bounding box coordinates.
    Gracefully raises ProviderNotConfiguredError if Tesseract is not installed on host.
    """

    async def extract_text(
        self,
        image_bytes: bytes,
        language: Optional[str] = None,
    ) -> OCRResult:
        if not PYTESSERACT_AVAILABLE:
            raise ProviderNotConfiguredError(
                "pytesseract library is not installed. Install pytesseract and Tesseract binary on the host."
            )

        meta = inspect_image(image_bytes)
        lang = language or settings.OCR_DEFAULT_LANGUAGE

        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            # Get detailed word data with confidence & coordinates
            data = pytesseract.image_to_data(pil_img, lang=lang, output_type=pytesseract.Output.DICT)
        except Exception as exc:
            # Catch TesseractNotFoundError or OS execution error
            raise ProviderNotConfiguredError(
                f"Tesseract OCR engine execution failed: {str(exc)}. Ensure Tesseract binary is installed."
            ) from exc

        extracted_words = []
        confidences = []
        blocks = []

        img_w, img_h = max(meta.width, 1), max(meta.height, 1)
        n_boxes = len(data.get("text", []))

        for i in range(n_boxes):
            word_text = data["text"][i].strip()
            conf = float(data["conf"][i])
            if word_text and conf > 0:
                extracted_words.append(word_text)
                conf_val = round(conf / 100.0, 4)
                confidences.append(conf_val)

                x = data["left"][i]
                y = data["top"][i]
                w = data["width"][i]
                h = data["height"][i]

                blocks.append(
                    OCRBoundingBox(
                        text=word_text,
                        confidence=conf_val,
                        x_min=round(x / img_w, 4),
                        y_min=round(y / img_h, 4),
                        x_max=round((x + w) / img_w, 4),
                        y_max=round((y + h) / img_h, 4),
                    )
                )

        full_text = " ".join(extracted_words)
        mean_conf = round(sum(confidences) / max(len(confidences), 1), 4)

        return OCRResult(
            extracted_text=full_text,
            confidence=mean_conf if full_text else 0.0,
            language=lang,
            word_count=len(extracted_words),
            blocks=blocks,
            provider="tesseract",
            is_mock=False,
        )
