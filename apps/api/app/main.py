"""Main FastAPI Application Entrypoint."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import logger, RequestLoggingMiddleware
from app.core.security_middleware import (
    SecurityHeadersMiddleware,
    rate_limit_middleware,
    validate_production_secrets,
)
from app.api.router import api_v1_router
from app.api.v1.health import router as health_direct_router
from app.db.session import check_db_connectivity, async_engine
from app.schemas.common import ErrorResponse, ErrorDetail


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown routines."""
    # 1. Startup & Secret Validation
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.APP_ENV}]")
    logger.info(f"API Prefix: {settings.API_V1_PREFIX}")
    logger.info(f"CORS Allowed Origins: {settings.CORS_ORIGINS}")
    validate_production_secrets()

    # 2. Verify initial database accessibility
    is_sqlite = "sqlite" in settings.DATABASE_URL
    if is_sqlite:
        from app.db.base import Base
        import app.db.models  # noqa: F401
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Local SQLite database initialized: SUCCESS")
    else:
        is_db_ready = await check_db_connectivity()
        if is_db_ready:
            logger.info("PostgreSQL database connection: SUCCESS")
        else:
            logger.warning(
                "PostgreSQL database connection: OFFLINE. "
                "Start infrastructure via 'docker compose -f infra/docker-compose.yml up -d' when ready."
            )

    yield

    # 3. Shutdown
    logger.info("Shutting down application resources...")
    await async_engine.dispose()
    logger.info("Database engine connections disposed cleanly.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="NexaAI high-performance async API for chat, NLP analysis, and document intelligence.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# 1. Add Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Add Request Logging & ID Middleware
app.add_middleware(RequestLoggingMiddleware)

# 3. Add Rate Limiting Middleware
app.middleware("http")(rate_limit_middleware)

# 4. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 5. Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                code=f"HTTP_{exc.status_code}",
                message=str(exc.detail),
                request_id=request_id,
            )
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(item) for item in err.get("loc", []))
        msg = err.get("msg", "")
        errors.append(f"{loc}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message="Request payload failed validation schema.",
                request_id=request_id,
                details={"errors": errors},
            )
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"[{request_id}] Unhandled Internal Error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected server error occurred. Please try again later.",
                request_id=request_id,
            )
        ).model_dump(),
    )


# 6. Root & Health endpoints
@app.get("/", summary="NexaAI API Root", tags=["Root"])
@app.head("/", include_in_schema=False)
async def root_status():
    """Root metadata endpoint verifying that NexaAI API is running."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "status": "online",
        "documentation": "/docs",
        "health_check": "/health",
    }


app.include_router(health_direct_router)

# 7. Include Versioned API Routes (/api/v1/...)
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
