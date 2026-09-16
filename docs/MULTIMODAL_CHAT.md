# Phase 14 — Multimodal Chat Composer Architecture

## 1. Overview
Phase 14 transforms NexaAI into a unified, multimodal platform. Users can include text, image attachments, document attachments, audio attachments, and voice transcripts within a single chat prompt.

---

## 2. Multimodal AI Orchestrator
Location: [`apps/api/app/services/ai/orchestrator.py`](file:///c:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/ai/orchestrator.py)

### Workflow
1. **User Ownership & Attachment Validation**: Validates user ownership of all referenced `Attachment` records (`media_type`, `ready` status, non-deleted).
2. **Model Capabilities Check**: Resolves `ModelCapabilities` for selected `model_id` via [`capabilities.py`](file:///c:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/ai/capabilities.py).
3. **Multimodal Context Enrichment**:
   - **Images**: Sent directly to Vision API if model is vision-capable; otherwise processed through OCR fallback (`TesseractOCRProvider` / `MockOCRProvider`) to extract text context.
   - **Documents**: Extracted text excerpts and RAG semantic chunks are injected into context headers.
   - **Audio**: Audio clips are transcribed via `SpeechService` (Whisper API / Mock) and injected into context headers.
4. **SSE Streaming**: Yields real-time tokens over Server-Sent Events (`message_start`, `token`, `usage`, `message_end`, `error`).
5. **Persistence & Telemetry**: Persists `ChatMessage` (role="user"), `ChatMessageAttachment` join records, `ChatMessage` (role="assistant"), and records telemetry log entries to `AIUsageLog`.

---

## 3. Database Schema
- **Table**: `chat_message_attachments`
- **Columns**: `id`, `message_id`, `attachment_id`, `kind`, `display_order`, `metadata_json`, `created_at`, `updated_at`.
- **Alembic Migration**: `009_chat_message_attachments.py`.
