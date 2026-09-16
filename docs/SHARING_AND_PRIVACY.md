# NexaAI — Secure Sharing & Privacy Specification

## 1. Overview
NexaAI implements cryptographically secure, hashed-token public sharing for conversations.

Public share links allow users to publish read-only snapshots of their conversations without exposing account credentials, email addresses, user IDs, hidden system prompts, or private storage paths.

---

## 2. Token Security Architecture

### 2.1 Cryptographic Token Generation
- Share tokens are generated via `secrets.token_urlsafe(24)`.
- Tokens are stored in the database strictly as **SHA-256 hashes** (`token_hash`).
- Raw tokens are never logged or stored in telemetry records.

### 2.2 Expiration & Revocation Rules
- Expiration options: 1 Day, 7 Days, 30 Days, or Never.
- Owners can toggle link status (`is_enabled: false`) or revoke links immediately (`revoked_at`).
- Requests to expired, disabled, or revoked share links return `HTTP 410 Gone`.

---

## 3. API Endpoints

| Endpoint | Method | Scope | Description |
|---|---|---|---|
| `/api/v1/conversations/{id}/share` | POST | Owner | Create or re-enable public share link |
| `/api/v1/conversations/{id}/share` | GET | Owner | Retrieve active share status & metrics |
| `/api/v1/conversations/{id}/share` | PATCH | Owner | Enable/disable or change expiration |
| `/api/v1/conversations/{id}/share` | DELETE | Owner | Revoke share link immediately |
| `/api/v1/shared/{token}` | GET | Public | Public read-only conversation view |

---

## 4. Privacy Protection Controls
1. **Robots Indexing Prevention**: All public `/api/v1/shared/{token}` responses append header `X-Robots-Tag: noindex, nofollow`.
2. **Account Anonymization**: Public responses contain only conversation title, model name, timestamps, message roles, message contents, and safe attachment metadata (original filename, mime type, size).
3. **No Account Leakage**: Owner email, user UUID, authorization headers, or internal database IDs are strictly omitted from public views.
4. **Read-Only Enclosure**: Public viewers cannot inject messages into shared conversations or mutate state.
