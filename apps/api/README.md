# NexaAI — Backend Service (`apps/api`)

FastAPI asynchronous backend foundation for NexaAI, powering conversational AI, NLP intelligence, document processing, and vector search.

---

## 🏗️ Architecture & Technology

- **Runtime**: Python 3.12+
- **Framework**: FastAPI (ASGI) + Uvicorn
- **Settings**: Pydantic Settings (typed environment configuration)
- **Database ORM**: SQLAlchemy 2.x (Async Engine + Declarative Base)
- **Database Driver**: `asyncpg` (PostgreSQL async driver)
- **Migrations**: Alembic (async migration pipeline)
- **Testing**: pytest, pytest-asyncio, HTTPX TestClient
- **CORS & Logging**: Standardized request correlation IDs (`X-Request-ID`), structured logging, and strict CORS policies

---

## 📁 Directory Structure

```text
apps/api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entrypoint & middleware
│   ├── core/
│   │   ├── config.py        # Pydantic BaseSettings
│   │   ├── logging.py       # Structured logging & X-Request-ID middleware
│   │   └── security.py      # Security tokens & validation utilities
│   ├── db/
│   │   ├── base.py          # SQLAlchemy 2 DeclarativeBase & TimestampMixin
│   │   ├── session.py       # Async engine, sessionmaker & get_db dependency
│   │   └── models/
│   │       └── __init__.py  # ORM models (SystemMetadata)
│   ├── api/
│   │   ├── router.py        # Master API v1 router
│   │   └── v1/
│   │       ├── health.py    # /health and /health/ready endpoints
│   │       └── system.py    # /system/info endpoint
│   ├── schemas/
│   │   └── common.py        # HealthResponse, ErrorResponse schemas
│   └── tests/
│       └── test_health.py   # Pytest test suite
├── alembic/
│   ├── env.py               # Async Alembic runner
│   ├── script.py.mako
│   └── versions/
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### 1. Create and Activate Virtual Environment

```bash
cd apps/api
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# On macOS/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 4. Start Infrastructure (PostgreSQL + Redis)

```bash
# From the repository root:
docker compose -f infra/docker-compose.yml up -d
```

> **Note**: If port `5432` is already in use by a local PostgreSQL service on Windows, either stop the local service or change the host port mapping in `infra/docker-compose.yml` (e.g., `"5433:5432"`).

### 5. Run Database Migrations

```bash
alembic upgrade head
```

### 6. Run the Development Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔍 API Endpoints & Verification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check (optional `?check_db=true`) |
| `GET` | `/health/ready` | Readiness check probing PostgreSQL connectivity |
| `GET` | `/api/v1/health` | Versioned liveness check |
| `GET` | `/api/v1/system/info` | System configuration metadata |
| `GET` | `/docs` | Interactive Swagger UI documentation |
| `GET` | `/openapi.json` | OpenAPI 3.1 specification schema |

---

## 🧪 Running Tests

```bash
pytest -v
```
