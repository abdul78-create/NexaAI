# NexaAI — Global Search Architecture & Specifications

## 1. Overview
NexaAI implements authenticated, user-isolated global search across conversation titles and message content.

Search queries are evaluated authoritatively at the database level using parameterized ORM expressions to enforce strict multi-tenant privacy.

---

## 2. API Endpoints

### `GET /api/v1/search`
* **Authentication**: Required (`Bearer` access token).
* **Parameters**:
  * `q` (string): Search query string.
  * `conversation_id` (UUID, optional): Filter by conversation.
  * `role` (string, optional): Filter message role (`user` | `assistant` | `system`).
  * `from_date` / `to_date` (datetime, optional): Date range bounds.
  * `page` (int, default: 1): Page number.
  * `page_size` (int, default: 20, max: 100): Results per page limit.

### Response Schema (`SearchResponse`)
```json
{
  "query": "quantum",
  "total_conversations": 1,
  "total_messages": 3,
  "total_results": 4,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "type": "conversation",
      "conversation_id": "11111111-2222-3333-4444-555555555555",
      "title": "Quantum Computing Research",
      "role": null,
      "snippet": "...quantum entanglement and superposition...",
      "match_field": "title",
      "created_at": "2026-09-16T12:00:00Z"
    }
  ]
}
```

---

## 3. Database Search Strategy & Security
- **Isolation**: All queries append `Conversation.user_id == current_user.id`.
- **Sanitization**: SQL wildcard characters (`%`, `_`) in user inputs are safely escaped.
- **Snippet Excerpts**: Text matching creates a 160-character contextual snippet highlighting match position.
- **Scaling Path**: PostgreSQL Full-Text Search (`tsvector` / `pg_trgm`) can be enabled seamlessly when dataset size scales beyond standard indexed text queries.
