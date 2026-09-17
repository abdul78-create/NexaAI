"""Quota Enforcement Service for Phase 15 AI Operations."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.usage import AIUsageLog
from app.db.models.attachment import Attachment



# Default static quota limits (per user per day)
DEFAULT_QUOTAS = {
    "requests_per_day": 200,
    "tokens_per_day": 150000,
    "speech_seconds_per_day": 600,
    "storage_bytes_limit": 104857600,  # 100 MB
}


class QuotaExceededError(HTTPException):
    """Exception raised when a user exceeds feature or daily resource quotas."""

    def __init__(self, message: str, feature: str, resets_at: str):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "quota_exceeded",
                    "message": message,
                    "feature": feature,
                    "resets_at": resets_at,
                }
            },
        )


class QuotaService:
    """Service to query usage against quota bounds and enforce per-user limits."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_daily_usage(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Aggregate total requests, tokens, speech seconds, and storage bytes for today (UTC)."""
        now = datetime.now(timezone.utc)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Total requests & tokens today
        stmt_usage = (
            select(
                func.count(AIUsageLog.id).label("requests_count"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("tokens_count"),
            )
            .where(
                AIUsageLog.user_id == user_id,
                AIUsageLog.created_at >= start_of_day,
            )
        )
        res_usage = await self.db.execute(stmt_usage)
        requests_count, tokens_count = res_usage.one()

        # 2. Total active attachment storage bytes
        stmt_storage = (
            select(func.coalesce(func.sum(Attachment.file_size), 0))
            .where(
                Attachment.user_id == user_id,
                Attachment.deleted_at.is_(None),
            )
        )
        res_storage = await self.db.execute(stmt_storage)
        storage_bytes = res_storage.scalar() or 0

        # Calculate next reset time (tomorrow at 00:00 UTC)
        next_reset = start_of_day + timedelta(days=1)
        resets_at_str = next_reset.isoformat()


        return {
            "requests_today": requests_count,
            "tokens_today": tokens_count,
            "storage_bytes": storage_bytes,
            "resets_at": resets_at_str,
        }

    async def check_quota(self, user_id: uuid.UUID, feature_type: str = "chat") -> bool:
        """Check if user is within quota limits prior to executing an AI request."""
        daily = await self.get_daily_usage(user_id)

        if daily["requests_today"] >= DEFAULT_QUOTAS["requests_per_day"]:
            raise QuotaExceededError(
                message=f"Daily request quota of {DEFAULT_QUOTAS['requests_per_day']} requests reached.",
                feature=feature_type,
                resets_at=daily["resets_at"],
            )

        if daily["tokens_today"] >= DEFAULT_QUOTAS["tokens_per_day"]:
            raise QuotaExceededError(
                message=f"Daily token quota of {DEFAULT_QUOTAS['tokens_per_day']} tokens reached.",
                feature=feature_type,
                resets_at=daily["resets_at"],
            )

        return True

    async def get_high_mode_usage(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Get daily High-mode usage count and remaining requests."""
        now = datetime.now(timezone.utc)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        limit = settings.CHAT_MODE_HIGH_DAILY_LIMIT

        stmt = (
            select(func.count(AIUsageLog.id))
            .where(
                AIUsageLog.user_id == user_id,
                AIUsageLog.mode == "high",
                AIUsageLog.status == "success",
                AIUsageLog.created_at >= start_of_day,
            )
        )
        res = await self.db.execute(stmt)
        used = res.scalar() or 0
        remaining = max(0, limit - used)
        next_reset = (start_of_day + timedelta(days=1)).isoformat()

        return {
            "mode": "high",
            "limit": limit,
            "used": used,
            "remaining": remaining,
            "resets_at": next_reset,
        }

    async def check_high_mode_quota(self, user_id: uuid.UUID) -> bool:
        """Check if user has remaining High-mode requests today."""
        status = await self.get_high_mode_usage(user_id)
        if status["remaining"] <= 0:
            raise QuotaExceededError(
                message=f"Daily limit of {status['limit']} High-mode requests reached. Resets tomorrow at 00:00 UTC.",
                feature="high_mode",
                resets_at=status["resets_at"],
            )
        return True

    async def get_user_quota_summary(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Return comprehensive quota consumption breakdown for dashboard display."""
        daily = await self.get_daily_usage(user_id)
        high_mode = await self.get_high_mode_usage(user_id)

        return {
            "plan_code": "pro_tier",
            "quotas": {
                "requests": {
                    "limit": DEFAULT_QUOTAS["requests_per_day"],
                    "used": daily["requests_today"],
                    "remaining": max(0, DEFAULT_QUOTAS["requests_per_day"] - daily["requests_today"]),
                    "unit": "requests/day",
                },
                "tokens": {
                    "limit": DEFAULT_QUOTAS["tokens_per_day"],
                    "used": daily["tokens_today"],
                    "remaining": max(0, DEFAULT_QUOTAS["tokens_per_day"] - daily["tokens_today"]),
                    "unit": "tokens/day",
                },
                "storage": {
                    "limit": DEFAULT_QUOTAS["storage_bytes_limit"],
                    "used": daily["storage_bytes"],
                    "remaining": max(0, DEFAULT_QUOTAS["storage_bytes_limit"] - daily["storage_bytes"]),
                    "unit": "bytes",
                },
                "high_mode": {
                    "limit": high_mode["limit"],
                    "used": high_mode["used"],
                    "remaining": high_mode["remaining"],
                    "unit": "requests/day",
                },
            },
            "high_mode_status": high_mode,
            "resets_at": daily["resets_at"],
        }

