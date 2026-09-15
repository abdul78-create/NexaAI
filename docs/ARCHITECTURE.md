# NexaAI — Architecture

> System design, component responsibilities, data flow, and architectural decisions.

---

## 1. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        BROWSER                          │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │          Next.js 14 App (apps/web)              │   │
│   │  React · TypeScript · Tailwind · shadcn/ui      │   │
│   │  Zustand · TanStack Query · Motion              │   │
│   └──────────────────────┬──────────────────────────┘   │
└─────────────────────────-│──────────────────────────────┘
                           │ HTTPS REST + SSE Streaming
                           ▼
┌──────────────────────────────────────────────────────────┐
│              FastAPI Backend (apps/api)                  │
│  Python 3.12 · Uvicorn · Pydantic · SQLAlchemy 2        │
│  JWT Auth · Argon2id · OpenAI SDK · spaCy · PyMuPDF     │
│                                                          │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │  /auth    │ │  /chat    │ │  /nlp    │ │  /docs   │  │
│  │  router   │ │  router   │ │  router  │ │  router  │  │
│  └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘  │
└────────│─────────────│────────────│──────────────│────────┘
         │             │            │              │
         ▼             ▼            ▼              ▼
┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  PostgreSQL  │  │ OpenAI / │  │  spaCy   │  │ pgvector │
│  (primary    │  │  Gemini  │  │  NLTK    │  │ (embeddi-│
│   datastore) │  │  Groq    │  │          │  │  ngs)    │
└──────────────┘  └──────────┘  └──────────┘  └──────────┘
         ▲
┌────────┴─────┐
│    Redis     │
│  (sessions / │
│   rate limit)│
└──────────────┘
```

---

## 2. Monorepo Structure

```
NexaAI/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   │   ├── app/              # App Router pages & layouts
│   │   ├── components/       # Shared React components
│   │   │   ├── ui/           # shadcn/ui primitives
│   │   │   ├── chat/         # Chat-specific components
│   │   │   ├── nlp/          # NLP Studio components
│   │   │   ├── docs/         # Document Intelligence
│   │   │   └── layout/       # Shell, sidebar, topbar
│   │   ├── lib/              # Utilities, API client, hooks
│   │   │   ├── api/          # TanStack Query hooks + fetchers
│   │   │   ├── store/        # Zustand stores
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   └── utils/        # Pure helpers
│   │   ├── styles/           # Global CSS, Tailwind config
│   │   ├── public/           # Static assets
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                  # FastAPI backend
│       ├── routers/          # Route handlers
│       │   ├── auth.py
│       │   ├── chat.py
│       │   ├── nlp.py
│       │   ├── documents.py
│       │   └── users.py
│       ├── models/           # SQLAlchemy ORM models
│       ├── schemas/          # Pydantic request/response schemas
│       ├── services/         # Business logic layer
│       │   ├── ai_service.py
│       │   ├── nlp_service.py
│       │   └── doc_service.py
│       ├── core/             # Config, security, dependencies
│       │   ├── config.py
│       │   ├── security.py
│       │   └── database.py
│       ├── alembic/          # Database migrations
│       ├── tests/            # pytest test suite
│       ├── main.py           # FastAPI app entry point
│       └── requirements.txt
│
├── packages/
│   └── shared/               # Shared TypeScript types
│       ├── types/
│       └── schemas/          # Zod schemas matching backend Pydantic
│
├── infra/
│   └── docker-compose.yml
│
├── docs/
│   ├── ARCHITECTURE.md       # This file
│   ├── API.md
│   ├── DATABASE.md
│   ├── DESIGN_SYSTEM.md
│   └── DEVELOPMENT.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Layer Responsibilities

### Frontend (apps/web)

| Layer | Responsibility |
|-------|---------------|
| `app/` | Next.js App Router — pages, layouts, loading/error boundaries |
| `components/ui/` | shadcn/ui primitive components (Button, Input, Dialog, etc.) |
| `components/chat/` | Chat bubbles, composer, streaming renderer, code blocks |
| `components/layout/` | App shell, sidebar, topbar, command palette |
| `lib/api/` | TanStack Query hooks — all server state, caching, mutations |
| `lib/store/` | Zustand — client-only UI state (sidebar open, theme, etc.) |
| `lib/hooks/` | Reusable React hooks |
| `styles/` | Tailwind config, design tokens, global CSS |

### Backend (apps/api)

| Layer | Responsibility |
|-------|---------------|
| `routers/` | HTTP route definitions, input validation, response shaping |
| `schemas/` | Pydantic models for all I/O — enforces types at boundary |
| `services/` | Business logic — AI calls, NLP processing, document parsing |
| `models/` | SQLAlchemy ORM — database entities and relationships |
| `core/` | Configuration, JWT/Argon2 security, DB session management |
| `alembic/` | Declarative schema migrations |

---

## 4. Authentication Flow

```
Client                     API                         DB
  │                          │                           │
  │──── POST /auth/register ─►│                           │
  │                          │── hash password (argon2) ─►│
  │                          │◄─────── user record ───────│
  │◄─── 201 Created ─────────│                           │
  │                          │                           │
  │──── POST /auth/login ────►│                           │
  │                          │──── fetch user ───────────►│
  │                          │◄─── user record ───────────│
  │                          │ verify password (argon2)   │
  │◄─── { access_token,      │                           │
  │       refresh_token } ───│                           │
  │                          │                           │
  │──── GET /chat (Bearer) ──►│                           │
  │                          │ validate JWT               │
  │◄─── protected data ──────│                           │
```

- Access token: 15-minute expiry, stored in memory (not localStorage)
- Refresh token: 30-day expiry, stored in httpOnly cookie
- Rotation: every refresh returns a new refresh token (old is invalidated)

---

## 5. AI Chat Streaming Flow

```
Client                      API                     OpenAI
  │                           │                        │
  │─── POST /chat/message ────►│                        │
  │                           │─── stream=True ────────►│
  │                           │◄── SSE chunks ──────────│
  │◄── SSE: text/event-stream │                        │
  │    (token by token)       │                        │
  │                           │                        │
  │─── SSE: [DONE] ───────────│                        │
  │                           │ save full message to DB │
```

- Protocol: Server-Sent Events (SSE) over a single HTTP connection
- Frontend: native `EventSource` wrapped in a custom hook
- No WebSocket needed for MVP (SSE is simpler and sufficient)

---

## 6. NLP Processing Flow

```
Client ─── POST /nlp/analyze { text } ───► API
                                            │
                              ┌─────────────┴──────────────┐
                              │       NLP Pipeline         │
                              │  spaCy: tokenize, NER,     │
                              │         POS, sentences      │
                              │  NLTK: sentiment (VADER)   │
                              │  Custom: readability score  │
                              │  OpenAI: intent + summary  │
                              └─────────────┬──────────────┘
                                            │
Client ◄── { sentiment, entities, intent, summary, readability }
```

---

## 7. Document Intelligence Flow

```
1. Upload: POST /documents/upload  ──► S3/local + DB record
2. Process: Extract text (PyMuPDF / python-docx)
3. Chunk: Split into ~512-token overlapping chunks
4. Embed: OpenAI text-embedding-3-small per chunk
5. Store: pgvector extension in PostgreSQL
6. Query: POST /documents/{id}/query { question }
   ├── Embed question
   ├── Vector similarity search (top-k chunks)
   ├── Build context prompt
   └── Stream AI response with source citations
```

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend routing | Next.js App Router | Server components, streaming, layouts |
| State management | Zustand + TanStack Query | Separate server vs. client state cleanly |
| AI streaming | SSE | Simpler than WebSocket for unidirectional stream |
| Auth tokens | JWT + httpOnly cookie | Balance UX and XSS protection |
| Password hashing | Argon2id | Current best practice; resistant to GPU attacks |
| ORM | SQLAlchemy 2 (async) | Type-safe, async, industry standard for Python |
| Migrations | Alembic | Pairs with SQLAlchemy; declarative diff-based |
| NLP | spaCy + NLTK + OpenAI | spaCy for structural; NLTK for sentiment; AI for semantics |
| Document search | pgvector | Keeps vectors in same DB; no extra infrastructure |
| Monorepo | Flat (no Turborepo yet) | Simple to start; can add Turborepo when warranted |

---

## 9. Security Principles

1. **No secrets in frontend code** — all AI calls go through the backend
2. **No secrets in version control** — .env is gitignored
3. **httpOnly cookies** for refresh tokens — not accessible to JavaScript
4. **CORS** restricted to known origins
5. **Rate limiting** on auth and AI endpoints (via Redis)
6. **Input validation** at API boundary (Pydantic schemas)
7. **SQL injection prevention** via SQLAlchemy ORM (no raw strings)

---

## 10. Scalability Path

| Current | Future |
|---------|--------|
| Single Uvicorn process | Gunicorn with multiple workers |
| Local file uploads | S3 / GCS object storage |
| In-process NLP | Celery task queue |
| Single DB instance | Read replicas + connection pooling (PgBouncer) |
| No CDN | Vercel / Cloudflare for frontend |
| Redis optional | Redis for session store + rate limiting + pub/sub |
