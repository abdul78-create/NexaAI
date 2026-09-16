"""Phase 12 — Production OCR, Vision AI, and Usage Telemetry Tests."""

import io
import uuid
import pytest
import pytest_asyncio
from PIL import Image, ImageDraw
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.usage import AIUsageLog
from app.services.images.base import (
    ImageProcessingError,
    ProviderNotConfiguredError,
)
from app.services.images.ocr import TesseractOCRProvider, MockOCRProvider
from app.services.images.providers.vision import OpenAIVisionProvider, BaseVisionProvider
from app.services.images.providers.mock import MockVisionProvider
from app.services.usage.service import UsageService


def create_sample_image_bytes(width: int = 150, height: int = 100) -> bytes:
    img = Image.new("RGB", (width, height), color="green")
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "Production OCR Test", fill="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _register_and_login(client: AsyncClient, suffix: str = "") -> dict:
    email = f"p12_{suffix or uuid.uuid4().hex[:8]}@example.com"
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "display_name": "P12User",
        },
    )
    assert reg.status_code == 201
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SecurePassword123!"},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    return await _register_and_login(client, suffix="p12")


# ── Unit Tests: Usage Telemetry ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_usage_service_log_usage(async_db: AsyncSession):
    user_id = uuid.uuid4()
    service = UsageService(async_db)

    log_entry = await service.log_usage(
        user_id=user_id,
        feature_type="vision",
        provider="openai",
        model_name="gpt-4o",
        prompt_tokens=150,
        completion_tokens=45,
        execution_duration_ms=420,
        status="success",
    )

    assert log_entry.id is not None
    assert log_entry.total_tokens == 195
    assert log_entry.provider == "openai"
    assert log_entry.execution_duration_ms == 420

    # Query from DB
    stmt = select(AIUsageLog).where(AIUsageLog.user_id == user_id)
    res = await async_db.execute(stmt)
    saved = res.scalar_one()
    assert saved.feature_type == "vision"


# ── Unit Tests: Provider Boundaries ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_tesseract_ocr_provider_fallback_or_execution():
    provider = TesseractOCRProvider()
    img_bytes = create_sample_image_bytes()
    try:
        res = await provider.extract_text(img_bytes)
        assert res.provider == "tesseract"
        assert res.is_mock is False
    except ProviderNotConfiguredError:
        # Expected if Tesseract binary is not installed on test runner host
        pass


@pytest.mark.asyncio
async def test_openai_vision_provider_prompt_length_validation():
    provider = OpenAIVisionProvider(api_key="sk-test-key")
    img_bytes = create_sample_image_bytes()
    oversized_prompt = "A" * 2500  # Exceeds max 2000 chars limit

    with pytest.raises(ImageProcessingError) as exc_info:
        await provider.analyze_image(img_bytes, prompt=oversized_prompt)
    assert "exceeds max limit" in str(exc_info.value)


@pytest.mark.asyncio
async def test_openai_vision_provider_missing_api_key_raises():
    provider = OpenAIVisionProvider(api_key="")
    img_bytes = create_sample_image_bytes()

    with pytest.raises(ImageProcessingError) as exc_info:
        await provider.describe_image(img_bytes)
    assert "OPENAI_API_KEY is not configured" in str(exc_info.value)


# ── API Integration Tests: Provider Disclosures ──────────────────────────────

@pytest.mark.asyncio
async def test_api_analyze_image_returns_provider_metadata(client: AsyncClient, auth_headers: dict):
    img_bytes = create_sample_image_bytes()
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("chart.png", io.BytesIO(img_bytes), "image/png")},
    )
    assert upload_res.status_code == 201
    attachment_id = upload_res.json()["id"]

    analyze_res = await client.post(
        "/api/v1/images/analyze",
        headers=auth_headers,
        json={"attachment_id": attachment_id, "prompt": "Describe chart"},
    )
    assert analyze_res.status_code == 200
    body = analyze_res.json()
    assert "provider" in body
    assert "is_mock" in body
    assert isinstance(body["is_mock"], bool)


@pytest.mark.asyncio
async def test_api_ocr_returns_provider_metadata(client: AsyncClient, auth_headers: dict):
    img_bytes = create_sample_image_bytes()
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=auth_headers,
        files={"file": ("text.png", io.BytesIO(img_bytes), "image/png")},
    )
    assert upload_res.status_code == 201
    attachment_id = upload_res.json()["id"]

    ocr_res = await client.post(
        "/api/v1/images/ocr",
        headers=auth_headers,
        json={"attachment_id": attachment_id},
    )
    assert ocr_res.status_code == 200
    body = ocr_res.json()
    assert "provider" in body
    assert "is_mock" in body
    assert "provider" in body["ocr_result"]
    assert "is_mock" in body["ocr_result"]
