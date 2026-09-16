"""Abstract base class for NexaAI storage providers."""

from abc import ABC, abstractmethod


class BaseStorageProvider(ABC):
    """
    Storage provider interface.

    Implementations must be safe, async-compatible, and must never expose
    physical filesystem paths or cloud credentials to callers.
    """

    @abstractmethod
    async def save(self, key: str, data: bytes, content_type: str) -> str:
        """
        Persist *data* under *key*.

        Returns the canonical storage key that should be stored in the DB.
        The key must be opaque — callers must not construct file system paths from it.
        """
        ...

    @abstractmethod
    async def read(self, key: str) -> bytes:
        """Return raw bytes for the object identified by *key*."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Remove the object identified by *key*. Idempotent."""
        ...

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Return True if the object identified by *key* exists."""
        ...

    @abstractmethod
    def get_download_url(self, attachment_id: str) -> str:
        """
        Return a URL through which the attachment can be downloaded.

        For local storage this is the FastAPI streaming endpoint.
        For S3 it would be a signed URL.
        """
        ...
