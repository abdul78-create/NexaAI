# NexaAI — API Reference

> REST API specification for all backend endpoints. Base URL: `http://localhost:8000`

---

## Conventions

- All requests and responses use `application/json`
- Authentication: `Authorization: Bearer <access_token>`
- Timestamps: ISO 8601 (`2024-01-15T10:30:00Z`)
- Errors follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "request_id": "d1c24e6a-7a54-4670-a359-d8fe670d8a59",
    "details": null
  }
}
```

- Streaming endpoints use `text/event-stream` (SSE)

---

## 0. System & Health

### GET `/health`
Check application service liveness.

**Query Parameters:**
- `check_db` (boolean, optional): Probe PostgreSQL connectivity.

**Response `200`:**
```json
{
  "status": "healthy",
  "service": "nexaai-api",
  "version": "0.1.0",
  "environment": "development",
  "database": "connected"
}
```

---

### GET `/api/v1/health`
Versioned application liveness probe.

---

### GET `/api/v1/system/info`
Retrieve system runtime metadata.

**Response `200`:**
```json
{
  "app_name": "NexaAI API",
  "version": "0.1.0",
  "environment": "development",
  "debug_mode": true,
  "api_prefix": "/api/v1"
}
```

---

## 1. Authentication

### POST `/api/v1/auth/register`

Register a new user account with Argon2id-hashed credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "display_name": "Abdul"
}
```

**Response `201`:**
```json
{
  "id": "b6b4e60e-0c05-4e1c-88e0-d3980df8136a",
  "email": "user@example.com",
  "display_name": "Abdul",
  "avatar_url": null,
  "is_active": true,
  "is_verified": false,
  "created_at": "2026-09-16T11:26:39.897299"
}
```

**Errors:** `400 Bad Request` (Email already taken), `422 Unprocessable Content` (Password complexity validation)

---

### POST `/api/v1/auth/login`

Authenticate email and password, issuing a JWT access token and an HttpOnly refresh cookie.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "b6b4e60e-0c05-4e1c-88e0-d3980df8136a",
    "email": "user@example.com",
    "display_name": "Abdul"
  }
}
```
> Refresh token is set as `Set-Cookie: nexaai_refresh_token=...; HttpOnly; SameSite=Lax; Path=/`

**Errors:** `401 Unauthorized` (Invalid credentials), `403 Forbidden` (Account disabled)

---

### POST `/api/v1/auth/refresh`

Exchange a valid refresh token cookie for a new access token and rotated refresh token.

**Request:** No body — refresh token automatically read from `nexaai_refresh_token` cookie (or optional fallback `{ "refresh_token": "..." }`)

**Response `200`:** Same as `/api/v1/auth/login` (with a newly rotated refresh token cookie)

**Errors:** `401 Unauthorized` (Invalid, expired, or revoked refresh token)

---

### POST `/api/v1/auth/logout`

Revoke the refresh token record in the database and clear the session cookie.

**Response `204`:** No content

---

### GET `/api/v1/auth/me`

Get profile and usage metrics for the authenticated user.
Header: `Authorization: Bearer <access_token>`

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "Abdul",
  "avatar_url": null,
  "created_at": "2024-01-15T10:30:00Z",
  "usage": {
    "total_tokens": 12500,
    "conversations": 24,
    "documents": 3
  }
}
```

---

## 2. Conversations

### GET `/conversations`

List all conversations for the authenticated user.

**Query params:**
- `limit` (int, default 20, max 100)
- `offset` (int, default 0)
- `search` (string, optional)

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Python async patterns",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "message_count": 12,
      "model": "gpt-4o-mini",
      "pinned": false
    }
  ],
  "total": 24,
  "limit": 20,
  "offset": 0
}
```

---

### POST `/conversations`

Create a new conversation.

**Request:**
```json
{
  "title": "Optional title",
  "model": "gpt-4o-mini",
  "system_prompt": "Optional custom system prompt"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "title": "New Conversation",
  "model": "gpt-4o-mini",
  "created_at": "..."
}
```

---

### GET `/conversations/{id}`

Get a conversation with all its messages.

**Response `200`:**
```json
{
  "id": "uuid",
  "title": "Python async patterns",
  "model": "gpt-4o-mini",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "How does asyncio work?",
      "created_at": "..."
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "asyncio is Python's...",
      "created_at": "...",
      "tokens_used": 312
    }
  ]
}
```

---

### DELETE `/conversations/{id}`

Delete a conversation.

**Response `204`:** No content

---

### PATCH `/conversations/{id}`

Update conversation title or pin status.

**Request:**
```json
{
  "title": "New title",
  "pinned": true
}
```

---

## 3. Chat

### POST `/chat/message` → SSE Stream

Send a message and stream the AI response.

**Request:**
```json
{
  "conversation_id": "uuid",
  "content": "Explain quantum entanglement simply",
  "model": "gpt-4o-mini"
}
```

**Response:** `text/event-stream`

```
data: {"type":"start","message_id":"uuid"}

data: {"type":"chunk","delta":"Quantum "}

data: {"type":"chunk","delta":"entanglement "}

data: {"type":"chunk","delta":"is..."}

data: {"type":"done","message_id":"uuid","tokens_used":145}

data: [DONE]
```

**Errors:** `402 QUOTA_EXCEEDED`, `503 AI_UNAVAILABLE`

---

## 4. NLP Analysis

### POST `/nlp/analyze`

Analyze text with the NLP pipeline.

**Request:**
```json
{
  "text": "The product launch exceeded all expectations. Customers are thrilled.",
  "analyses": ["sentiment", "entities", "keywords", "readability", "intent", "summary"]
}
```

**Response `200`:**
```json
{
  "id": "uuid",
  "text_length": 68,
  "processing_ms": 234,
  "sentiment": {
    "label": "positive",
    "score": 0.87,
    "components": {
      "positive": 0.87,
      "negative": 0.02,
      "neutral": 0.11
    }
  },
  "entities": [
    { "text": "product launch", "label": "EVENT", "start": 4, "end": 18 }
  ],
  "keywords": ["product launch", "expectations", "customers"],
  "readability": {
    "score": 72.4,
    "grade_level": "8th grade",
    "avg_sentence_length": 9.5
  },
  "intent": "reporting_positive_outcome",
  "summary": "A product launch succeeded beyond expectations with positive customer reception."
}
```

---

### GET `/nlp/history`

Get NLP analysis history for the authenticated user.

**Query params:** `limit`, `offset`

**Response:** Paginated list of past analyses

---

## 5. Documents

### POST `/documents/upload`

Upload a document for processing.

**Request:** `multipart/form-data`
- `file`: PDF, DOCX, or TXT (max 10MB)

**Response `201`:**
```json
{
  "id": "uuid",
  "filename": "report.pdf",
  "size_bytes": 245000,
  "status": "processing",
  "created_at": "..."
}
```

---

### GET `/documents`

List uploaded documents.

---

### GET `/documents/{id}`

Get document metadata and processing status.

**Response:**
```json
{
  "id": "uuid",
  "filename": "report.pdf",
  "status": "ready",
  "page_count": 12,
  "chunk_count": 48,
  "created_at": "..."
}
```

**Status values:** `processing` | `ready` | `failed`

---

### POST `/documents/{id}/query` → SSE Stream

Ask a question about a document.

**Request:**
```json
{
  "question": "What were the main findings in chapter 3?",
  "conversation_id": "optional-uuid"
}
```

**Response:** SSE stream (same format as `/chat/message`) with source citations appended in `done` event:

```
data: {"type":"done","sources":[{"chunk_id":"uuid","page":3,"excerpt":"..."}]}
```

---

### DELETE `/documents/{id}`

Delete a document and its embeddings.

---

## 6. Users

### PATCH `/users/me`

Update user profile.

**Request:**
```json
{
  "display_name": "Abdul Rahman",
  "avatar_url": "https://..."
}
```

---

### GET `/users/me/usage`

Get detailed usage statistics.

**Response:**
```json
{
  "period": "2024-01",
  "total_tokens": 125000,
  "input_tokens": 45000,
  "output_tokens": 80000,
  "conversations": 24,
  "nlp_analyses": 18,
  "documents_processed": 3,
  "daily_usage": [
    { "date": "2024-01-15", "tokens": 8500 }
  ]
}
```

---

## 7. Health

### GET `/health`

Service health check.

**Response `200`:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "ok",
  "ai_provider": "openai"
}
```
