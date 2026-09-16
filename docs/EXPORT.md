# NexaAI — Conversation Export Architecture & Formats

## 1. Overview
NexaAI allows authenticated users to export conversations they own in three standard production formats:
1. **Markdown (`.md`)**
2. **JSON (`.json`)**
3. **PDF Document (`.pdf`)**

Exports are generated on-demand with sanitized HTTP headers (`Content-Disposition`) to prevent header injection or arbitrary file naming attacks.

---

## 2. Export API Endpoint

### `GET /api/v1/conversations/{conversation_id}/export`
* **Authentication**: Required.
* **Parameters**: `format=markdown` (default), `format=json`, `format=pdf`.
* **Security**: Enforces `Conversation.user_id == current_user.id`. Unauthorized attempts yield `404 Not Found`.

---

## 3. Supported Formats

### 3.1 Markdown (`format=markdown`)
Returns clean, formatted text document with:
- Title heading (`# Conversation Title`)
- Metadata block (Export date UTC, Model name)
- Structured message headers (`### User (timestamp)`, `### Assistant`)
- Preserved code blocks, tables, and attachment metadata.

### 3.2 JSON (`format=json`)
Returns a structured JSON payload for programmatic ingestion:
```json
{
  "conversation_id": "11111111-2222-3333-4444-555555555555",
  "title": "Quantum Research",
  "model": "nexa-pro",
  "created_at": "2026-09-16T12:00:00Z",
  "updated_at": "2026-09-16T12:05:00Z",
  "messages": [
    {
      "id": "22222222-3333-4444-5555-666666666666",
      "role": "user",
      "content": "Explain entanglement",
      "model": "nexa-pro",
      "input_tokens": 12,
      "output_tokens": 45,
      "created_at": "2026-09-16T12:01:00Z"
    }
  ]
}
```

### 3.3 PDF Document (`format=pdf`)
Generates server-side PDF binary bytes with:
- PDF 1.4 specification compliance.
- Structured header, metadata overview, and page stream layout.
- Wrapped message content and role indicators.
- Sanitized special character handling.
