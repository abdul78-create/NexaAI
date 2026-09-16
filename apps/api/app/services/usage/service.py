"""Telemetry and usage logging service."""

import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.usage import AIUsageLog


class UsageService:
    """Service to record AI provider execution telemetry and token usage."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_usage(
        self,
        *,
        user_id: uuid.UUID,
        feature_type: str,
        provider: str,
        model_name: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        execution_duration_ms: int = 0,
        status: str = "success",
        error_code: Optional[str] = None,
    ) -> AIUsageLog:
        """Persist an execution usage record."""
        total_tokens = prompt_tokens + completion_tokens
        log_entry = AIUsageLog(
            user_id=user_id,
            feature_type=feature_type,
            provider=provider,
            model_name=model_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            execution_duration_ms=execution_duration_ms,
            status=status,
            error_code=error_code,
        )
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)
        return log_entry
