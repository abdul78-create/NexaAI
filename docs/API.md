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
  "detail": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "field": "optional_field_name"
}
```

- Streaming endpoints use `text/event-stream` (SSE)

---

## 1. Authentication

### POST `/auth/register`

Register a new user.

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
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "Abdul",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors:** `400 EMAIL_TAKEN`, `422 VALIDATION_ERROR`

---

### POST `/auth/login`

Authenticate and receive tokens.

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
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}
```
> Refresh token is set as `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict`

**Errors:** `401 INVALID_CREDENTIALS`

---

### POST `/auth/refresh`

Exchange refresh token for new access + refresh token pair.

**Request:** No body — refresh token read from cookie

**Response `200`:** Same as `/auth/login`

---

### POST `/auth/logout`

Invalidate refresh token.

**Response `204`:** No content

---

### GET `/auth/me`

Get current authenticated user.

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
