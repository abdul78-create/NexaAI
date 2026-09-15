# NexaAI — Database Design

> PostgreSQL schema, entity relationships, indexing strategy, and migration approach.

---

## 1. Entity Relationship Diagram

```
users
  │
  ├──< conversations >──< messages
  │
  ├──< nlp_analyses
  │
  ├──< documents >──< document_chunks
  │                        │
  │                        └── (pgvector embedding)
  │
  └──< refresh_tokens
```

---

## 2. Schema

### `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

---

### `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,  -- hashed, never stored raw
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

### `conversations`

```sql
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'New Conversation',
  model         TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt TEXT,
  pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_search ON conversations USING gin(to_tsvector('english', title));
```

---

### `messages`

```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER,
  model           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
```

---

### `nlp_analyses`

```sql
CREATE TABLE nlp_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_text      TEXT NOT NULL,
  text_length     INTEGER NOT NULL,
  result          JSONB NOT NULL,   -- full analysis result stored as JSON
  processing_ms   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nlp_user ON nlp_analyses(user_id, created_at DESC);
```

> Storing result as JSONB is intentional — NLP output structure may evolve.

---

### `documents`

```sql
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  storage_path TEXT NOT NULL,       -- local path or object storage key
  status       TEXT NOT NULL DEFAULT 'processing'
               CHECK (status IN ('processing', 'ready', 'failed')),
  page_count   INTEGER,
  chunk_count  INTEGER,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id, created_at DESC);
```

---

### `document_chunks`

```sql
-- Requires pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  page_number INTEGER,
  embedding   VECTOR(1536),     -- text-embedding-3-small dimension
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for approximate nearest neighbor search
-- Build after loading data (not before)
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_chunks_document ON document_chunks(document_id, chunk_index ASC);
```

---

### `usage_logs`

```sql
CREATE TABLE usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,   -- 'chat_message' | 'nlp_analysis' | 'document_query'
  tokens_used     INTEGER DEFAULT 0,
  model           TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_user_date ON usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_event_type ON usage_logs(event_type);
```

---

## 3. Migration Strategy (Alembic)

```
apps/api/
└── alembic/
    ├── env.py              # async SQLAlchemy setup
    ├── script.py.mako      # migration template
    └── versions/
        ├── 001_create_users.py
        ├── 002_create_auth_tokens.py
        ├── 003_create_conversations.py
        ├── 004_create_messages.py
        ├── 005_create_nlp_analyses.py
        ├── 006_create_documents.py
        └── 007_create_usage_logs.py
```

### Commands

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# Show current revision
alembic current
```

---

## 4. Performance Considerations

### Query Patterns

| Pattern | Index | Strategy |
|---------|-------|----------|
| List user conversations | `(user_id, updated_at DESC)` | Covered index |
| Search conversation titles | GIN full-text | PostgreSQL FTS |
| Load conversation messages | `(conversation_id, created_at ASC)` | Sorted by time |
| Vector similarity search | IVFFlat on embedding | Approximate NN |
| Usage reporting by date | `(user_id, created_at DESC)` | Range scans |

### Connection Pooling

- Development: `asyncpg` direct connection
- Production: `PgBouncer` in transaction mode recommended

### JSONB

- `nlp_analyses.result` stored as JSONB allows schema-free evolution
- Add GIN index if search within analysis results is needed later:
  ```sql
  CREATE INDEX idx_nlp_result ON nlp_analyses USING gin(result);
  ```

---

## 5. Docker Compose (PostgreSQL)

```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: nexaai
      POSTGRES_USER: nexaai_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nexaai_user -d nexaai"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

> Using `pgvector/pgvector:pg16` image includes both PostgreSQL 16 and the pgvector extension pre-installed.
