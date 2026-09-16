"""Mock Speech-to-Text provider for NexaAI offline testing, guest mode, and CI."""

import time
from typing import Optional

from app.services.speech.base import BaseSTTProvider, TranscriptionResult


class MockSTTProvider(BaseSTTProvider):
    """
    Mock STT provider that returns deterministic transcripts.
    Always explicitly discloses is_mock=True.
    """

    def __init__(self, model_name: str = "whisper-1"):
        self.model_name = model_name

    async def transcribe(
        self,
        *,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> TranscriptionResult:
        start_time = time.time()
        
        # Estimate audio duration roughly based on byte size (assuming ~16KB/s mono WAV/MP3)
        audio_size = len(audio_bytes)
        estimated_duration = round(max(1.0, audio_size / 32000.0), 2)
        
        selected_lang = language or "en"
        
        if prompt:
            transcript_text = f"[Mock Transcription based on prompt '{prompt}']: Welcome to NexaAI Speech Intelligence. Your audio clip ({filename}, {audio_size} bytes) was processed successfully in mock mode."
        else:
            transcript_text = f"Welcome to NexaAI Speech Intelligence. This is a simulated transcription for {filename} ({audio_size} bytes) using language '{selected_lang}'."

        elapsed_ms = int((time.time() - start_time) * 1000)

        return TranscriptionResult(
            text=transcript_text,
            language=selected_lang,
            provider="mock",
            model_name=self.model_name,
            is_mock=True,
            duration_ms=elapsed_ms,
            audio_duration_seconds=estimated_duration,
            confidence=0.95,
        )
