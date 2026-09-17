"""Pydantic schemas for Phase 15 Usage Analytics & Quota APIs."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class UsageSummaryResponse(BaseModel):
    """Overall usage summary metrics for user."""

    period: str
    start_date: datetime
    total_requests: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    avg_latency_ms: float
    speech_duration_seconds: float
    storage_bytes_used: int
    estimated_cost_usd: float


class TimeseriesDataPoint(BaseModel):
    """Daily timeseries usage metric."""

    date: str
    requests: int
    tokens: int


class FeatureBreakdownItem(BaseModel):
    """Feature usage summary."""

    feature: str
    requests: int
    tokens: int


class ProviderBreakdownItem(BaseModel):
    """Provider usage summary."""

    provider: str
    requests: int
    tokens: int


class UsageBreakdownResponse(BaseModel):
    """Categorized usage breakdown by feature and provider."""

    by_feature: List[FeatureBreakdownItem]
    by_provider: List[ProviderBreakdownItem]


class UsageHistoryItem(BaseModel):
    """Individual execution telemetry log record."""

    id: UUID
    feature_type: str
    provider: str
    model_name: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    execution_duration_ms: int
    status: str
    error_code: Optional[str] = None
    mode: Optional[str] = None
    conversation_id: Optional[UUID] = None
    estimated_cost: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UsageHistoryList(BaseModel):
    """Paginated list of usage log audit entries."""

    items: List[UsageHistoryItem]
    total: int


class QuotaItemDetail(BaseModel):
    """Individual resource quota consumption metric."""

    limit: int
    used: int
    remaining: int
    unit: str


class HighModeStatusResponse(BaseModel):
    """High-mode daily usage status."""

    mode: str = "high"
    limit: int
    used: int
    remaining: int
    resets_at: str


class QuotaSummaryResponse(BaseModel):
    """Quota status response for current user."""

    plan_code: str
    quotas: Dict[str, QuotaItemDetail]
    high_mode_status: Optional[HighModeStatusResponse] = None
    resets_at: datetime
