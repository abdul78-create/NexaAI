# NexaAI Upload Security Model

> **Phase 10** — Multimodal Foundation & Secure File Infrastructure

This document describes the security controls applied to all file uploads in NexaAI.

---

## Validation Pipeline

Every uploaded file passes through the following validation layers **in order**. A failure at any layer returns a `400 Bad Request` with a typed error code before any data is written to disk.

```
Layer 1 — Empty file check
    └── Rejects zero-byte uploads immediately.

Layer 2 — Extension allowlist
    └── Only explicitly allowed extensions are accepted.
    └── Unknown or executable extensions (exe, sh, bat, js, …) are rejected.

Layer 3 — MIME type allowlist
    └── The client-declared Content-Type must be in the configured allowlist.
    └── Unsupported MIME types are rejected regardless of extension.

Layer 4 — Extension ↔ MIME consistency
    └── The declared MIME type must be compatible with the extension.
    └── Prevents: .jpg file declared as image/png.

Layer 5 — Magic byte / content-signature validation
    └── File bytes are inspected for known signatures (JPEG: 0xFF 0xD8 0xFF, PNG: 0x89PNG…, PDF: %PDF…).
    └── Prevents: PNG bytes renamed to .jpg and declared as image/jpeg.

Layer 6 — File size enforcement
    └── Global limit: MAX_UPLOAD_SIZE_MB (default 25 MB).
    └── Per-type limits: MAX_IMAGE_SIZE_MB (default 10 MB).
```

---

## Allowed File Types

### Images

| Extension | MIME Type | Magic Signature |
| :--- | :--- | :--- |
| `.jpg`, `.jpeg` | `image/jpeg` | `0xFF 0xD8 0xFF` |
| `.png` | `image/png` | `0x89 PNG 0x0D 0x0A 0x1A 0x0A` |
| `.webp` | `image/webp` | `RIFF ... WEBP` |
| `.gif` | `image/gif` | `GIF87a` or `GIF89a` |

### Documents

| Extension | MIME Type | Magic Signature |
| :--- | :--- | :--- |
| `.pdf` | `application/pdf` | `%PDF` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | None (ZIP-based) |
| `.txt` | `text/plain` | None |
| `.md` | `text/plain` or `text/markdown` | None |

### Audio (Phase 13 placeholder)

| Extension | MIME Type |
| :--- | :--- |
| `.webm` | `audio/webm` |
| `.mp3` | `audio/mpeg` |
| `.wav` | `audio/wav` |
| `.m4a` | `audio/x-m4a` or `audio/mp4` |

---

## Filename Sanitization

User-supplied filenames are **never used as storage paths**. Instead:

1. The original filename is sanitized for display:
   - Path separators (`/`, `\`) → `_`
   - Null bytes and control characters → removed
   - Leading dots and spaces → stripped
   - Consecutive dots → collapsed to single dot
   - Non-word characters → `_`
   - Empty result → `"upload"`

2. The storage key is **independently generated**:
   ```
   {user_id_prefix_8_chars}/{uuid4_hex}-{sanitized_filename}
   ```
   This key is opaque and is never transmitted to the client.

---

## Storage Key Security

The `storage_key` column in the database is:
- **Never** included in any API response schema.
- **Never** logged at INFO level.
- Not guessable — contains a UUID4 component.
- Not constructed from user-supplied input — only the sanitized display name suffix is used.

**Path Traversal Protection**:
`LocalStorageProvider` resolves the storage key to an absolute path and verifies that the result is a child of the configured `UPLOAD_DIR` using `Path.relative_to()`. Any key that resolves outside the upload directory raises a `PermissionError` and the upload is rejected.

---

## Ownership Enforcement

Every API endpoint that reads, downloads, or deletes an attachment includes:

```python
Attachment.user_id == current_user.id
Attachment.deleted_at.is_(None)
```

A user who does not own an attachment receives `404 Not Found` (not `403 Forbidden`), which avoids leaking the existence of other users' files.

---

## Soft Delete

Deleting an attachment:
1. Removes the stored file from the storage provider first.
2. Sets `deleted_at = now()` and `status = "deleted"` on the database record.

Soft-deleted records are excluded from all list and get queries. The row is retained for auditing purposes but the file bytes are immediately removed.

---

## Checksum Integrity

A SHA-256 digest is computed over the raw upload bytes before writing to storage. This provides:
- **Integrity verification** — detect silent corruption.
- **Deduplication** opportunities (future).
- **Audit evidence** — the checksum is stored in the database.

---

## Known Limitations & Future Hardening

| Issue | Current State | Planned Fix |
| :--- | :--- | :--- |
| DOCX magic bytes | DOCX is a ZIP file — no dedicated magic check | Phase 11: Use `zipfile` inspection to verify OOXML structure |
| Antivirus scanning | Not implemented | Phase 18: ClamAV integration for production deployments |
| Rate limiting per user | Global IP rate limiting only | Phase 15: Per-user upload quota enforcement |
| Image dimension limits | Not enforced | Phase 11: Enforce MAX_IMAGE_WIDTH/HEIGHT via Pillow |
| Audio duration limits | Config placeholder only | Phase 13: Enforce MAX_AUDIO_DURATION_SECONDS via mutagen |
| Object storage | Local filesystem only | Phase 18: S3-compatible storage (MinIO / AWS S3 / GCS) |
| Expiring download URLs | Static API route | Phase 18: Pre-signed URLs for S3 storage |
