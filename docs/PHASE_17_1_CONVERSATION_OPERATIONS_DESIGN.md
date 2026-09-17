# Milestone 17.1 Technical Design — Advanced Conversation Operations & Response Control

## 1. Executive Summary

This document provides the validated, production-grade technical design for **Milestone 17.1 (Advanced Conversation Operations & Response Control)** of NexaAI.

Following a design-validation review against the existing codebase (commit `575080c`), this document resolves all data-model, branching, state transition, API contract, and Phase 16 integration ambiguities prior to creating Alembic migration `012`.

---

## 2. Existing Schema Audit & Verification Findings

A code inspection of current SQLAlchemy models ([`chat.py`](file:///C:/Users/Abdul/Desktop/Chatbot/apps/api/app/db/models/chat.py)) and Alembic migrations ([`002_chat_conversations.py`](file:///C:/Users/Abdul/Desktop/Chatbot/apps/api/alembic/versions/002_chat_conversations.py)) confirms:

| Field / Model | Current Status | Source File | Migration 012 Action |
|---|---|---|---|
| `Conversation.is_archived` | **EXISTS** | [`chat.py:L38`](file:///C:/Users/Abdul/Desktop/Chatbot/apps/api/app/db/models/chat.py#L38) | **Do NOT recreate**. Add API/UI workspace controls only. |
| `Conversation.is_pinned` | **MISSING** | — | **Add Column** (`Boolean`, server_default `false`, nullable=False). |
| `Conversation.deleted_at` | **MISSING** | — | **Add Column** (`DateTime(timezone=True)`, nullable=True, indexed). |
| `Conversation.folder_id` | **MISSING** | — | **Add Column** (`Uuid`, FK `folders.id` ON DELETE SET NULL, indexed). |
| `Conversation.active_leaf_message_id` | **MISSING** | — | **Add Column** (`Uuid`, FK `chat_messages.id` ON DELETE SET NULL, indexed). |
| `Folder` model (`folders` table) | **MISSING** | — | **Create Table** (`id`, `user_id`, `name`, `color`, `created_at`, `updated_at`). |
| `ChatMessage.parent_message_id` | **MISSING** | — | **Add Column** (`Uuid`, FK `chat_messages.id` ON DELETE SET NULL, indexed). |

---

## 3. Validated Message-Tree & Branching Model

### 3.1 Rooted Parent-Child Tree Topology

Rather than an arbitrary "DAG", message history within a conversation is structured as a **Rooted Parent-Child Tree (Arborescence)**:
- Every message node has **at most one parent pointer** (`parent_message_id`).
- A parent node can have **multiple child messages** (representing alternate user prompt edits or regenerated assistant responses).
- **No cross-linking or multiple parents** are allowed.

```text
Message Tree Topology Example:

[Msg 1: User "Explain Python async"] (Root: parent_message_id = null)
  │
  ├──> [Msg 2: Assistant "Asyncio uses an event loop..."] (Child of Msg 1, Branch 1/2)
  │      │
  │      └──> [Msg 3: User "Give an example"] (Child of Msg 2)
  │             │
  │             └──> [Msg 4: Assistant "import asyncio..."] (Child of Msg 3, Active Leaf A)
  │
  ├──> [Msg 5: Assistant "Python async allows non-blocking execution..."] (Child of Msg 1, Branch 2/2 - Regenerated)
  │      │
  │      └──> [Msg 6: User "How does it compare to threads?"] (Child of Msg 5)
  │             │
  │             └──> [Msg 7: Assistant "Threads share memory..."] (Child of Msg 6, Active Leaf B)
  │
  └──> [Msg 1': User "Explain Python async vs multithreading"] (Sibling of Msg 1: parent_message_id = null)
         │
         └──> [Msg 8: Assistant "Async is single-threaded cooperatively..."] (Child of Msg 1', Active Leaf C)
```

### 3.2 Active Path Persistence Strategy

To ensure multi-device synchronization and page-refresh consistency:
1. **Database Persistence**: `Conversation.active_leaf_message_id` stores the UUID of the currently active leaf node.
2. **Path Resolution Algorithm**:
   - Given `active_leaf_message_id`, the active conversation thread is constructed by starting at `active_leaf_message_id` and following `parent_message_id` pointers recursively up to the root (`parent_message_id is Null`).
   - The resulting list is reversed to return chronological order (`[Root, ..., Leaf]`).
3. **Branch Switching**:
   - Calling `POST /api/v1/chat/conversations/{id}/select-branch` with `leaf_message_id` updates `Conversation.active_leaf_message_id` in the database.
   - Page refresh or opening the conversation on another browser immediately loads the persisted active path!
4. **Sending from Historical Nodes**:
   - Sending a new message while viewing an intermediate branch sets `parent_message_id = selected_message_id` and updates `Conversation.active_leaf_message_id` to the new response.

### 3.3 Edit Semantics (User Prompt Edits)
- **Model Choice**: **Sibling Alternative at the Same Point in History**.
- When User edits `Msg 1` to `Msg 1'`:
  - `Msg 1'` is created with `parent_message_id = Msg 1.parent_message_id` (sharing the exact same parent as `Msg 1`).
  - `Msg 1` and `Msg 1'` become sibling prompt alternatives.
  - The AI Orchestrator streams the completion for `Msg 1'`, generating child `Msg 8` (role=`assistant`, `parent_message_id = Msg 1'.id`).
  - `Conversation.active_leaf_message_id` is updated to `Msg 8.id`.
  - The original branch (`Msg 1 -> Msg 2 -> Msg 3 -> Msg 4`) remains completely untouched in the database.

### 3.4 Regeneration Semantics
- **API Endpoint**: `POST /api/v1/chat/messages/{assistant_message_id}/regenerate`
- Accepts: `assistant_message_id` (UUID of assistant message to regenerate).
- Execution Steps:
  1. Backend validates `assistant_message_id` belongs to an owned conversation.
  2. Verifies `message.role == "assistant"`.
  3. Identifies `parent_user_message_id = assistant_message.parent_message_id`.
  4. Resolves context path up to `parent_user_message_id`.
  5. Streams AI completion for `parent_user_message_id` with optional new instructions.
  6. Creates `new_assistant_message` with `parent_message_id = parent_user_message_id`.
  7. Sets `Conversation.active_leaf_message_id = new_assistant_message.id`.

---

## 4. Validated Conversation Lifecycle & State Rules

### 4.1 State Matrix & Integration Policies

| State | `is_pinned` | `is_archived` | `deleted_at` | Default Search | Search with Filter | Export Access | Public Share Access | Chat Completion |
|---|---|---|---|---|---|---|---|---|
| **Active** | `False` | `False` | `None` | Included | Included | Allowed | Active (`200 OK`) | Allowed |
| **Pinned** | `True` | `False` | `None` | Included | Included | Allowed | Active (`200 OK`) | Allowed |
| **Archived** | Preserved | `True` | `None` | Excluded | Included (`archived=true`) | Allowed | Active (`200 OK` Read-Only) | Blocked (Prompt Un-archive) |
| **Trashed** | Preserved | Preserved | `Timestamp` | Excluded | Excluded | Denied (`404`) | Blocked (`410 Gone`) | Denied |
| **Restored** | **Preserved** | **Preserved** | `None` | Restored | Restored | Restored | **Restored (`200 OK`)** | Restored |

### 4.2 State Rules & Product Policies
1. **Metadata Preservation on Restore**: Restoring a trashed conversation clears `deleted_at` while **preserving `is_pinned`**, `is_archived`, and `folder_id`. Public share links instantly function again.
2. **Archived Public Share Behavior**: Archiving a conversation keeps existing public share links active in read-only mode, but disables sending new messages until un-archived by the owner.
3. **Folder Deletion Protection**: Deleting a folder un-files member conversations (`folder_id = null`) via `ON DELETE SET NULL`. Member conversations are never deleted.

---

## 5. API Contracts & Query Parameters

### 5.1 Folder Operations
- `POST /api/v1/folders`: `{"name": "Research", "color": "indigo"}` -> `201 Created` `FolderResponse`.
- `GET /api/v1/folders`: `200 OK` `List[FolderResponse]`.
- `PATCH /api/v1/folders/{id}`: `{"name": "New Name", "color": "emerald"}` -> `200 OK`.
- `DELETE /api/v1/folders/{id}`: `204 No Content` (Conversations set `folder_id = null`).

### 5.2 Conversation Workspace Operations
- `GET /api/v1/chat/conversations`:
  - Query parameters: `folder_id: Optional[UUID]`, `is_pinned: Optional[bool]`, `is_archived: bool = False`, `is_trashed: bool = False`.
- `PATCH /api/v1/conversations/{id}`:
  - Request body: `{"title": "...", "is_pinned": true, "is_archived": false, "folder_id": "..."}`.
- `POST /api/v1/conversations/{id}/trash`: Moves conversation to trash (`deleted_at = now()`).
- `POST /api/v1/conversations/{id}/restore`: Clears `deleted_at`.
- `DELETE /api/v1/conversations/{id}/purge`: Permanent hard-delete from trash.

### 5.3 Message Editing & Regeneration
- `POST /api/v1/chat/messages/{user_message_id}/edit`:
  - Request body: `{"content": "Updated prompt", "model": "nexa-pro"}` -> Streams new branch.
- `POST /api/v1/chat/messages/{assistant_message_id}/regenerate`:
  - Request body: `{"instructions": "Simplify response", "model": "nexa-pro"}` -> Streams new sibling assistant response.
- `POST /api/v1/chat/conversations/{id}/select-branch`:
  - Request body: `{"leaf_message_id": "..."}` -> Updates `Conversation.active_leaf_message_id`.

---

## 6. Phase 16 Subsystem Integration Touches

| Phase 16 Module | File Path | Code Modification |
|---|---|---|
| **Global Search** | [`search_service.py`](file:///C:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/search_service.py) | Add `Conversation.deleted_at.is_(None)`. Include archived conversations only when `include_archived=True`. |
| **Conversation Export** | [`export_service.py`](file:///C:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/export_service.py) | Update `get_conversation_for_export` to traverse active branch tree from `active_leaf_message_id`. Block trashed conversations (`404`). |
| **Secure Sharing** | [`share_service.py`](file:///C:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/share_service.py) | Update `get_public_shared_view` to return `410 Gone` if `Conversation.deleted_at is not None`. |
| **Chat Service** | [`chat_service.py`](file:///C:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/chat_service.py) | Update list and detail services to handle `is_pinned`, `folder_id`, `deleted_at`, and tree path resolution. |

---

## 7. Migration Plan (`011_conversation_shares.py` -> `012_phase17_enhancements.py`)

Alembic migration `012_phase17_enhancements.py` will execute the following explicit schema changes:

```python
"""create folders table and add phase 17 conversation/message columns

Revision ID: 012_phase17_enhancements
Revises: 011_conversation_shares
"""
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    # 1. Create folders table
    op.create_table(
        'folders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=30), nullable=False, server_default='indigo'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_user_folder_name')
    )
    op.create_index(op.f('ix_folders_user_id'), 'folders', ['user_id'], unique=False)

    # 2. Update conversations table (DO NOT TOUCH is_archived - ALREADY EXISTS)
    op.add_column('conversations', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('conversations', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('conversations', sa.Column('folder_id', sa.Uuid(), nullable=True))
    op.add_column('conversations', sa.Column('active_leaf_message_id', sa.Uuid(), nullable=True))

    op.create_foreign_key('fk_conversations_folder_id', 'conversations', 'folders', ['folder_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_conversations_deleted_at'), 'conversations', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_conversations_folder_id'), 'conversations', ['folder_id'], unique=False)

    # 3. Update chat_messages table
    op.add_column('chat_messages', sa.Column('parent_message_id', sa.Uuid(), nullable=True))
    op.create_foreign_key('fk_chat_messages_parent_message_id', 'chat_messages', 'chat_messages', ['parent_message_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_chat_messages_parent_message_id'), 'chat_messages', ['parent_message_id'], unique=False)

    # Add foreign key for active_leaf_message_id after chat_messages exists
    op.create_foreign_key('fk_conversations_active_leaf_message_id', 'conversations', 'chat_messages', ['active_leaf_message_id'], ['id'], ondelete='SET NULL')
```

---

## 8. Verified Implementation Sequence

```text
1. Sub-phase 17.1.1: Migration 012 & ORM Models (folders, is_pinned, deleted_at, folder_id, active_leaf_message_id, parent_message_id)
2. Sub-phase 17.1.2: Backend Workspace & Folder Services & API Routers
3. Sub-phase 17.1.3: Frontend Sidebar Workspace (Pinned, Folders, Archived, Trash Modals)
4. Sub-phase 17.1.4: Message Tree Path Resolution, Edit & Regeneration Backend Services
5. Sub-phase 17.1.5: Branch Navigation UI (`< 2 / 3 >`), Inline Editor & Integration Test Suite
```
