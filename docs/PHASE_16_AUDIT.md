# Phase 16 — Conversation Search, Export, and Secure Sharing Audit

## 1. Executive Summary
This document provides the architectural audit of the NexaAI codebase prior to implementing **Phase 16 (Global Search, Export, and Secure Sharing)**.

The audit identifies existing backend models, services, routers, database schemas, frontend components, and security bounds to ensure zero duplication and strict user isolation.

---

## 2. Codebase Audit & Reusable Components

### 2.1 Backend Services & Database
- **Existing Models**: `User`, `Conversation`, `ChatMessage`, `Attachment`, `ChatMessageAttachment`, `AIUsageLog`, `SpeechTranscription`, `UserPreferences`.
- **Database Search Capabilities**:
  - `ChatMessage` table contains `content` (Text) and `role` (`user | assistant | system`).
  - `Conversation` table contains `title` (String), `user_id` (UUID), `created_at`, `updated_at`.
- **Export Needs**:
  - Markdown formatting service for conversations.
  - JSON serializer for conversation structure & messages.
  - Server-side PDF generator using ReportLab / HTML-to-PDF or clean structured canvas/report layout.
- **Sharing Needs**:
  - New ORM model `ConversationShare` (`apps/api/app/db/models/share.py`) and migration `011_conversation_shares.py`.
  - Secure random token generation (`secrets.token_urlsafe(24)`), storing SHA-256 `token_hash` in DB.
  - Expiration support (`expires_at`), revocation support (`is_enabled`), and access counter tracking.

### 2.2 Frontend Infrastructure
- **Search UI**: Command Palette / Search Dialog overlay triggered via `Cmd+K` / `Ctrl+K` or sidebar search icon.
- **Export & Share UI**: Dropdown menu in [`ChatHeader.tsx`](file:///c:/Users/Abdul/Desktop/Chatbot/apps/web/components/chat/ChatHeader.tsx) featuring Export (Markdown, JSON, PDF) and Share Dialog (Generate Link, Expiration, Revoke, Copy).
- **Public Share Route**: `/shared/[token]` route rendering read-only conversation view for unauthenticated or public viewers without exposing owner secrets or edit controls.

---

## 3. Security & Privacy Audit
1. **Database-Level Ownership Enforcement**:
   - Search endpoints MUST filter by `Conversation.user_id == current_user.id` and `ChatMessage.conversation.has(user_id=current_user.id)`.
   - Export endpoints MUST verify `Conversation.user_id == current_user.id`.
2. **Public Share Security**:
   - Share tokens stored as SHA-256 hashes (`token_hash`) in DB.
   - Public endpoint `/api/v1/shared/{token}` yields read-only payload.
   - Owner profile details (email, user ID) are NEVER returned in public share response.
   - Headers include `X-Robots-Tag: noindex, nofollow` to prevent search engine indexing of shared links.
3. **No Header / Path Injection**:
   - Export filenames sanitized to prevent header injection.
