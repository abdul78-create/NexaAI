"""Safe OpenCV and Pillow image preprocessing operations."""

import io
from typing import Optional, Tuple
import cv2
import numpy as np
from PIL import Image

from app.core.config import settings
from app.services.images.base import (
    ImageMetadata,
    ImageProcessingError,
    CorruptImageError,
    OversizedImageError,
    UnsupportedImageFormatError,
)

# Enforce explicit decompression bomb safeguards
Image.MAX_IMAGE_PIXELS = 25_000_000

MIME_TO_PIL_FORMAT = {
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}

FORMAT_TO_MIME = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


def inspect_image(image_bytes: bytes) -> ImageMetadata:
    """
    Safely decode header and metadata of image bytes.
    Enforces pixel dimension bounds and decompression bomb protections.
    """
    if not image_bytes:
        raise CorruptImageError("Empty image bytes supplied.")

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        width, height = pil_img.size
        pil_format = pil_img.format or "JPEG"
    except Exception as exc:
        raise CorruptImageError(f"Corrupt or invalid image stream: {str(exc)}") from exc

    if width > settings.MAX_IMAGE_WIDTH or height > settings.MAX_IMAGE_HEIGHT:
        raise OversizedImageError(
            f"Image dimensions ({width}x{height}) exceed maximum allowed limits "
            f"({settings.MAX_IMAGE_WIDTH}x{settings.MAX_IMAGE_HEIGHT})."
        )

    mime_type = FORMAT_TO_MIME.get(pil_format.upper(), "image/jpeg")
    aspect_ratio = round(width / max(height, 1), 4)
    channels = len(pil_img.getbands())

    return ImageMetadata(
        width=width,
        height=height,
        format=pil_format,
        mime_type=mime_type,
        channels=channels,
        aspect_ratio=aspect_ratio,
        size_bytes=len(image_bytes),
    )


def resize_image(
    image_bytes: bytes,
    target_width: Optional[int] = None,
    target_height: Optional[int] = None,
    preserve_aspect_ratio: bool = True,
) -> Tuple[bytes, ImageMetadata]:
    """
    Resize image bytes while maintaining aspect ratio if requested.
    """
    meta = inspect_image(image_bytes)
    if not target_width and not target_height:
        return image_bytes, meta

    pil_img = Image.open(io.BytesIO(image_bytes))
    orig_w, orig_h = pil_img.size

    if preserve_aspect_ratio:
        if target_width and target_height:
            # Scale down to fit within bounding box
            ratio = min(target_width / orig_w, target_height / orig_h)
            new_w = max(1, int(orig_w * ratio))
            new_h = max(1, int(orig_h * ratio))
        elif target_width:
            ratio = target_width / orig_w
            new_w = target_width
            new_h = max(1, int(orig_h * ratio))
        else:
            ratio = target_height / orig_h
            new_h = target_height
            new_w = max(1, int(orig_w * ratio))
    else:
        new_w = target_width or orig_w
        new_h = target_height or orig_h

    resized = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    out_buf = io.BytesIO()
    fmt = pil_img.format or "JPEG"
    resized.save(out_buf, format=fmt)
    output_bytes = out_buf.getvalue()

    return output_bytes, inspect_image(output_bytes)


def rotate_image(image_bytes: bytes, angle: int) -> Tuple[bytes, ImageMetadata]:
    """
    Rotate an image by 90, 180, or 270 degrees clockwise.
    """
    inspect_image(image_bytes)
    angle = angle % 360
    if angle == 0:
        return image_bytes, inspect_image(image_bytes)

    pil_img = Image.open(io.BytesIO(image_bytes))
    # PIL rotate is counter-clockwise, so negative for clockwise
    rotated = pil_img.rotate(-angle, expand=True)

    out_buf = io.BytesIO()
    fmt = pil_img.format or "JPEG"
    rotated.save(out_buf, format=fmt)
    output_bytes = out_buf.getvalue()

    return output_bytes, inspect_image(output_bytes)


def crop_image(
    image_bytes: bytes,
    left: int,
    top: int,
    right: int,
    bottom: int,
) -> Tuple[bytes, ImageMetadata]:
    """
    Crop an image using absolute pixel boundaries (left, top, right, bottom).
    """
    meta = inspect_image(image_bytes)
    if left < 0 or top < 0 or right > meta.width or bottom > meta.height or left >= right or top >= bottom:
        raise ImageProcessingError(f"Invalid crop boundaries ({left}, {top}, {right}, {bottom}) for image size {meta.width}x{meta.height}.")

    pil_img = Image.open(io.BytesIO(image_bytes))
    cropped = pil_img.crop((left, top, right, bottom))

    out_buf = io.BytesIO()
    fmt = pil_img.format or "JPEG"
    cropped.save(out_buf, format=fmt)
    output_bytes = out_buf.getvalue()

    return output_bytes, inspect_image(output_bytes)


def compress_image(
    image_bytes: bytes,
    quality: int = 85,
    target_format: Optional[str] = None,
) -> Tuple[bytes, ImageMetadata]:
    """
    Compress image bytes with specified quality factor (1..100).
    """
    meta = inspect_image(image_bytes)
    quality = max(1, min(100, quality))
    pil_img = Image.open(io.BytesIO(image_bytes))

    fmt = target_format.upper() if target_format else (pil_img.format or "JPEG")
    if fmt == "PNG":
        # For PNG, convert RGB if RGBA transparency not needed
        if pil_img.mode == "RGBA":
            pil_img = pil_img.convert("RGB")

    out_buf = io.BytesIO()
    if fmt in ("JPEG", "WEBP"):
        if pil_img.mode in ("RGBA", "P"):
            pil_img = pil_img.convert("RGB")
        pil_img.save(out_buf, format=fmt, quality=quality, optimize=True)
    else:
        pil_img.save(out_buf, format=fmt, optimize=True)

    output_bytes = out_buf.getvalue()
    return output_bytes, inspect_image(output_bytes)


def convert_format(
    image_bytes: bytes,
    target_mime_type: str,
) -> Tuple[bytes, ImageMetadata]:
    """
    Convert image bytes into a target MIME type (e.g. image/png -> image/jpeg).
    """
    inspect_image(image_bytes)
    target_fmt = MIME_TO_PIL_FORMAT.get(target_mime_type.lower())
    if not target_fmt:
        raise UnsupportedImageFormatError(f"Unsupported target format: {target_mime_type}")

    pil_img = Image.open(io.BytesIO(image_bytes))
    if target_fmt == "JPEG" and pil_img.mode in ("RGBA", "P"):
        pil_img = pil_img.convert("RGB")

    out_buf = io.BytesIO()
    pil_img.save(out_buf, format=target_fmt)
    output_bytes = out_buf.getvalue()

    return output_bytes, inspect_image(output_bytes)


def enhance_document_image(image_bytes: bytes) -> Tuple[bytes, ImageMetadata]:
    """
    Use OpenCV adaptive thresholding and contrast normalization to enhance
    document scans and screenshots for legibility and OCR preprocessing.
    """
    inspect_image(image_bytes)
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        img_np = np.array(pil_img.convert("RGB"))
        grey = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced_grey = clahe.apply(grey)

        # Convert enhanced greyscale back to PIL RGB
        enhanced_pil = Image.fromarray(enhanced_grey).convert("RGB")

        out_buf = io.BytesIO()
        fmt = pil_img.format or "JPEG"
        enhanced_pil.save(out_buf, format=fmt)
        output_bytes = out_buf.getvalue()

        return output_bytes, inspect_image(output_bytes)
    except Exception as exc:
        raise CorruptImageError(f"Document enhancement failed: {str(exc)}") from exc
