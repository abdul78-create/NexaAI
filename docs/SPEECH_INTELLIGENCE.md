# NexaAI Speech Intelligence Architecture (Phase 13)

This document describes the design and implementation of the **Speech Intelligence & Speech-to-Text (STT)** subsystem in NexaAI.

---

## 1. Executive Summary

Phase 13 introduces real-time microphone recording, audio file upload validation (WAV, MP3, M4A, WebM, OGG), STT provider abstractions (OpenAI Whisper + Mock), transcription history, transcript editing, and integration hooks for the NexaAI multimodal chat composer.

The implementation builds directly on Phase 10 Attachment infrastructure, Phase 11/12 database patterns, and Phase 12 `AIUsageLog` telemetry tracking.

---

## 2. Component Architecture Overview

```
apps/api/app/
├── api/v1/
│   └── speech.py                # REST endpoints (/transcribe, /history, /history/{id})
├── db/models/
│   └── speech.py                # SpeechTranscription SQLAlchemy model
├── schemas/
│   └── speech.py                # Typed Pydantic request & response schemas
├── services/
│   └── speech/
│       ├── __init__.py
│       ├── base.py              # TranscriptionResult & SpeechProcessingError definitions
│       ├── mock.py              # MockSTTProvider (offline dev & tests)
│       ├── service.py           # SpeechService main database-backed orchestrator
│       └── providers/
│           ├── __init__.py
│           └── openai.py        # OpenAISTTProvider (Whisper API / httpx streaming)
└── tests/
    └── test_speech.py           # Comprehensive pytest suite
```

---

## 3. Audio Validation & Security Controls

### Supported Audio Media Types:
- **WAV**: `audio/wav` (`RIFF` + `WAVE` header)
- **MP3**: `audio/mpeg` (`ID3` or frame header `\xff\xfb` / `\xff\xf3` / `\xff\xf2`)
- **WebM Audio**: `audio/webm` (`\x1a\x45\xdf\xa3` EBML container)
- **M4A / MP4 Audio**: `audio/x-m4a`, `audio/mp4` (`ftyp` header)
- **OGG Audio**: `audio/ogg` (`OggS` container header)

### Security Boundaries:
1. **Magic-Byte Signature Verification**:
   Audio payloads are verified against binary container headers; mime types supplied by client browsers alone are untrusted.
2. **File & Duration Caps**:
   `AUDIO_MAX_FILE_SIZE_MB` (25 MB) and `AUDIO_MAX_DURATION_SECONDS` (300 seconds / 5 minutes) limits are enforced.
3. **On-Demand Microphone Permission**:
   Browser microphone permissions are requested only when the user clicks **Record Microphone** in the Speech Studio UI. No background or automatic recording occurs on page load.
4. **Clean Track Tear-down**:
   Microphone streams are cleanly stopped (`track.stop()`) immediately upon recording completion or cancellation.
5. **Ownership Isolation**:
   All speech operations verify `attachment.user_id == current_user.id`.

---

## 4. Provider Abstraction & Telemetry

### 4.1 STT Provider Interface (`BaseSTTProvider`)
Defines `transcribe_audio(audio_bytes: bytes, mime_type: str, language: Optional[str] = None, prompt: Optional[str] = None)`.
- **`OpenAISTTProvider`**: Transmits audio binary streams to OpenAI Whisper (`/v1/audio/transcriptions`). Enhanced with 30s timeout, exponential backoff retries, and token/duration metadata calculation.
- **`MockSTTProvider`**: Used in unit tests and offline development mode. Returns structured transcriptions tagged with `"provider": "mock"` and `"is_mock": true`.

### 4.2 Telemetry Logging
All transcription executions log telemetry to the `ai_usage_logs` database table via `UsageService`:
- `feature_type = "speech_to_text"`
- `provider = "openai" | "mock"`
- `model_name = "whisper-1"`
- `completion_tokens = word_count`
- `execution_duration_ms = duration`

---

## 5. API Endpoint Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/speech/transcribe` | Transcribe an existing audio attachment |
| `GET` | `/api/v1/speech/history` | List paginated user speech transcription records |
| `GET` | `/api/v1/speech/history/{id}` | Get single transcription record detail |
| `DELETE` | `/api/v1/speech/history/{id}` | Remove transcription history record |
