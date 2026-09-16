"""Phase 10 — Attachment API & Service Tests."""

import hashlib
import io
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.services.attachments.validators import (
    AttachmentValidator,
    sanitize_filename,
    compute_sha256,
)


# ── Minimal test byte sequences ───────────────────────────────────────────────

# Minimal JPEG (SOI + APP0 marker)
MINIMAL_JPEG = (
    b"\xff\xd8\xff\xe0"
    + b"\x00\x10"
    + b"JFIF\x00"
    + b"\x01\x01\x00\x00\x01\x00\x01\x00\x00"
)

# Minimal PNG
MINIMAL_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8

# Minimal PDF
MINIMAL_PDF = b"%PDF-1.4\n" + b"\x00" * 10

# Plain text
PLAIN_TEXT = b"Hello, NexaAI Phase 10 multimodal attachments!"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _register_and_login(client: AsyncClient, suffix: str = "") -> str:
    """Create a unique user and return the JWT access token."""
    email = f"attach_{suffix or uuid.uuid4().hex[:8]}@example.com"
    reg = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecurePassword123!",
        "display_name": "AttachUser",
    })
    assert reg.status_code == 201, f"Register failed: {reg.text}"
    resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "SecurePassword123!",
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


# ── Unit tests: validators ────────────────────────────────────────────────────

class TestAttachmentValidator:

    def test_valid_jpeg(self):
        result = AttachmentValidator.validate(
            filename="photo.jpg",
            content_type="image/jpeg",
            data=MINIMAL_JPEG,
        )
        assert result.ok
        assert result.media_type == "image"

    def test_valid_png(self):
        result = AttachmentValidator.validate(
            filename="image.png",
            content_type="image/png",
            data=MINIMAL_PNG,
        )
        assert result.ok
        assert result.media_type == "image"

    def test_valid_pdf(self):
        result = AttachmentValidator.validate(
            filename="report.pdf",
            content_type="application/pdf",
            data=MINIMAL_PDF,
        )
        assert result.ok
        assert result.media_type == "document"

    def test_valid_plain_text(self):
        result = AttachmentValidator.validate(
            filename="notes.txt",
            content_type="text/plain",
            data=PLAIN_TEXT,
        )
        assert result.ok
        assert result.media_type == "document"

    def test_invalid_extension(self):
        result = AttachmentValidator.validate(
            filename="virus.exe",
            content_type="application/octet-stream",
            data=b"\x00\x01\x02",
        )
        assert not result.ok
        assert result.error_code == "UNSUPPORTED_EXTENSION"

    def test_invalid_mime_type(self):
        result = AttachmentValidator.validate(
            filename="file.jpg",
            content_type="application/javascript",
            data=MINIMAL_JPEG,
        )
        assert not result.ok
        assert result.error_code == "UNSUPPORTED_MIME"

    def test_mime_extension_mismatch(self):
        """PNG extension but JPEG MIME declared → mismatch."""
        result = AttachmentValidator.validate(
            filename="file.png",
            content_type="image/jpeg",  # extension is .png → expects image/png
            data=MINIMAL_JPEG,
        )
        assert not result.ok
        assert result.error_code == "MIME_EXTENSION_MISMATCH"

    def test_content_signature_mismatch(self):
        """JPEG ext+MIME but PNG bytes → magic-byte failure."""
        result = AttachmentValidator.validate(
            filename="bad.jpg",
            content_type="image/jpeg",
            data=MINIMAL_PNG,  # wrong magic bytes
        )
        assert not result.ok
        assert result.error_code == "CONTENT_SIGNATURE_MISMATCH"

    def test_oversized_file(self):
        big = b"\xff\xd8\xff" + b"\x00" * (11 * 1024 * 1024)
        result = AttachmentValidator.validate(
            filename="huge.jpg",
            content_type="image/jpeg",
            data=big,
            max_size_mb=10,
        )
        assert not result.ok
        assert result.error_code == "FILE_TOO_LARGE"

    def test_empty_file(self):
        result = AttachmentValidator.validate(
            filename="empty.jpg",
            content_type="image/jpeg",
            data=b"",
        )
        assert not result.ok
        assert result.error_code == "EMPTY_FILE"


class TestFilenameAndChecksum:

    def test_sanitize_path_traversal(self):
        name = sanitize_filename("../../etc/passwd")
        assert "/" not in name
        assert "\\" not in name

    def test_sanitize_null_bytes(self):
        name = sanitize_filename("file\x00.jpg")
        assert "\x00" not in name

    def test_sanitize_empty_returns_fallback(self):
        assert sanitize_filename("") == "upload"

    def test_sha256_checksum(self):
        data = b"NexaAI Phase 10 multimodal test"
        expected = hashlib.sha256(data).hexdigest()
        assert compute_sha256(data) == expected
        assert len(compute_sha256(data)) == 64


# ── Storage unit tests ────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestLocalStorageProvider:

    async def test_save_read_delete(self, tmp_path):
        from app.services.storage.local import LocalStorageProvider
        store = LocalStorageProvider()
        store._base = tmp_path.resolve()

        key = "testuser/abc123-file.jpg"
        data = MINIMAL_JPEG

        saved_key = await store.save(key, data, "image/jpeg")
        assert saved_key == key
        assert await store.exists(key)

        read_data = await store.read(key)
        assert read_data == data

        await store.delete(key)
        assert not await store.exists(key)

    async def test_path_traversal_blocked(self, tmp_path):
        from app.services.storage.local import LocalStorageProvider
        store = LocalStorageProvider()
        store._base = tmp_path.resolve()

        with pytest.raises(PermissionError):
            await store.save("../../etc/passwd", b"evil", "text/plain")


# ── API integration tests ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_valid_image(client: AsyncClient):
    token = await _register_and_login(client, "img")
    resp = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("photo.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "ready"
    assert data["media_type"] == "image"
    assert data["mime_type"] == "image/jpeg"
    assert "storage_key" not in data
    assert "download_url" in data


@pytest.mark.asyncio
async def test_upload_invalid_extension_rejected(client: AsyncClient):
    token = await _register_and_login(client, "ext")
    resp = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("malware.exe", io.BytesIO(b"\x4d\x5a\x00"), "application/octet-stream")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_oversized_rejected(client: AsyncClient):
    token = await _register_and_login(client, "size")
    big = b"\xff\xd8\xff" + b"\x00" * (11 * 1024 * 1024)
    resp = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("big.jpg", io.BytesIO(big), "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_returns_only_own_attachments(client: AsyncClient):
    token_a = await _register_and_login(client, "lista")
    token_b = await _register_and_login(client, "listb")

    # User A uploads
    await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("a.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    # User B lists — should be empty
    resp = await client.get(
        "/api/v1/attachments",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert resp.json()["items"] == []


@pytest.mark.asyncio
async def test_cross_user_download_denied(client: AsyncClient):
    token_a = await _register_and_login(client, "crossa")
    token_b = await _register_and_login(client, "crossb")

    # A uploads
    up = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("secret.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    attachment_id = up.json()["id"]

    # B tries to download A's file
    resp = await client.get(
        f"/api/v1/attachments/{attachment_id}/download",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_download_returns_file_bytes(client: AsyncClient):
    token = await _register_and_login(client, "dltest")
    up = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("img.png", io.BytesIO(MINIMAL_PNG), "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    attachment_id = up.json()["id"]

    resp = await client.get(
        f"/api/v1/attachments/{attachment_id}/download",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.content == MINIMAL_PNG
    assert resp.headers["content-type"].startswith("image/png")


@pytest.mark.asyncio
async def test_delete_then_404(client: AsyncClient):
    token = await _register_and_login(client, "deltest")
    up = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("del.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    attachment_id = up.json()["id"]

    del_resp = await client.delete(
        f"/api/v1/attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_resp.status_code == 204

    get_resp = await client.get(
        f"/api/v1/attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthorized_upload_rejected(client: AsyncClient):
    resp = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("img.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_upload_plain_text_document(client: AsyncClient):
    token = await _register_and_login(client, "txtdoc")
    resp = await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("notes.txt", io.BytesIO(PLAIN_TEXT), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["media_type"] == "document"
    assert data["mime_type"] == "text/plain"


@pytest.mark.asyncio
async def test_filter_by_media_type(client: AsyncClient):
    token = await _register_and_login(client, "filtermt")
    # Upload image
    await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("img.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    # Upload document
    await client.post(
        "/api/v1/attachments/upload",
        files={"file": ("doc.txt", io.BytesIO(PLAIN_TEXT), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )

    resp = await client.get(
        "/api/v1/attachments?media_type=image",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert all(item["media_type"] == "image" for item in data["items"])
