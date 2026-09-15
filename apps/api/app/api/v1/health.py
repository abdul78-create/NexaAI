"""Health check endpoints for application monitoring and container orchestration."""

from fastapi import APIRouter, Query, status
from app.core.config import settings
from app.db.session import check_db_connectivity
from app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Health & Liveness",
    description="Check whether the application service is running and responsive.",
)
async def get_health(
    check_db: bool = Query(
        default=False,
        description="Optionally execute a database probe query to verify PostgreSQL readiness",
    )
) -> HealthResponse:
    """Return application health metadata and optional database readiness."""
    db_status = None
    overall_status = "healthy"

    if check_db:
        is_db_up = await check_db_connectivity()
        db_status = "connected" if is_db_up else "unreachable"
        if not is_db_up:
            overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        service=settings.APP_NAME.lower().replace(" ", "-"),
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        database=db_status,
    )


@router.get(
    "/health/ready",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Readiness Probe",
    description="Full readiness check verifying both the web server and database connectivity.",
)
async def get_readiness() -> HealthResponse:
    """Readiness probe checking database connectivity."""
    is_db_up = await check_db_connectivity()
    db_status = "connected" if is_db_up else "unreachable"
    overall_status = "healthy" if is_db_up else "degraded"

    return HealthResponse(
        status=overall_status,
        service=settings.APP_NAME.lower().replace(" ", "-"),
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        database=db_status,
    )
