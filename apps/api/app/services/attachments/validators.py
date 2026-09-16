"""Attachment validation service for NexaAI Phase 10."""

import hashlib
import re
from dataclasses import dataclass
from typing import Optional

from app.core.config import settings


# ── Magic-byte signatures for content-type verification ──────────────────────
# Format: mime_type -> list of (offset, signature_bytes) tuples
_MAGIC_SIGNATURES: dict[str, list[tuple[int, bytes]]] = {
    "image/jpeg": [(0, b"\xff\xd8\xff")],
    "image/png":  [(0, b"\x89PNG\r\n\x1a\n")],
    "image/gif":  [(0, b"GIF87a"), (0, b"GIF89a")],
    "image/webp": [(0, b"RIFF"), (8, b"WEBP")],
    "application/pdf": [(0, b"%PDF")],
    "audio/wav":  [(0, b"RIFF"), (8, b"WAVE")],
    "audio/mpeg": [(0, b"\xff\xfb"), (0, b"\xff\xf3"), (0, b"\xff\xf2"), (0, b"ID3")],
    "audio/webm": [(0, b"\x1a\x45\xdf\xa3")],
    "audio/ogg":  [(0, b"OggS")],
}

# MIME → coarse media_type category
_MIME_TO_MEDIA_TYPE: dict[str, str] = {
    "image/jpeg":  "image",
    "image/png":   "image",
    "image/webp":  "image",
    "image/gif":   "image",
    "application/pdf": "document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
    "text/plain":     "document",
    "text/markdown":  "document",
    "audio/webm":  "audio",
    "audio/mpeg":  "audio",
    "audio/wav":   "audio",
    "audio/mp4":   "audio",
    "audio/x-m4a": "audio",
    "audio/ogg":   "audio",
}

# Extension → expected MIME type(s)
_EXT_TO_MIMES: dict[str, list[str]] = {
    "jpg":  ["image/jpeg"],
    "jpeg": ["image/jpeg"],
    "png":  ["image/png"],
    "webp": ["image/webp"],
    "gif":  ["image/gif"],
    "pdf":  ["application/pdf"],
    "docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    "txt":  ["text/plain"],
    "md":   ["text/plain", "text/markdown"],
    "webm": ["audio/webm"],
    "mp3":  ["audio/mpeg"],
    "wav":  ["audio/wav"],
    "m4a":  ["audio/x-m4a", "audio/mp4"],
    "ogg":  ["audio/ogg"],
}


@dataclass
class ValidationResult:
    ok: bool
    media_type: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


def sanitize_filename(filename: str) -> str:
    """
    Return a filesystem-safe filename.

    Strips path separators, null bytes, control characters, and leading dots.
    Preserves the file extension.
    """
    # Strip path separators and null bytes
    filename = re.sub(r"[\\/\x00]", "_", filename)
    # Strip control characters
    filename = re.sub(r"[\x01-\x1f\x7f]", "", filename)
    # Strip leading dots / spaces
    filename = filename.lstrip(". ")
    # Collapse consecutive dots
    filename = re.sub(r"\.{2,}", ".", filename)
    # Keep only safe characters (allow Unicode letters via \w)
    filename = re.sub(r"[^\w.\-]", "_", filename, flags=re.UNICODE)
    return filename or "upload"


def compute_sha256(data: bytes) -> str:
    """Return the hex-encoded SHA-256 digest of *data*."""
    return hashlib.sha256(data).hexdigest()


def _check_magic_bytes(mime_type: str, data: bytes) -> bool:
    """
    Verify that *data* starts with the expected magic bytes for *mime_type*.

    Returns True if no signature is registered for this MIME type (permissive).
    """
    sigs = _MAGIC_SIGNATURES.get(mime_type)
    if not sigs:
        return True  # no signature on file → allow (e.g. plain text)
    for offset, sig in sigs:
        if data[offset: offset + len(sig)] == sig:
            return True
    return False


class AttachmentValidator:
    """
    Multi-layer file validation pipeline.

    Checks (in order):
    1. File is not empty.
    2. Extension is in the global allowlist.
    3. Declared MIME type is in the global allowlist.
    4. Extension matches declared MIME type.
    5. File-signature (magic bytes) matches declared MIME type.
    6. File size is within the configured limit.
    """

    @staticmethod
    def _all_allowed_mimes() -> set[str]:
        return (
            set(settings.ALLOWED_IMAGE_MIMETYPES)
            | set(settings.ALLOWED_DOCUMENT_MIMETYPES)
            | set(settings.ALLOWED_AUDIO_MIMETYPES)
        )

    @classmethod
    def validate(
        cls,
        filename: str,
        content_type: str,
        data: bytes,
        max_size_mb: Optional[int] = None,
    ) -> ValidationResult:
        """Run the full validation pipeline and return a ValidationResult."""

        # 1. Non-empty
        if not data:
            return ValidationResult(
                ok=False,
                error_code="EMPTY_FILE",
                error_message="Uploaded file is empty.",
            )

        # 2. Extension check
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        if ext not in _EXT_TO_MIMES:
            return ValidationResult(
                ok=False,
                error_code="UNSUPPORTED_EXTENSION",
                error_message=f"File extension '.{ext}' is not supported.",
            )

        # 3. MIME allowlist
        allowed_mimes = cls._all_allowed_mimes()
        # Normalize content_type (strip parameters like "; charset=utf-8")
        declared_mime = content_type.split(";")[0].strip().lower()
        if declared_mime not in allowed_mimes:
            return ValidationResult(
                ok=False,
                error_code="UNSUPPORTED_MIME",
                error_message=f"MIME type '{declared_mime}' is not supported.",
            )

        # 4. Extension ↔ MIME consistency
        expected_mimes = _EXT_TO_MIMES.get(ext, [])
        if expected_mimes and declared_mime not in expected_mimes:
            return ValidationResult(
                ok=False,
                error_code="MIME_EXTENSION_MISMATCH",
                error_message=(
                    f"File extension '.{ext}' does not match declared MIME type '{declared_mime}'."
                ),
            )

        # 5. Magic-byte verification
        if not _check_magic_bytes(declared_mime, data):
            return ValidationResult(
                ok=False,
                error_code="CONTENT_SIGNATURE_MISMATCH",
                error_message=(
                    f"File content does not match declared type '{declared_mime}'."
                ),
            )

        # 6. Size check — apply per-media-type limits when no override given
        resolved_media_type = _MIME_TO_MEDIA_TYPE.get(declared_mime, "other")
        if max_size_mb is None:
            if resolved_media_type == "image":
                max_mb = settings.MAX_IMAGE_SIZE_MB
            elif resolved_media_type == "document":
                max_mb = settings.MAX_DOCUMENT_SIZE_MB
            else:
                max_mb = settings.MAX_UPLOAD_SIZE_MB
        else:
            max_mb = max_size_mb
        max_bytes = max_mb * 1024 * 1024
        if len(data) > max_bytes:
            return ValidationResult(
                ok=False,
                error_code="FILE_TOO_LARGE",
                error_message=f"File exceeds maximum allowed size of {max_mb} MB.",
            )

        # Resolve coarse media_type
        media_type = _MIME_TO_MEDIA_TYPE.get(declared_mime, "other")

        return ValidationResult(ok=True, media_type=media_type)
