"""Comprehensive unit and API integration tests for Phase 11 Image Intelligence."""

import io
import uuid
import pytest
import pytest_asyncio
from PIL import Image, ImageDraw
from httpx import AsyncClient

from app.services.images.base import (
    CorruptImageError,
    ImageProcessingError,
)
from app.services.images.quality import calculate_image_quality
from app.services.images.preprocessing import (
    inspect_image,
    resize_image,
    rotate_image,
    crop_image,
    convert_format,
    enhance_document_image,
)
from app.services.images.ocr import MockOCRProvider
from app.services.images.providers.mock import MockVisionProvider


def create_sample_image_bytes(
    width: int = 200,
    height: int = 150,
    color: str = "red",
    fmt: str = "JPEG",
    text: str = "NexaAI OCR Test",
) -> bytes:
    """Helper to generate valid raw image bytes in memory."""
    img = Image.new("RGB", (width, height), color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, width - 10, height - 10], outline="white", width=3)
    draw.text((20, 20), text, fill="white")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


async def _register_and_login(client: AsyncClient, suffix: str = "") -> dict:
    """Create a unique user and return Bearer auth headers."""
    email = f"img_{suffix or uuid.uuid4().hex[:8]}@example.com"
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "display_name": "ImageUser",
        },
    )
    assert reg.status_code == 201, f"Register failed: {reg.text}"

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "SecurePassword123!",
        },
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    return await _register_and_login(client, suffix="primary")


@pytest_asyncio.fixture
async def secondary_auth_headers(client: AsyncClient) -> dict:
    return await _register_and_login(client, suffix="secondary")


# ── Unit Tests: Image Preprocessing & Quality ─────────────────────────────

def test_inspect_valid_image():
    img_bytes = create_sample_image_bytes(100, 80, fmt="PNG")
    meta = inspect_image(img_bytes)
    assert meta.width == 100
    assert meta.height == 80
    assert meta.mime_type == "image/png"
    assert meta.aspect_ratio == 1.25


def test_inspect_corrupt_image_raises():
    with pytest.raises(CorruptImageError):
        inspect_image(b"not-a-real-image-stream")


def test_inspect_empty_image_raises():
    with pytest.raises(CorruptImageError):
        inspect_image(b"")


def test_quality_metrics_calculation():
    img_bytes = create_sample_image_bytes(200, 200, color="blue")
    quality = calculate_image_quality(img_bytes)
    assert quality.width == 200
    assert quality.height == 200
    assert quality.aspect_ratio == 1.0
    assert isinstance(quality.blur_score, float)
    assert isinstance(quality.brightness, float)
    assert isinstance(quality.contrast, float)


def test_resize_image_preserve_aspect():
    img_bytes = create_sample_image_bytes(400, 200)
    resized_bytes, meta = resize_image(img_bytes, target_width=200, preserve_aspect_ratio=True)
    assert meta.width == 200
    assert meta.height == 100
    assert meta.aspect_ratio == 2.0


def test_rotate_image_90_degrees():
    img_bytes = create_sample_image_bytes(300, 150)
    rotated_bytes, meta = rotate_image(img_bytes, angle=90)
    assert meta.width == 150
    assert meta.height == 300


def test_crop_image_valid_bounds():
    img_bytes = create_sample_image_bytes(200, 200)
    cropped_bytes, meta = crop_image(img_bytes, left=10, top=10, right=100, bottom=80)
    assert meta.width == 90
    assert meta.height == 70


def test_crop_image_invalid_bounds_raises():
    img_bytes = create_sample_image_bytes(100, 100)
    with pytest.raises(ImageProcessingError):
        crop_image(img_bytes, left=50, top=50, right=20, bottom=20)


def test_convert_format_png_to_jpeg():
    png_bytes = create_sample_image_bytes(100, 100, fmt="PNG")
    jpeg_bytes, meta = convert_format(png_bytes, target_mime_type="image/jpeg")
    assert meta.mime_type == "image/jpeg"
    assert meta.format == "JPEG"


def test_document_enhancement():
    img_bytes = create_sample_image_bytes(150, 150, color="gray")
    enhanced_bytes, meta = enhance_document_image(img_bytes)
    assert meta.width == 150
    assert meta.height == 150
    assert len(enhanced_bytes) > 0


# ── Unit Tests: Mock OCR & Vision Providers ────────────────────────────────

@pytest.mark.asyncio
async def test_mock_ocr_provider():
    provider = MockOCRProvider()
    img_bytes = create_sample_image_bytes()
    ocr_res = await provider.extract_text(img_bytes, language="en")
    assert "NexaAI" in ocr_res.extracted_text
    assert ocr_res.confidence > 0.90
    assert ocr_res.word_count > 0
    assert len(ocr_res.blocks) > 0


@pytest.mark.asyncio
async def test_mock_vision_provider_describe():
    provider = MockVisionProvider()
    img_bytes = create_sample_image_bytes(200, 100)
    res = await provider.describe_image(img_bytes)
    assert "200x100" in res.description
    assert len(res.tags) > 0


@pytest.mark.asyncio
async def test_mock_vision_provider_answer_question():
    provider = MockVisionProvider()
    img_bytes = create_sample_image_bytes()
    res = await provider.answer_image_question(img_bytes, question="What color is dominant?")
    assert "What color is dominant?" in res.answer
    assert "200x150" in res.answer


# ── API Integration Tests ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_analyze_image_success(client: AsyncClient, auth_headers: dict):
    img_bytes = create_sample_image_bytes(300, 200, fmt="PNG")
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("chart.png", io.BytesIO(img_bytes), "image/png")},
    )
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    attachment_id = upload_res.json()["id"]

    analyze_res = await client.post(
        "/api/v1/images/analyze",
        headers=auth_headers,
        json={
            "attachment_id": attachment_id,
            "prompt": "What does this chart indicate?",
        },
    )
    assert analyze_res.status_code == 200, f"Analyze failed: {analyze_res.text}"
    body = analyze_res.json()
    assert body["attachment_id"] == attachment_id
    assert body["analysis_type"] == "vision"
    assert body["prompt"] == "What does this chart indicate?"
    assert "description" in body
    assert body["quality"]["width"] == 300
    assert body["quality"]["height"] == 200


@pytest.mark.asyncio
async def test_api_ocr_image_success(client: AsyncClient, auth_headers: dict):
    img_bytes = create_sample_image_bytes(250, 150, fmt="PNG")
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("document.png", io.BytesIO(img_bytes), "image/png")},
    )
    assert upload_res.status_code == 201
    attachment_id = upload_res.json()["id"]

    ocr_res = await client.post(
        "/api/v1/images/ocr",
        headers=auth_headers,
        json={"attachment_id": attachment_id, "language": "en"},
    )
    assert ocr_res.status_code == 200
    body = ocr_res.json()
    assert body["attachment_id"] == attachment_id
    assert "NexaAI" in body["ocr_result"]["extracted_text"]
    assert body["ocr_result"]["word_count"] > 0


@pytest.mark.asyncio
async def test_api_process_image_rotate(client: AsyncClient, auth_headers: dict):
    img_bytes = create_sample_image_bytes(200, 100, fmt="JPEG")
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("photo.jpg", io.BytesIO(img_bytes), "image/jpeg")},
    )
    assert upload_res.status_code == 201
    orig_attachment_id = upload_res.json()["id"]

    proc_res = await client.post(
        "/api/v1/images/process",
        headers=auth_headers,
        json={
            "attachment_id": orig_attachment_id,
            "action": "rotate",
            "params": {"angle": 90},
        },
    )
    assert proc_res.status_code == 200
    body = proc_res.json()
    assert body["action"] == "rotate"
    assert body["original_attachment_id"] == orig_attachment_id
    assert body["new_attachment_id"] != orig_attachment_id
    assert body["width"] == 100
    assert body["height"] == 200


@pytest.mark.asyncio
async def test_api_history_list_and_delete(client: AsyncClient, auth_headers: dict):
    img_bytes = create_sample_image_bytes(fmt="PNG")
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("sample.png", io.BytesIO(img_bytes), "image/png")},
    )
    assert upload_res.status_code == 201
    attachment_id = upload_res.json()["id"]

    await client.post(
        "/api/v1/images/ocr",
        headers=auth_headers,
        json={"attachment_id": attachment_id},
    )

    hist_res = await client.get("/api/v1/images/history", headers=auth_headers)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] >= 1
    analysis_id = hist_data["items"][0]["id"]

    detail_res = await client.get(f"/api/v1/images/history/{analysis_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == analysis_id

    del_res = await client.delete(f"/api/v1/images/history/{analysis_id}", headers=auth_headers)
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_cross_user_isolation(
    client: AsyncClient,
    auth_headers: dict,
    secondary_auth_headers: dict,
):
    """User B cannot access or analyze User A's uploaded image."""
    img_bytes = create_sample_image_bytes(fmt="PNG")
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("user_a.png", io.BytesIO(img_bytes), "image/png")},
    )
    assert upload_res.status_code == 201
    attachment_id = upload_res.json()["id"]

    forbidden_res = await client.post(
        "/api/v1/images/ocr",
        headers=secondary_auth_headers,
        json={"attachment_id": attachment_id},
    )
    assert forbidden_res.status_code in (404, 403, 400)


@pytest.mark.asyncio
async def test_non_image_attachment_rejected(client: AsyncClient, auth_headers: dict):
    """Passing a document attachment to image endpoints raises 400."""
    txt_bytes = b"Hello, this is a plain text document."
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("notes.txt", io.BytesIO(txt_bytes), "text/plain")},
    )
    assert upload_res.status_code == 201
    doc_attachment_id = upload_res.json()["id"]

    err_res = await client.post(
        "/api/v1/images/ocr",
        headers=auth_headers,
        json={"attachment_id": doc_attachment_id},
    )
    assert err_res.status_code == 400
    body = err_res.json()
    error_msg = body.get("detail") or str(body)
    assert "media_type" in error_msg
