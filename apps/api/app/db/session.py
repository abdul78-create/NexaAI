"""Database engine, session management, and dependency injection."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text
from app.core.config import settings
from app.core.logging import logger

# Configure engine parameters based on dialect (PostgreSQL vs SQLite)
is_sqlite = "sqlite" in settings.DATABASE_URL
engine_kwargs = {
    "echo": settings.DEBUG and settings.APP_ENV == "development",
    "future": True,
}

if not is_sqlite:
    engine_kwargs.update(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_pre_ping": True,
        }
    )

# Create asynchronous SQLAlchemy engine
async_engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

# Create session factory bound to async engine
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session and manages transaction lifecycle."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connectivity() -> bool:
    """Safely check if the PostgreSQL database is reachable and accepting queries."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            return True
    except Exception as exc:
        logger.warning(f"Database readiness check failed: {exc}")
        return False


async def check_redis_connectivity() -> bool:
    """Safely check if Redis is reachable and responding to PING."""
    if not settings.REDIS_URL:
        return True
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2.0)
        await r.ping()
        await r.aclose()
        return True
    except Exception as exc:
        logger.warning(f"Redis readiness check failed: {exc}")
        return False

