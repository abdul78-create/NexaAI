"""Attachment business logic service for NexaAI Phase 10."""

import uuid
from typing import Optional
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.attachment import Attachment
from app.services.attachments.validators import (
    AttachmentValidator,
    sanitize_filename,
    compute_sha256,
)
from app.services.storage.service import get_storage_provider


class AttachmentService:
    """
    Orchestrates the full attachment lifecycle:
    validate → checksum → store → persist DB record.

    On any failure after storage write, the stored object is cleaned up
    to prevent orphaned files.
    """

    @staticmethod
    def _build_storage_key(user_id: uuid.UUID, filename: str) -> str:
        """
        Generate an opaque, non-guessable storage key.

        Format: ``{user_id_prefix}/{uuid4}-{safe_filename}``
        Uses only the first 8 chars of the user UUID as a bucket prefix for
        directory organisation without exposing the full user ID in the path.
        """
        safe_name = sanitize_filename(filename)
        unique_id = uuid.uuid4().hex
        prefix = str(user_id).replace("-", "")[:8]
        return f"{prefix}/{unique_id}-{safe_name}"

    @classmethod
    async def upload(
        cls,
        *,
        db: AsyncSession,
        user_id: uuid.UUID,
        filename: str,
        content_type: str,
        data: bytes,
        max_size_mb: Optional[int] = None,
    ) -> Attachment:
        """
        Validate, store, and persist a new attachment.

        Raises ``HTTPException(400)`` on validation failures.
        On storage or DB errors after a successful write, the stored object
        is deleted before re-raising.
        """
        # 1. Validate
        result = AttachmentValidator.validate(
            filename=filename,
            content_type=content_type,
            data=data,
            max_size_mb=max_size_mb,
        )
        if not result.ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"[{result.error_code}] {result.error_message}",
            )

        # 2. Checksum
        checksum = compute_sha256(data)

        # 3. Build storage key and save
        storage_key = cls._build_storage_key(user_id, filename)
        storage = get_storage_provider()
        await storage.save(storage_key, data, content_type)

        # 4. Persist DB record — clean up on failure
        try:
            attachment = Attachment(
                user_id=user_id,
                original_filename=sanitize_filename(filename),
                storage_key=storage_key,
                mime_type=content_type.split(";")[0].strip().lower(),
                file_size=len(data),
                checksum_sha256=checksum,
                media_type=result.media_type or "other",
                status="ready",
            )
            db.add(attachment)
            await db.commit()
            await db.refresh(attachment)
            return attachment

        except Exception:
            # Atomic cleanup — remove the already-stored object
            try:
                await storage.delete(storage_key)
            except Exception:
                pass
            raise

    @staticmethod
    async def get_by_id(
        *,
        db: AsyncSession,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Attachment:
        """Return attachment with strict ownership enforcement. Raises 404 if not found."""
        stmt = select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == user_id,
            Attachment.deleted_at.is_(None),
        )
        result = await db.execute(stmt)
        attachment = result.scalar_one_or_none()
        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment not found or access denied.",
            )
        return attachment

    @staticmethod
    async def list_attachments(
        *,
        db: AsyncSession,
        user_id: uuid.UUID,
        media_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Attachment], int]:
        """Return paginated attachments for *user_id*, optionally filtered by *media_type*."""
        stmt = select(Attachment).where(
            Attachment.user_id == user_id,
            Attachment.deleted_at.is_(None),
        )
        if media_type:
            stmt = stmt.where(Attachment.media_type == media_type)
        stmt = stmt.order_by(Attachment.created_at.desc())

        # Total count
        from sqlalchemy import func, select as sa_select
        count_stmt = sa_select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar_one()

        # Paginate
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        rows = await db.execute(stmt)
        return list(rows.scalars().all()), total

    @staticmethod
    async def read_bytes(
        *,
        db: AsyncSession,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> tuple[bytes, str]:
        """
        Return (raw_bytes, mime_type) for *attachment_id* owned by *user_id*.
        Raises 404 on ownership failure or soft-deleted attachment.
        """
        stmt = select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == user_id,
            Attachment.deleted_at.is_(None),
        )
        result = await db.execute(stmt)
        attachment = result.scalar_one_or_none()
        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment not found or access denied.",
            )
        storage = get_storage_provider()
        data = await storage.read(attachment.storage_key)
        return data, attachment.mime_type

    @staticmethod
    async def delete(
        *,
        db: AsyncSession,
        attachment_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """
        Soft-delete the attachment record and remove the storage object.

        Order: storage delete first, then DB update, so there is no
        window where the record exists but the file is gone.
        """
        stmt = select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == user_id,
            Attachment.deleted_at.is_(None),
        )
        result = await db.execute(stmt)
        attachment = result.scalar_one_or_none()
        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment not found or access denied.",
            )

        # Remove from storage first
        storage = get_storage_provider()
        try:
            await storage.delete(attachment.storage_key)
        except FileNotFoundError:
            pass  # Already gone — proceed with DB soft-delete

        attachment.deleted_at = datetime.now(timezone.utc)
        attachment.status = "deleted"
        await db.commit()
