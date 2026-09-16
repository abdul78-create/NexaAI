# NexaAI Multimodal Architecture

> **Phase 10** — Multimodal Foundation & Secure File Infrastructure

This document describes the shared attachment/upload infrastructure introduced in Phase 10, which forms the foundation for all future multimodal capabilities in NexaAI.

---

## Overview

NexaAI is evolving from a text-only AI chatbot into a **multimodal AI productivity platform** supporting:

| Input Type | Phase | Status |
| :--- | :--- | :--- |
| Text chat | Phase 6 | ✅ Live |
| Documents (PDF, DOCX, TXT, MD) | Phase 8 | ✅ Live |
| RAG question answering | Phase 8 | ✅ Live |
| **File attachments (shared foundation)** | **Phase 10** | **✅ Live** |
| Image intelligence (OpenCV + Vision AI) | Phase 11 | 🔜 Planned |
| OCR (text from images) | Phase 12 | 🔜 Planned |
| Microphone / Voice input | Phase 13 | 🔜 Planned |
| Multimodal chat composer | Phase 14 | 🔜 Planned |
| Usage, quotas, dashboard | Phase 15 | 🔜 Planned |

---

## Attachment Lifecycle

```
Client uploads file
        │
        ▼
 POST /api/v1/attachments/upload
        │
        ▼
 AttachmentValidator.validate()
 ├── empty check
 ├── extension allowlist
 ├── MIME allowlist
 ├── extension ↔ MIME consistency
 ├── magic bytes (content signature)
 └── size limit enforcement
        │
    FAIL ──→ 400 Bad Request
        │
       OK
        │
        ▼
 compute_sha256(data)
        │
        ▼
 AttachmentService._build_storage_key()
 ├── user_id prefix (8 chars)
 └── uuid4 + sanitized filename
        │
        ▼
 LocalStorageProvider.save(key, data)
        │
        ▼
 Attachment ORM record persisted
 └── status = "ready"
        │
        ▼
 AttachmentResponse returned (no storage_key)
 └── download_url = /api/v1/attachments/{id}/download
```

On any failure after the storage write, the stored object is automatically deleted before the error is raised, ensuring no orphaned files.

---

## Storage Abstraction

```
apps/api/app/services/storage/
├── __init__.py
├── base.py          ← BaseStorageProvider (ABC)
├── local.py         ← LocalStorageProvider (filesystem)
└── service.py       ← get_storage_provider() factory (lru_cache)
```

### Adding S3-Compatible Storage (Phase 18)

1. Create `apps/api/app/services/storage/s3.py` implementing `BaseStorageProvider`.
2. Set `STORAGE_PROVIDER=s3` in environment.
3. Update `get_storage_provider()` factory to handle the `"s3"` case.
4. No other code changes required — all callers use the abstraction.

---

## Data Model

```sql
attachments
├── id                UUID PK
├── user_id           UUID FK → users.id CASCADE
├── original_filename VARCHAR(255)     -- sanitised display name
├── storage_key       VARCHAR(512)     -- NEVER returned to clients
├── mime_type         VARCHAR(100)
├── file_size         INTEGER (bytes)
├── checksum_sha256   CHAR(64)         -- hex SHA-256
├── media_type        VARCHAR(20)      -- image | audio | document | video | other
├── status            VARCHAR(20)      -- uploading | ready | processing | failed | deleted
├── metadata_json     TEXT (nullable)  -- image dimensions, audio duration, etc.
├── error_message     TEXT (nullable)
├── deleted_at        TIMESTAMPTZ      -- soft delete marker
├── created_at        TIMESTAMPTZ
└── updated_at        TIMESTAMPTZ
```

**Important**: `storage_key` is an internal implementation detail. It is excluded from all Pydantic response schemas and is never transmitted to the frontend.

---

## API Endpoints

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/attachments/upload` | JWT | Upload file, validate, store, persist |
| `GET` | `/api/v1/attachments` | JWT | List own attachments (paginated, filterable) |
| `GET` | `/api/v1/attachments/{id}` | JWT | Get attachment metadata |
| `GET` | `/api/v1/attachments/{id}/download` | JWT | Stream file bytes |
| `DELETE` | `/api/v1/attachments/{id}` | JWT | Soft-delete + storage cleanup |

All endpoints enforce strict **user-ownership isolation** — a user can only access their own attachments. Attempting to access another user's attachment returns `404`.

---

## Frontend Components

```
apps/web/components/attachments/
├── AttachmentPicker.tsx    ← drag-and-drop, browse, paste
├── UploadProgress.tsx      ← animated progress bar, cancel, retry
├── AttachmentPreview.tsx   ← thumbnail, info, download, remove
├── AttachmentList.tsx      ← paginated list, filter, skeleton
├── AttachmentError.tsx     ← ARIA live error, dismiss, retry
└── index.ts                ← barrel export

apps/web/lib/
└── attachments-api.ts      ← typed fetch client (XHR progress)
```

---

## Future Integration Points

### Phase 11 — Image Intelligence (OpenCV)

1. After `AttachmentService.upload()`, enqueue an `ImageAnalysisJob`.
2. Job reads bytes via `storage.read(key)` and processes with OpenCV.
3. Results stored in `attachment.metadata_json` (dimensions, blur score, colour palette).
4. Vision AI (GPT-4o Vision or similar) receives the image bytes for description.

### Phase 13 — Voice & Microphone (Speech-to-Text)

1. Frontend uses `MediaRecorder` → uploads to `/attachments/upload` with `audio/*` MIME.
2. Backend enqueues a `TranscriptionJob`.
3. Job calls `BaseTranscriptionProvider.transcribe(audio_bytes)`.
4. Transcript stored; chat/NLP pipeline receives text.

### Phase 14 — Multimodal Chat Composer

1. Chat message payload extended with `attachment_ids: list[UUID]`.
2. `ChatService` resolves attachments, fetches bytes or metadata_json.
3. Composes a multimodal prompt (text + image bytes or transcribed text).

---

## Environment Configuration

```env
# Storage
STORAGE_PROVIDER=local         # "local" | "s3" (Phase 18)
UPLOAD_DIR=uploads             # relative to app working directory

# Limits
MAX_UPLOAD_SIZE_MB=25
MAX_IMAGE_SIZE_MB=10
MAX_DOCUMENT_SIZE_MB=25
MAX_AUDIO_DURATION_SECONDS=600

# Feature flags
ENABLE_IMAGE_FEATURES=true
ENABLE_VOICE_FEATURES=false    # enabled in Phase 13
```
