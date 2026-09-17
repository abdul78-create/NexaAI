"""Common request and response schemas."""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Standard health check response schema."""

    status: str = Field(..., description="Overall application service status (healthy / degraded)")
    service: str = Field(..., description="Service identifier name")
    version: str = Field(..., description="Application semantic version")
    environment: str = Field(..., description="Runtime environment (development / staging / production)")
    database: Optional[str] = Field(
        None, description="Database connection readiness (connected / unreachable / skipped)"
    )
    redis: Optional[str] = Field(
        None, description="Redis connection readiness (connected / unreachable / skipped)"
    )


class ErrorDetail(BaseModel):
    """Structured error detail representation."""

    code: str = Field(..., description="Machine-readable uppercase error code")
    message: str = Field(..., description="Human-readable safe error message")
    request_id: Optional[str] = Field(None, description="Correlation Request ID for debugging")
    details: Optional[Dict[str, Any]] = Field(None, description="Optional extra validation context")


class ErrorResponse(BaseModel):
    """Unified error envelope."""

    error: ErrorDetail


class SystemInfoResponse(BaseModel):
    """System information metadata response."""

    app_name: str
    version: str
    environment: str
    debug_mode: bool
    api_prefix: str
