"""API v1 router for Usage Analytics & Quota operations."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.usage import (
    UsageSummaryResponse,
    TimeseriesDataPoint,
    UsageBreakdownResponse,
    UsageHistoryItem,
    UsageHistoryList,
    QuotaSummaryResponse,
    HighModeStatusResponse,
)
from app.services.usage.aggregation import UsageAggregationService
from app.services.usage.quotas import QuotaService

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get(
    "/summary",
    response_model=UsageSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get overall usage summary for current user",
)
async def get_usage_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UsageSummaryResponse:
    """Retrieve current month requests, token counts, latency, and estimated costs."""
    agg_service = UsageAggregationService(db)
    summary_data = await agg_service.get_summary(current_user.id)
    return UsageSummaryResponse.model_validate(summary_data)


@router.get(
    "/timeseries",
    response_model=List[TimeseriesDataPoint],
    status_code=status.HTTP_200_OK,
    summary="Get daily usage timeseries metrics",
)
async def get_usage_timeseries(
    days: int = Query(14, ge=1, le=90),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[TimeseriesDataPoint]:
    """Retrieve daily request counts and token volume for charts."""
    agg_service = UsageAggregationService(db)
    points = await agg_service.get_timeseries(current_user.id, days=days)
    return [TimeseriesDataPoint.model_validate(p) for p in points]


@router.get(
    "/breakdown",
    response_model=UsageBreakdownResponse,
    status_code=status.HTTP_200_OK,
    summary="Get usage breakdown by feature and provider",
)
async def get_usage_breakdown(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UsageBreakdownResponse:
    """Categorized usage breakdown by feature and provider."""
    agg_service = UsageAggregationService(db)
    breakdown_data = await agg_service.get_breakdown(current_user.id)
    return UsageBreakdownResponse.model_validate(breakdown_data)


@router.get(
    "/history",
    response_model=UsageHistoryList,
    status_code=status.HTTP_200_OK,
    summary="Get raw usage telemetry audit log history",
)
async def get_usage_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UsageHistoryList:
    """List execution audit log records for the current user."""
    agg_service = UsageAggregationService(db)
    logs = await agg_service.get_history(current_user.id, limit=limit, offset=offset)
    return UsageHistoryList(
        items=[UsageHistoryItem.model_validate(log) for log in logs],
        total=len(logs),
    )


@router.get(
    "/quotas",
    response_model=QuotaSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user quota status and remaining bounds",
)
async def get_user_quotas(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> QuotaSummaryResponse:
    """Retrieve daily/monthly limits, used amounts, and reset timestamp."""
    quota_service = QuotaService(db)
    quota_data = await quota_service.get_user_quota_summary(current_user.id)
    return QuotaSummaryResponse.model_validate(quota_data)


@router.get(
    "/high-mode-status",
    response_model=HighModeStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get daily High-mode usage quota status",
)
async def get_high_mode_status(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> HighModeStatusResponse:
    """Retrieve current daily limit, used count, remaining requests, and reset timestamp for High mode."""
    quota_service = QuotaService(db)
    high_mode_data = await quota_service.get_high_mode_usage(current_user.id)
    return HighModeStatusResponse.model_validate(high_mode_data)



@router.get(
    "/export",
    status_code=status.HTTP_200_OK,
    summary="Export usage data as JSON or CSV",
)
async def export_usage_data(
    format: str = Query("json", pattern="^(json|csv)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):

    """Export caller's usage log history in JSON or CSV format."""
    agg_service = UsageAggregationService(db)
    data_str = await agg_service.export_data(current_user.id, export_format=format)
    
    media_type = "text/csv" if format == "csv" else "application/json"
    filename = f"nexaai_usage_export.{format}"
    
    return Response(
        content=data_str,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
