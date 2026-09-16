"""Comprehensive unit and API integration tests for Phase 13 Speech Intelligence."""

import io
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.services.speech.base import SpeechProcessingError
from app.services.speech.mock import MockSTTProvider
from app.services.speech.providers.openai import OpenAISTTProvider


def create_sample_wav_bytes(duration_sec: float = 1.0) -> bytes:
    """Helper to generate a minimal valid PCM WAV header & silent audio stream in memory."""
    buf = io.BytesIO()
    num_samples = int(8000 * duration_sec)
    data_size = num_samples * 2  # 16-bit mono
    file_size = 36 + data_size

    # RIFF header
    buf.write(b"RIFF")
    buf.write(file_size.to_bytes(4, "little"))
    buf.write(b"WAVE")
    # fmt chunk
    buf.write(b"fmt ")
    buf.write((16).to_bytes(4, "little"))  # Chunk size
    buf.write((1).to_bytes(2, "little"))   # PCM format
    buf.write((1).to_bytes(2, "little"))   # 1 channel (mono)
    buf.write((8000).to_bytes(4, "little")) # 8000 Hz sample rate
    buf.write((16000).to_bytes(4, "little")) # Byte rate
    buf.write((2).to_bytes(2, "little"))   # Block align
    buf.write((16).to_bytes(2, "little"))  # Bits per sample
    # data chunk
    buf.write(b"data")
    buf.write(data_size.to_bytes(4, "little"))
    buf.write(b"\x00" * data_size)

    return buf.getvalue()


async def _register_and_login(client: AsyncClient, suffix: str = "") -> dict:
    """Create a unique user and return Bearer auth headers."""
    email = f"speech_{suffix or uuid.uuid4().hex[:8]}@example.com"
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "display_name": "Speech Test User",
        },
    )
    assert reg.status_code == 201, f"Register failed: {reg.text}"

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "Password123!",
        },
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}




@pytest.mark.asyncio
async def test_mock_stt_provider():
    """Verify MockSTTProvider returns explicit provider disclosures and expected DTO fields."""
    provider = MockSTTProvider()
    wav_bytes = create_sample_wav_bytes(2.0)

    res = await provider.transcribe(
        audio_bytes=wav_bytes,
        filename="test_rec.wav",
        content_type="audio/wav",
        language="en",
        prompt="NexaAI Voice",
    )

    assert res.provider == "mock"
    assert res.is_mock is True
    assert res.language == "en"
    assert "NexaAI Voice" in res.text
    assert res.audio_duration_seconds is not None
    assert res.duration_ms >= 0


@pytest.mark.asyncio
async def test_openai_stt_provider_unconfigured():
    """Verify OpenAISTTProvider raises SpeechProcessingError when key is unconfigured."""
    provider = OpenAISTTProvider(api_key="")
    wav_bytes = create_sample_wav_bytes(1.0)

    with pytest.raises(SpeechProcessingError) as exc_info:
        await provider.transcribe(
            audio_bytes=wav_bytes,
            filename="test.wav",
            content_type="audio/wav",
        )

    assert exc_info.value.code == "provider_not_configured"
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_audio_attachment_upload_and_transcribe(client: AsyncClient):
    """Integration test: Upload valid WAV audio attachment and transcribe via API."""
    headers = await _register_and_login(client, "transcribe1")
    wav_bytes = create_sample_wav_bytes(1.5)

    # 1. Upload audio attachment
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=headers,
        files={"file": ("test_speech.wav", wav_bytes, "audio/wav")},
    )
    assert upload_res.status_code == 201, upload_res.text
    att_data = upload_res.json()
    att_id = att_data["id"]
    assert att_data["media_type"] == "audio"

    # 2. Transcribe endpoint
    tx_res = await client.post(
        "/api/v1/speech/transcribe",
        headers=headers,
        json={
            "attachment_id": att_id,
            "language": "en",
            "prompt": "Test meeting audio",
        },
    )
    assert tx_res.status_code == 200, tx_res.text
    tx_data = tx_res.json()
    assert tx_data["attachment_id"] == att_id
    assert tx_data["provider"] in ("mock", "openai")
    assert tx_data["is_mock"] is True or tx_data["is_mock"] is False
    assert len(tx_data["transcript"]) > 0

    # 3. History endpoint
    hist_res = await client.get("/api/v1/speech/history", headers=headers)
    assert hist_res.status_code == 200, hist_res.text
    hist_data = hist_res.json()
    assert hist_data["total"] >= 1
    assert hist_data["items"][0]["id"] == tx_data["id"]

    # 4. Detail endpoint
    detail_res = await client.get(f"/api/v1/speech/history/{tx_data['id']}", headers=headers)
    assert detail_res.status_code == 200, detail_res.text
    assert detail_res.json()["transcript"] == tx_data["transcript"]

    # 5. Delete endpoint
    del_res = await client.delete(f"/api/v1/speech/history/{tx_data['id']}", headers=headers)
    assert del_res.status_code == 200, del_res.text

    # Verify deleted
    detail_res_2 = await client.get(f"/api/v1/speech/history/{tx_data['id']}", headers=headers)
    assert detail_res_2.status_code == 404


@pytest.mark.asyncio
async def test_transcription_ownership_isolation(client: AsyncClient):
    """Verify User B cannot transcribe or access User A's audio attachments or transcripts."""
    headers_a = await _register_and_login(client, "user_a")
    headers_b = await _register_and_login(client, "user_b")
    wav_bytes = create_sample_wav_bytes(1.0)

    # User A uploads audio
    upload_res = await client.post(
        "/api/v1/attachments/upload",
        headers=headers_a,
        files={"file": ("usera.wav", wav_bytes, "audio/wav")},
    )
    att_id_a = upload_res.json()["id"]

    # User B attempts to transcribe User A's audio
    tx_res = await client.post(
        "/api/v1/speech/transcribe",
        headers=headers_b,
        json={"attachment_id": att_id_a},
    )
    assert tx_res.status_code in (404, 400)

    # User A transcribes their audio
    tx_res_a = await client.post(
        "/api/v1/speech/transcribe",
        headers=headers_a,
        json={"attachment_id": att_id_a},
    )
    assert tx_res_a.status_code == 200
    tx_id_a = tx_res_a.json()["id"]

    # User B attempts to access User A's transcription record detail
    detail_res = await client.get(f"/api/v1/speech/history/{tx_id_a}", headers=headers_b)
    assert detail_res.status_code == 404

    # User B attempts to delete User A's transcription record
    del_res = await client.delete(f"/api/v1/speech/history/{tx_id_a}", headers=headers_b)
    assert del_res.status_code == 404
