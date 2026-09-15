# NexaAI — Development Guide

> Local setup, project conventions, code standards, and contribution workflow.

---

## 1. Environment Summary

| Tool | Required Version | Notes |
|------|-----------------|-------|
| Node.js | v20 LTS+ | v25.x works but non-LTS; LTS preferred for production |
| npm | v10+ | Included with Node.js |
| Python | 3.11+ | 3.12 confirmed working |
| Docker Desktop | Latest | Required for PostgreSQL + Redis |
| Git | Any recent | 2.x+ |

> Current detected versions: Node v25.9.0, npm 11.12.1, Python 3.12.10, Docker 29.6.2, Git 2.54.0

---

## 2. First-Time Setup

### 1. Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

Verify:
```bash
docker compose -f infra/docker-compose.yml ps
```

### 2. Backend setup

```bash
cd apps/api
python -m venv .venv

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd apps/web
npm install
npm run dev
```

---

## 3. Development Scripts

### Frontend (`apps/web`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check (no emit) |
| `npm run format` | Prettier |

### Backend (`apps/api`)

| Command | Description |
|---------|-------------|
| `uvicorn main:app --reload` | Start dev server |
| `pytest` | Run test suite |
| `pytest --cov=. --cov-report=html` | With coverage |
| `ruff check .` | Lint |
| `ruff format .` | Format |
| `alembic upgrade head` | Apply migrations |
| `alembic revision --autogenerate -m "msg"` | New migration |

---

## 4. Code Conventions

### Frontend

**TypeScript**
- Strict mode enabled — no `any` unless absolutely necessary
- Prefer `interface` for object shapes, `type` for unions/mapped types
- Export named exports from components (no default exports except Next.js pages)

**File naming**
- Components: `PascalCase.tsx` (e.g., `ChatComposer.tsx`)
- Utilities/hooks: `camelCase.ts` (e.g., `useStreamingChat.ts`)
- Pages (App Router): `page.tsx` inside route folder

**Components**
- One component per file
- Props interface above the component
- Keep components under ~150 lines; extract sub-components
- Co-locate styles with components when using CSS Modules

**State management**
- **Server state** (API data): TanStack Query — never Zustand
- **Client UI state** (sidebar, theme, modal open): Zustand
- **Form state**: React Hook Form + Zod

**Imports** (enforced by ESLint)
```tsx
// 1. React / Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries
import { motion } from 'motion/react'

// 3. Internal — absolute paths
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/lib/store/chat'

// 4. Types
import type { Message } from '@/lib/types'
```

### Backend

**Python style**
- Ruff for linting and formatting (replaces Black + isort + flake8)
- All functions have type hints
- Pydantic models for all request/response shapes
- SQLAlchemy 2 async-first patterns

**File organization**
- Route handlers in `routers/` — thin, delegate to services
- Business logic in `services/` — no direct DB access from routers
- DB queries in models or explicit repository pattern if complex
- Config via `core/config.py` using pydantic-settings

**Naming**
- `snake_case` throughout Python
- Pydantic models: `PascalCase` with `Request`/`Response` suffix
  - e.g., `MessageCreateRequest`, `ConversationResponse`
- SQLAlchemy models: `PascalCase` (e.g., `User`, `Conversation`)

---

## 5. Git Workflow

### Branch naming

```
feature/chat-streaming
fix/token-refresh-bug
docs/api-update
refactor/nlp-service
```

### Commit messages (Conventional Commits)

```
feat: add streaming SSE endpoint for chat
fix: correct token expiry calculation
docs: update API endpoint documentation
refactor: extract nlp service from router
style: format with ruff
test: add unit tests for auth service
chore: update dependencies
```

### Before committing

```bash
# Frontend
npm run lint
npm run type-check

# Backend
ruff check .
pytest tests/
```

---

## 6. Project Phases & Completion Criteria

A phase is **complete** only when:

1. ✅ Feature works end-to-end (not just UI placeholder)
2. ✅ Error states are handled
3. ✅ Responsive on mobile and desktop
4. ✅ No console errors or warnings
5. ✅ Basic tests pass
6. ✅ Documentation updated

---

## 7. Security Rules (Non-negotiable)

1. **Never hardcode secrets** — use environment variables
2. **Never commit `.env`** — only `.env.example` with empty values
3. **Never expose AI API keys to frontend** — all AI calls through backend
4. **Always validate input** — Pydantic schemas at API boundary
5. **Never store raw passwords or tokens** — hash with argon2id
6. **Always check ownership** — verify user owns the resource before access

---

## 8. Adding a New API Endpoint

1. Define Pydantic schema in `schemas/`
2. Add route in appropriate `routers/` file
3. Implement logic in `services/`
4. Add SQLAlchemy model if needed in `models/`
5. Create Alembic migration if schema changed
6. Write pytest tests in `tests/`
7. Update `docs/API.md`

---

## 9. Adding a New Frontend Page

1. Create route folder in `app/` (e.g., `app/(app)/new-feature/`)
2. Create `page.tsx` with proper metadata export
3. Create components in `components/new-feature/`
4. Add TanStack Query hooks in `lib/api/new-feature.ts`
5. Add route to sidebar navigation if needed
6. Test responsive layout on mobile breakpoint

---

## 10. Troubleshooting

### PostgreSQL won't start

```bash
docker compose -f infra/docker-compose.yml logs postgres
```

Common cause: Port 5432 already in use. Change host port in `docker-compose.yml`.

### Python imports fail

Make sure the virtual environment is activated:
```bash
# Windows
.venv\Scripts\Activate.ps1

# Check
where python  # Should point to .venv
```

### Next.js build fails with type errors

```bash
npm run type-check
```

Fix all TypeScript errors before building.

### Alembic migration conflict

```bash
alembic heads  # Should show single head
alembic history --verbose
```
