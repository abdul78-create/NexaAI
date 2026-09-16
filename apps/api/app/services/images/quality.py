"""OpenCV computer vision quality calculation services."""

import io
import cv2
import numpy as np
from PIL import Image

from app.services.images.base import (
    QualityMetrics,
    CorruptImageError,
)

# Decompression bomb safety check threshold
Image.MAX_IMAGE_PIXELS = 25_000_000


def calculate_image_quality(
    image_bytes: bytes,
    blur_threshold: float = 100.0,
) -> QualityMetrics:
    """
    Calculate image quality metrics using OpenCV:
    - Blur score via Laplacian variance
    - Mean brightness
    - Intensity contrast (standard deviation)
    - Dimensions and aspect ratio
    """
    if not image_bytes:
        raise CorruptImageError("Empty image bytes provided.")

    try:
        # Decode image using Pillow for decompression bomb protection
        pil_img = Image.open(io.BytesIO(image_bytes))
        width, height = pil_img.size
        aspect_ratio = round(width / max(height, 1), 4)

        # Convert to numpy array for OpenCV processing
        img_np = np.array(pil_img.convert("RGB"))
        # Convert RGB to BGR for OpenCV
        bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        # Convert to Greyscale for blur and intensity metrics
        grey = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    except Exception as exc:
        raise CorruptImageError(f"Failed to decode image bytes for quality calculation: {str(exc)}") from exc

    # 1. Blur score via variance of Laplacian operator
    # Var(Laplacian) drops dramatically when an image is out of focus or blurred
    laplacian_val = cv2.Laplacian(grey, cv2.CV_64F).var()
    blur_score = round(float(laplacian_val), 2)
    is_blurry = blur_score < blur_threshold

    # 2. Mean brightness (0.0 to 255.0)
    brightness = round(float(np.mean(grey)), 2)

    # 3. Contrast (standard deviation of pixel intensities)
    contrast = round(float(np.std(grey)), 2)

    return QualityMetrics(
        blur_score=blur_score,
        is_blurry=is_blurry,
        brightness=brightness,
        contrast=contrast,
        width=width,
        height=height,
        aspect_ratio=aspect_ratio,
    )
