"""Structured application logging and Request ID middleware."""

import logging
import sys
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configure structured logging for the application."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    log_format = (
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )

    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    logger = logging.getLogger("nexaai")
    logger.setLevel(log_level)
    return logger


logger = setup_logging()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that assigns a correlation Request ID and logs request latency."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract or generate X-Request-ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Do not log health checks excessively in production
            if not path.endswith("/health"):
                logger.info(
                    f"[{request_id}] {method} {path} -> {response.status_code} ({duration_ms}ms)"
                )

            # Pass X-Request-ID back to client
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"[{request_id}] {method} {path} -> EXCEPTION: {exc} ({duration_ms}ms)"
            )
            raise exc
