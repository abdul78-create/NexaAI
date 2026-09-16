"""Local filesystem storage provider for NexaAI Phase 10."""

import os
import re
import asyncio
from pathlib import Path

from app.core.config import settings
from app.services.storage.base import BaseStorageProvider


def _safe_filename(name: str) -> str:
    """
    Return a filesystem-safe version of *name*.

    Strips path separators, null bytes, control characters, and
    leading dots. Falls back to 'file' if the result is empty.
    """
    # Replace path separators and null bytes
    name = re.sub(r"[\\/\x00]", "_", name)
    # Strip non-printable / control chars
    name = re.sub(r"[\x01-\x1f\x7f]", "", name)
    # Strip leading dots and spaces (hidden files / Windows issues)
    name = name.lstrip(". ")
    # Collapse multiple consecutive dots or underscores
    name = re.sub(r"\.{2,}", ".", name)
    # Keep only safe characters
    name = re.sub(r"[^\w.\-]", "_", name)
    return name or "file"


class LocalStorageProvider(BaseStorageProvider):
    """
    Stores files on the local filesystem under ``{UPLOAD_DIR}/{user_prefix}/{key}``.

    The *key* format is ``{user_id_prefix}/{uuid}-{safe_filename}`` and is generated
    by the caller (AttachmentService). This class only writes / reads / deletes by key.
    """

    def __init__(self) -> None:
        self._base = Path(settings.UPLOAD_DIR).resolve()

    def _full_path(self, key: str) -> Path:
        """Resolve an opaque storage key to an absolute path safely."""
        # Normalise the key and resolve inside the base directory
        safe_key = Path(key).as_posix().lstrip("/")
        full = (self._base / safe_key).resolve()

        # Path-traversal guard — resolved path must stay inside base
        try:
            full.relative_to(self._base)
        except ValueError:
            raise PermissionError(f"Storage key '{key}' resolves outside upload directory.")
        return full

    async def save(self, key: str, data: bytes, content_type: str) -> str:  # noqa: ARG002
        full = self._full_path(key)
        # Create parent directories (safe — guarded above)
        await asyncio.to_thread(full.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(full.write_bytes, data)
        return key

    async def read(self, key: str) -> bytes:
        full = self._full_path(key)
        if not full.exists():
            raise FileNotFoundError(f"Storage object not found: {key}")
        return await asyncio.to_thread(full.read_bytes)

    async def delete(self, key: str) -> None:
        full = self._full_path(key)
        if full.exists():
            await asyncio.to_thread(os.remove, full)

    async def exists(self, key: str) -> bool:
        full = self._full_path(key)
        return await asyncio.to_thread(full.exists)

    def get_download_url(self, attachment_id: str) -> str:
        """Return the FastAPI streaming download URL for this attachment."""
        return f"{settings.API_V1_PREFIX}/attachments/{attachment_id}/download"
