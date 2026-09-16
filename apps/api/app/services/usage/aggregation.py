"""Usage Aggregation Service for Phase 15 AI Analytics Dashboard."""

import csv
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.usage import AIUsageLog
from app.db.models.attachment import Attachment
from app.db.models.speech import SpeechTranscription


class UsageAggregationService:
    """Service to aggregate AI usage logs, generate time-series metrics, and export data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Aggregate total lifetime & current month usage summary for user."""
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Monthly usage metrics
        stmt_month = (
            select(
                func.count(AIUsageLog.id).label("total_requests"),
                func.coalesce(func.sum(AIUsageLog.prompt_tokens), 0).label("prompt_tokens"),
                func.coalesce(func.sum(AIUsageLog.completion_tokens), 0).label("completion_tokens"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.avg(AIUsageLog.execution_duration_ms), 0).label("avg_latency_ms"),
            )
            .where(
                AIUsageLog.user_id == user_id,
                AIUsageLog.created_at >= start_of_month,
            )
        )
        res = await self.db.execute(stmt_month)
        row = res.one()

        # Audio duration sum
        stmt_audio = select(func.coalesce(func.sum(SpeechTranscription.audio_duration_seconds), 0)).where(
            SpeechTranscription.user_id == user_id
        )
        audio_res = await self.db.execute(stmt_audio)
        speech_seconds = audio_res.scalar() or 0.0

        # Active storage size sum
        stmt_storage = select(func.coalesce(func.sum(Attachment.file_size), 0)).where(
            Attachment.user_id == user_id,
            Attachment.deleted_at.is_(None),
        )
        storage_res = await self.db.execute(stmt_storage)
        storage_bytes = storage_res.scalar() or 0

        return {
            "period": "current_month",
            "start_date": start_of_month.isoformat(),
            "total_requests": row.total_requests,
            "prompt_tokens": row.prompt_tokens,
            "completion_tokens": row.completion_tokens,
            "total_tokens": row.total_tokens,
            "avg_latency_ms": round(float(row.avg_latency_ms), 1),
            "speech_duration_seconds": round(float(speech_seconds), 1),
            "storage_bytes_used": storage_bytes,
            "estimated_cost_usd": round(row.total_tokens * 0.000002, 4),  # Estimated USD cost indicator
        }

    async def get_timeseries(self, user_id: uuid.UUID, days: int = 14) -> List[Dict[str, Any]]:
        """Return daily aggregated requests & tokens for past N days."""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        stmt = (
            select(
                func.date(AIUsageLog.created_at).label("date"),
                func.count(AIUsageLog.id).label("requests"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("tokens"),
            )
            .where(
                AIUsageLog.user_id == user_id,
                AIUsageLog.created_at >= start_date,
            )
            .group_by(func.date(AIUsageLog.created_at))
            .order_by(func.date(AIUsageLog.created_at).asc())
        )
        res = await self.db.execute(stmt)
        rows = res.all()

        # Build map of date_str -> values
        data_map = {str(r.date): {"requests": r.requests, "tokens": r.tokens} for r in rows}

        # Fill missing days in range with zeroes
        timeseries = []
        for d in range(days):
            date_dt = (now - timedelta(days=days - 1 - d)).date()
            date_str = str(date_dt)
            metrics = data_map.get(date_str, {"requests": 0, "tokens": 0})
            timeseries.append({
                "date": date_str,
                "requests": metrics["requests"],
                "tokens": metrics["tokens"],
            })

        return timeseries

    async def get_breakdown(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Categorize usage by feature type, provider, and model."""
        # By feature
        stmt_feature = (
            select(
                AIUsageLog.feature_type,
                func.count(AIUsageLog.id).label("count"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("tokens"),
            )
            .where(AIUsageLog.user_id == user_id)
            .group_by(AIUsageLog.feature_type)
        )
        res_feature = await self.db.execute(stmt_feature)
        by_feature = [
            {"feature": row.feature_type, "requests": row.count, "tokens": row.tokens}
            for row in res_feature.all()
        ]

        # By provider
        stmt_provider = (
            select(
                AIUsageLog.provider,
                func.count(AIUsageLog.id).label("count"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("tokens"),
            )
            .where(AIUsageLog.user_id == user_id)
            .group_by(AIUsageLog.provider)
        )
        res_provider = await self.db.execute(stmt_provider)
        by_provider = [
            {"provider": row.provider, "requests": row.count, "tokens": row.tokens}
            for row in res_provider.all()
        ]

        return {
            "by_feature": by_feature,
            "by_provider": by_provider,
        }

    async def get_history(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AIUsageLog]:
        """Fetch raw usage log audit trail ordered newest first."""
        stmt = (
            select(AIUsageLog)
            .where(AIUsageLog.user_id == user_id)
            .order_by(AIUsageLog.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def export_data(self, user_id: uuid.UUID, export_format: str = "json") -> str:
        """Export user's complete usage log history as JSON or CSV string."""
        logs = await self.get_history(user_id=user_id, limit=500, offset=0)

        if export_format.lower() == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "id",
                "feature_type",
                "provider",
                "model_name",
                "prompt_tokens",
                "completion_tokens",
                "total_tokens",
                "execution_duration_ms",
                "status",
                "created_at",
            ])
            for log in logs:
                writer.writerow([
                    str(log.id),
                    log.feature_type,
                    log.provider,
                    log.model_name,
                    log.prompt_tokens,
                    log.completion_tokens,
                    log.total_tokens,
                    log.execution_duration_ms,
                    log.status,
                    log.created_at.isoformat() if log.created_at else "",
                ])
            return output.getvalue()

        # JSON export
        data = [
            {
                "id": str(log.id),
                "feature_type": log.feature_type,
                "provider": log.provider,
                "model_name": log.model_name,
                "prompt_tokens": log.prompt_tokens,
                "completion_tokens": log.completion_tokens,
                "total_tokens": log.total_tokens,
                "execution_duration_ms": log.execution_duration_ms,
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else "",
            }
            for log in logs
        ]
        return json.dumps(data, indent=2)
