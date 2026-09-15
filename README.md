# NexaAI

> A full-stack AI conversational platform combining intelligent chat, NLP-powered text analysis, document intelligence, and a premium AI workspace experience.

---

## Overview

NexaAI is a production-quality, ChatGPT-inspired AI platform built with a modern monorepo architecture. It provides:

- **AI Chat** — streaming conversations with persistent history
- **NLP Studio** — sentiment, entity, intent, and readability analysis
- **Document Intelligence** — RAG-powered document Q&A
- **Prompt Library** — curated and custom prompt management
- **Usage Dashboard** — token usage, analytics, and insights

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | LTS (v20+) recommended |
| Python | 3.11+ |
| Docker Desktop | Latest |
| Git | Any recent version |

### 1. Clone and setup environment

```bash
git clone <repo>
cd NexaAI
cp .env.example .env
# Fill in your actual API keys in .env
```

### 2. Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3. Start the backend

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### 4. Start the frontend

```bash
cd apps/web
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Project Structure

```
NexaAI/
├── apps/
│   ├── web/          # Next.js 14 frontend (TypeScript + Tailwind)
│   └── api/          # FastAPI backend (Python 3.12)
├── packages/
│   └── shared/       # Shared TypeScript types and Zod schemas
├── infra/
│   └── docker-compose.yml  # PostgreSQL + Redis
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── DESIGN_SYSTEM.md
│   └── DEVELOPMENT.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, component responsibilities |
| [API.md](docs/API.md) | REST API endpoints, request/response schemas |
| [DATABASE.md](docs/DATABASE.md) | Schema design, migrations, indexing strategy |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Visual tokens, typography, component patterns |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, conventions, contribution guide |

---

## Development Phases

| Phase | Goal | Status |
|-------|------|--------|
| 0 | Planning & Architecture | ✅ In Progress |
| 1 | Frontend Foundation | ⬜ Pending |
| 2 | Landing Page | ⬜ Pending |
| 3 | Application Shell | ⬜ Pending |
| 4 | AI Chat | ⬜ Pending |
| 5 | Authentication + Database | ⬜ Pending |
| 6 | NLP Studio | ⬜ Pending |
| 7 | Document Intelligence | ⬜ Pending |
| 8 | Advanced Features | ⬜ Pending |

---

## Security

- All secrets are managed via environment variables
- API keys are never exposed to the frontend or version control
- JWT with refresh-token rotation for authentication
- Argon2id for password hashing
- See `.env.example` for required environment variables

---

## License

MIT
