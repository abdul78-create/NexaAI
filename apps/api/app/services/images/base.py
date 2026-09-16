"""Base definitions, dataclasses, and custom exceptions for Image Intelligence."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


class ImageProcessingError(Exception):
    """Base exception for image processing failures."""
    pass


class CorruptImageError(ImageProcessingError):
    """Raised when an image payload cannot be decoded or is corrupt."""
    pass


class OversizedImageError(ImageProcessingError):
    """Raised when image pixel dimensions or size exceed security limits."""
    pass


class UnsupportedImageFormatError(ImageProcessingError):
    """Raised when an unsupported image format or MIME type is supplied."""
    pass


class ProviderNotConfiguredError(ImageProcessingError):
    """Raised when a requested real provider engine is unconfigured or unavailable."""
    pass


@dataclass
class ImageMetadata:
    """Extracted metadata for a decoded image."""
    width: int
    height: int
    format: str
    mime_type: str
    channels: int = 3
    aspect_ratio: float = 1.0
    size_bytes: int = 0


@dataclass
class QualityMetrics:
    """Computed computer vision quality metrics."""
    blur_score: float
    is_blurry: bool
    brightness: float
    contrast: float
    width: int
    height: int
    aspect_ratio: float


@dataclass
class OCRBoundingBox:
    """Bounding box for an extracted text token or block."""
    text: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float


@dataclass
class OCRResult:
    """Structured OCR extraction result."""
    extracted_text: str
    confidence: float
    language: str
    word_count: int
    blocks: List[OCRBoundingBox] = field(default_factory=list)
    provider: str = "mock"
    is_mock: bool = True


@dataclass
class VisionAnalysisResult:
    """Structured result from Vision AI understanding."""
    description: str
    answer: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    objects_detected: List[str] = field(default_factory=list)
    suggested_actions: List[str] = field(default_factory=list)
    raw_response: Optional[Dict[str, Any]] = None
    provider: str = "mock"
    is_mock: bool = True
    prompt_tokens: int = 0
    completion_tokens: int = 0
    model_name: str = "gpt-4o"
