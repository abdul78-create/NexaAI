"""Pydantic schemas for Phase 11 & 12 Image Intelligence API."""

from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ImageAnalysisRequest(BaseModel):
    """Payload to trigger AI Vision description or visual question answering."""

    attachment_id: UUID = Field(..., description="ID of a ready image attachment.")
    prompt: Optional[str] = Field(
        None,
        description="Optional question or instructions for vision AI.",
        max_length=2000,
    )
    model: Optional[str] = Field(None, description="Optional target vision model override.")


class ImageOCRRequest(BaseModel):
    """Payload to trigger OCR text extraction."""

    attachment_id: UUID = Field(..., description="ID of a ready image attachment.")
    language: Optional[str] = Field("eng", description="Optional language code (e.g. 'eng', 'spa', 'fra').")


class ImageProcessRequest(BaseModel):
    """Payload to trigger safe OpenCV / Pillow image transformation."""

    attachment_id: UUID = Field(..., description="ID of a ready image attachment.")
    action: str = Field(
        ...,
        description="Transformation action: resize | rotate | crop | compress | convert | enhance.",
    )
    params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Action-specific parameters (e.g. width, height, angle, quality, target_mime_type).",
    )


class QualityMetricsSchema(BaseModel):
    """Computer vision quality metrics."""

    blur_score: float
    is_blurry: bool
    brightness: float
    contrast: float
    width: int
    height: int
    aspect_ratio: float


class OCRBoundingBoxSchema(BaseModel):
    """Bounding box for an extracted text token or block."""

    text: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class OCRResultSchema(BaseModel):
    """Extracted text result payload."""

    extracted_text: str
    confidence: float
    language: str
    word_count: int
    blocks: List[OCRBoundingBoxSchema] = Field(default_factory=list)
    provider: str = "mock"
    is_mock: bool = True


class VisionAnalysisResponse(BaseModel):
    """Response payload for AI Vision analysis."""

    analysis_id: UUID
    attachment_id: UUID
    analysis_type: str = "vision"
    prompt: Optional[str] = None
    description: str
    answer: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    objects_detected: List[str] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    quality: QualityMetricsSchema
    provider: str = "mock"
    is_mock: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OCRAnalysisResponse(BaseModel):
    """Response payload for OCR extraction."""

    analysis_id: UUID
    attachment_id: UUID
    analysis_type: str = "ocr"
    ocr_result: OCRResultSchema
    quality: QualityMetricsSchema
    provider: str = "mock"
    is_mock: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImageProcessResponse(BaseModel):
    """Response payload for image transformation operations."""

    analysis_id: UUID
    original_attachment_id: UUID
    new_attachment_id: UUID
    action: str
    output_size_bytes: int
    width: int
    height: int
    format: str
    quality: QualityMetricsSchema
    provider: str = "opencv"
    is_mock: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImageAnalysisHistoryItem(BaseModel):
    """Summary item in image analysis history."""

    id: UUID
    attachment_id: UUID
    analysis_type: str
    prompt: Optional[str] = None
    extracted_text: Optional[str] = None
    status: str
    created_at: datetime
    result_json: Optional[str] = None
    image_metadata_json: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ImageAnalysisHistoryList(BaseModel):
    """Paginated list of image analysis history records."""

    items: List[ImageAnalysisHistoryItem]
    total: int
