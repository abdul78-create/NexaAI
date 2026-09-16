"""Storage provider factory for NexaAI Phase 10."""

from functools import lru_cache
from app.core.config import settings
from app.services.storage.base import BaseStorageProvider


@lru_cache(maxsize=1)
def get_storage_provider() -> BaseStorageProvider:
    """
    Return the configured storage provider singleton.

    Currently only "local" is supported. Future providers (s3, gcs) can be
    added here by switching on ``settings.STORAGE_PROVIDER``.
    """
    if settings.STORAGE_PROVIDER == "local":
        from app.services.storage.local import LocalStorageProvider
        return LocalStorageProvider()
    raise ValueError(f"Unsupported storage provider: '{settings.STORAGE_PROVIDER}'")
