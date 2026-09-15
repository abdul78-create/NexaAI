"""System and environment metadata endpoints."""

from fastapi import APIRouter, status
from app.core.config import settings
from app.schemas.common import SystemInfoResponse

router = APIRouter(prefix="/system", tags=["System"])


@router.get(
    "/info",
    response_model=SystemInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="System Information",
    description="Retrieve system environment metadata and API settings.",
)
async def get_system_info() -> SystemInfoResponse:
    """Return runtime configuration metadata (excluding sensitive credentials)."""
    return SystemInfoResponse(
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        debug_mode=settings.DEBUG,
        api_prefix=settings.API_V1_PREFIX,
    )
