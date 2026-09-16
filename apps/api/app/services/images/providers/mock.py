"""Mock Vision AI Provider implementation for tests and offline development."""

from typing import Optional

from app.services.images.base import (
    VisionAnalysisResult,
)
from app.services.images.preprocessing import inspect_image
from app.services.images.providers.vision import BaseVisionProvider


class MockVisionProvider(BaseVisionProvider):
    """
    Mock Vision AI Provider.
    Returns rich visual analysis and answers without external network overhead or API key requirements.
    """

    async def describe_image(
        self,
        image_bytes: bytes,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        meta = inspect_image(image_bytes)
        desc = (
            f"The image is a {meta.format} file measuring {meta.width}x{meta.height} pixels with an aspect ratio of {meta.aspect_ratio}. "
            "Visual inspection reveals a clean, high-contrast digital asset featuring structured elements, clear typography, and harmonious color composition."
        )

        return VisionAnalysisResult(
            description=desc,
            answer=desc,
            tags=["digital-graphic", "high-quality", f"aspect-{meta.aspect_ratio}"],
            objects_detected=["text-block", "graphic-element", "header-banner"],
            suggested_actions=["Extract OCR text", "Enhance contrast for print", "Convert format to WebP"],
            raw_response={"mock": True, "provider": "mock-vision"},
        )

    async def answer_image_question(
        self,
        image_bytes: bytes,
        question: str,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        meta = inspect_image(image_bytes)
        answer = (
            f"Based on visual context from the {meta.width}x{meta.height} image: "
            f"Regarding '{question}', the image shows a clear digital component layout with prominent headers and readable text items."
        )

        return VisionAnalysisResult(
            description=answer,
            answer=answer,
            tags=["q-and-a", "visual-inference"],
            objects_detected=["question-target", "layout-container"],
            suggested_actions=["Copy answer", "Perform OCR"],
            raw_response={"mock": True, "question": question},
        )

    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: Optional[str] = None,
        model: Optional[str] = None,
    ) -> VisionAnalysisResult:
        meta = inspect_image(image_bytes)
        analysis_desc = (
            f"Comprehensive analysis of {meta.width}x{meta.height} image: "
            + (f"Custom prompt analysis: {prompt}. " if prompt else "")
            + "The image exhibits balanced composition, sharp detail, and structured information layout."
        )

        return VisionAnalysisResult(
            description=analysis_desc,
            answer=analysis_desc,
            tags=["comprehensive-analysis", "structure", "nexa-ai-vision"],
            objects_detected=["ui-container", "typography", "iconography"],
            suggested_actions=["Run document enhancement", "Run quality check"],
            raw_response={"mock": True, "prompt": prompt},
        )
