"""Security headers, sliding-window rate limiting, and production hardening middleware."""

import time
import re
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.schemas.common import ErrorDetail, ErrorResponse


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware enforcing standard HTTP security response headers."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class RateLimiter:
    """Sliding-window rate limiter for sensitive API endpoints."""

    def __init__(self, requests_per_minute: int = 120):
        self.requests_per_minute = requests_per_minute
        self.client_records: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, client_ip: str) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - 60.0

        # Prune old timestamps
        timestamps = [ts for ts in self.client_records[client_ip] if ts > window_start]
        self.client_records[client_ip] = timestamps

        if len(timestamps) >= self.requests_per_minute:
            retry_after = int(60.0 - (now - timestamps[0]))
            return True, max(1, retry_after)

        self.client_records[client_ip].append(now)
        return False, 0


# Shared rate limiter instance (120 reqs/min default)
rate_limiter = RateLimiter(requests_per_minute=120)


async def rate_limit_middleware(request: Request, call_next) -> Response:
    """Middleware applying rate limiting to API routes."""
    # Apply rate limits on sensitive endpoints
    if request.url.path.startswith("/api/v1/auth/login") or request.url.path.startswith("/api/v1/chat/stream"):
        client_ip = request.client.host if request.client else "127.0.0.1"
        is_limited, retry_after = rate_limiter.is_rate_limited(client_ip)

        if is_limited:
            request_id = getattr(request.state, "request_id", None)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(retry_after)},
                content=ErrorResponse(
                    error=ErrorDetail(
                        code="RATE_LIMIT_EXCEEDED",
                        message=f"Too many requests. Please try again in {retry_after} seconds.",
                        request_id=request_id,
                    )
                ).model_dump(),
            )

    return await call_next(request)


def sanitize_rag_context(text: str) -> str:
    """Sanitize retrieved document context against prompt-injection attempts."""
    injection_patterns = [
        r"ignore\s+previous\s+instructions",
        r"system\s+prompt\s+override",
        r"disregard\s+above",
        r"you\s+are\s+now\s+a",
    ]
    sanitized = text
    for pattern in injection_patterns:
        sanitized = re.sub(pattern, "[SANITIZED CONTEXT]", sanitized, flags=re.IGNORECASE)
    return sanitized


def validate_production_secrets() -> None:
    """Startup validation checking SECRET_KEY security strength in production mode."""
    if settings.APP_ENV.lower() in ["production", "prod"]:
        if "change_in_production" in settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
            logger.error("CRITICAL: Insecure SECRET_KEY detected in production environment!")
            raise ValueError(
                "SECRET_KEY must be changed from default and be at least 32 characters long in production."
            )
        else:
            logger.info("Production SECRET_KEY entropy validation: PASSED")
    else:
        logger.info("Development environment secret validation: READY")
