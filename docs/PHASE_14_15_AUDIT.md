# Phase 14 & Phase 15 Architectural Audit & Integration Plan

## 1. Executive Summary
This document provides the architectural audit of the NexaAI codebase prior to executing **Phase 14 (Multimodal Chat Composer)** and **Phase 15 (Usage Dashboard, Quotas, Settings, & AI Operations)**.

NexaAI is a FastAPI + Next.js platform with complete foundational infrastructure for Authentication, Chat Streaming, NLP Analysis, Document Intelligence (RAG), Attachment Storage, Image Intelligence (Vision AI + OCR), and Speech Intelligence (STT).

---

## 2. Existing Systems Audit

### 2.1 Backend Architecture
- **Framework & Database**: FastAPI 0.115+, SQLAlchemy 2.0 (async), AsyncPG / SQLite, Alembic migrations 001 to 008.
- **Authentication**: JWT-based access & refresh tokens with rotation and blacklist (`app/db/models/auth.py`, `app/api/deps.py`).
- **Chat Subsystem**: `Conversation` & `ChatMessage` models (`app/db/models/chat.py`). `generate_chat_sse_stream` yields SSE events (`message_start`, `token`, `usage`, `message_end`, `error`).
- **Attachment Infrastructure**: `Attachment` model (`app/db/models/attachment.py`) with `media_type` (`image | audio | document | video | other`) and opaque `storage_key`. Clean storage interface via `BaseStorageProvider` & `LocalStorageProvider`.
- **Image Subsystem**: `ImageAnalysis` model, OpenCV/Pillow image preprocessing, `MockOCRProvider`, `TesseractOCRProvider`, `MockVisionProvider`, and `OpenAIVisionProvider`.
- **Document Subsystem**: Document extraction (PDF, DOCX, TXT, MD), semantic chunking, embedding providers (`text-embedding-3-small` & `MockEmbeddingProvider`), vector cosine similarity search.
- **Speech Subsystem**: `SpeechTranscription` model, `MockSTTProvider`, `OpenAISTTProvider` (Whisper API), `SpeechService` orchestrator.
- **Telemetry Subsystem**: `AIUsageLog` model (`app/db/models/usage.py`) tracking `user_id`, `feature_type`, `provider`, `model_name`, `prompt_tokens`, `completion_tokens`, `execution_duration_ms`, `status`, `error_code`.

### 2.2 Frontend Architecture
- **Framework & Styling**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons, Framer Motion.
- **Stores**: Zustand stores for `auth-store.ts`, `chat-store.ts`.
- **API Clients**: `lib/chat-api.ts`, `lib/attachments-api.ts`, `lib/images-api.ts`, `lib/speech-api.ts`, `lib/nlp-api.ts`, `lib/docs-api.ts`.
- **Components**: `ChatWorkspace`, `ChatComposer`, `ImageWorkspace`, `SpeechWorkspace`, `DocWorkspace`, `NLPWorkspace`, `AppShell`.

---

## 3. Integration Points for Phase 14 (Multimodal Chat Composer)

### 3.1 Database Enhancements
- **MessageAttachment Join Model**: Need `chat_message_attachments` table linking `ChatMessage` and `Attachment` with `kind` (`image | document | audio`), `display_order`, and `metadata_json`.
- **Migration**: Create Alembic migration `009_chat_message_attachments.py`.

### 3.2 Backend Service Integration
- **`ChatStreamRequest` Schema**: Extend to accept `attachments: List[AttachmentAttachmentInput]` and `options: MultimodalOptions`.
- **Multimodal AI Orchestrator (`apps/api/app/services/ai/orchestrator.py`)**:
  - Validates conversation and attachment ownership.
  - Processes image attachments (either via direct Vision API payload or OCR text extraction fallback).
  - Processes document attachments (via semantic search/RAG chunk retrieval matching query).
  - Processes audio attachments (via Whisper STT transcription).
  - Bundles multimodal context into prompt sent to `BaseAIProvider`.
  - Streams SSE response, persists `ChatMessage` and `ChatMessageAttachment` records, and logs telemetry.
- **Model Capability Registry (`apps/api/app/services/ai/capabilities.py`)**: Defines capabilities for models (`nexa-standard`, `nexa-pro`, `gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet`) to prevent sending raw vision payloads to non-vision models.

### 3.3 Frontend Composer & Workspace
- Upgrade `ChatComposer.tsx` to handle:
  - Text input + multiline auto-expand.
  - Attachment tray with thumbnail previews for images, file badges for docs/audio.
  - Drag-and-drop file upload zone.
  - Clipboard image paste support.
  - Capability warning toast/badges when non-vision models are selected with image attachments.
  - Attachment upload progress and cancellation.
- Update `ChatMessage` components to render attached image thumbnails, document reference badges, and transcript callouts.

---

## 4. Integration Points for Phase 15 (Usage Dashboard, Quotas, Settings)

### 4.1 Telemetry & Quota Service
- Extend `AIUsageLog` model usage to cover `cost_microunits` or integer cost calculation.
- **Usage Aggregation Service (`apps/api/app/services/usage/aggregation.py`)**:
  - Daily, weekly, monthly time-series queries.
  - Breakdown by feature (`chat`, `vision`, `ocr`, `speech`, `document_rag`), provider (`openai`, `tesseract`, `mock`), and model.
  - Paginated audit log history.
- **Quota System (`apps/api/app/services/usage/quotas.py`)**:
  - Configurable daily/monthly request, token, speech second, and storage limits.
  - Authoritative backend quota check before expensive provider calls (`check_user_quota`).

### 4.2 User Preferences & Account Settings
- **UserPreferences Model**: `user_preferences` table storing `user_id`, `theme` (`dark | light | system`), `default_model`, `default_language`, `auto_ocr_enabled`, `auto_rag_enabled`, `show_provider_disclosures`, `reduced_motion`.
- **Migration**: Create Alembic migration `010_user_preferences.py`.
- **API Router `/api/v1/usage`**: `/summary`, `/timeseries`, `/breakdown`, `/history`, `/quotas`, `/export`.
- **API Router `/api/v1/settings`**: `/preferences`, `/profile`, `/privacy`, `/data-export`.

### 4.3 Frontend Studio Pages
- **`/app/usage`**: Dashboard featuring summary cards, time-series usage charts, feature/provider breakdown bars, quota progress indicators, paginated execution log table, and CSV/JSON export.
- **`/app/settings`**: Tabbed settings workspace for Profile, Appearance, AI Preferences, Privacy & Data, Security.

---

## 5. Security, Privacy & Safety Risk Audit
- **Ownership Verification**: All attachment IDs in chat requests MUST be checked against `attachment.user_id == current_user.id`.
- **No Path Traversal**: Filesystem storage keys must never be exposed or constructed from user input.
- **Sanitized Logging**: Telemetry logs record counts and durations only; zero prompt text or raw image/audio bytes are stored in `ai_usage_logs`.
- **No Frontend Secrets**: API keys remain strictly backend-only (`OPENAI_API_KEY`).
