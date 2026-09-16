"""Abstract Base STT Provider and Data Transfer Objects for NexaAI Speech Intelligence."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


class SpeechProcessingError(Exception):
    """Base exception for Speech-to-Text processing failures."""

    def __init__(self, message: str, code: str = "speech_error", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


@dataclass
class TranscriptionResult:
    """Standardized result object returned by STT providers."""

    text: str
    language: str
    provider: str
    model_name: str
    is_mock: bool
    duration_ms: int = 0
    audio_duration_seconds: Optional[float] = None
    confidence: Optional[float] = None
    error_code: Optional[str] = None


class BaseSTTProvider(ABC):
    """Abstract interface for Speech-to-Text providers."""

    @abstractmethod
    async def transcribe(
        self,
        *,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> TranscriptionResult:
        """
        Transcribe raw audio bytes into text.

        :param audio_bytes: Raw audio binary stream
        :param filename: Original filename with extension (e.g. 'recording.wav')
        :param content_type: Validated MIME type (e.g. 'audio/wav')
        :param language: Optional ISO 639-1 language code (e.g. 'en')
        :param prompt: Optional prompt/context for transcription guide
        :return: TranscriptionResult DTO
        """
        pass
