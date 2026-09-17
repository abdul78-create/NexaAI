"""Secure conversation sharing service with hashed tokens and read-only public isolation."""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.attachment import Attachment
from app.db.models.chat import ChatMessage, Conversation
from app.db.models.chat_message_attachment import ChatMessageAttachment
from app.db.models.share import ConversationShare
from app.schemas.share import PublicShareView, SharedAttachmentMetadata, SharedMessageItem


def hash_share_token(raw_token: str) -> str:
    """Compute SHA-256 hash of public share token for secure storage at rest."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime object is timezone-aware in UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class ShareService:
    """Service providing owner share controls and public read-only access."""

    @staticmethod
    async def create_or_update_share(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
        expires_in_days: Optional[int] = None,
    ) -> Tuple[Optional[ConversationShare], Optional[str]]:
        """Create a new share link or re-enable existing share for a conversation owned by user."""
        # 1. Verify conversation ownership
        conv_stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == owner_id,
        )
        conv_res = await db.execute(conv_stmt)
        conversation = conv_res.scalar_one_or_none()
        if not conversation:
            return None, None

        # 2. Check for existing share record
        share_stmt = select(ConversationShare).where(
            ConversationShare.conversation_id == conversation_id,
            ConversationShare.owner_id == owner_id,
        )
        share_res = await db.execute(share_stmt)
        share = share_res.scalar_one_or_none()

        expires_at = (
            datetime.now(timezone.utc) + timedelta(days=expires_in_days)
            if expires_in_days
            else None
        )

        raw_token: Optional[str] = None
        if share:
            # Generate fresh token if revoked or requested
            raw_token = secrets.token_urlsafe(24)
            share.token_hash = hash_share_token(raw_token)
            share.is_enabled = True
            share.expires_at = expires_at
            share.revoked_at = None
        else:
            raw_token = secrets.token_urlsafe(24)
            share = ConversationShare(
                conversation_id=conversation_id,
                owner_id=owner_id,
                token_hash=hash_share_token(raw_token),
                is_enabled=True,
                expires_at=expires_at,
            )
            db.add(share)

        await db.commit()
        await db.refresh(share)
        return share, raw_token

    @staticmethod
    async def get_owner_share(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> Optional[ConversationShare]:
        """Fetch existing share settings for an owned conversation."""
        stmt = select(ConversationShare).where(
            ConversationShare.conversation_id == conversation_id,
            ConversationShare.owner_id == owner_id,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_share_status(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
        is_enabled: Optional[bool] = None,
        expires_in_days: Optional[int] = None,
    ) -> Optional[ConversationShare]:
        """Update active status or expiration of an existing share record."""
        share = await ShareService.get_owner_share(db, conversation_id, owner_id)
        if not share:
            return None

        if is_enabled is not None:
            share.is_enabled = is_enabled
            if not is_enabled and not share.revoked_at:
                share.revoked_at = datetime.now(timezone.utc)

        if expires_in_days is not None:
            share.expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

        await db.commit()
        await db.refresh(share)
        return share

    @staticmethod
    async def revoke_share(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> bool:
        """Revoke a share link immediately."""
        share = await ShareService.get_owner_share(db, conversation_id, owner_id)
        if not share:
            return False

        share.is_enabled = False
        share.revoked_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    @staticmethod
    async def get_public_shared_view(
        db: AsyncSession,
        raw_token: str,
    ) -> Tuple[Optional[PublicShareView], str]:
        """Fetch public read-only conversation view by raw token."""
        token_hash = hash_share_token(raw_token)

        stmt = select(ConversationShare).where(ConversationShare.token_hash == token_hash)
        res = await db.execute(stmt)
        share = res.scalar_one_or_none()

        if not share:
            return None, "not_found"

        if share.revoked_at is not None or not share.is_enabled:
            return None, "disabled"

        exp_utc = ensure_utc(share.expires_at)
        if exp_utc and exp_utc < datetime.now(timezone.utc):
            return None, "expired"

        # Update access counter and timestamp
        share.access_count += 1
        share.last_accessed_at = datetime.now(timezone.utc)
        await db.commit()

        # Fetch conversation and messages with attachments
        conv_stmt = (
            select(Conversation)
            .where(Conversation.id == share.conversation_id)
            .options(
                selectinload(Conversation.messages).selectinload(ChatMessage.message_attachments)
            )
        )
        conv_res = await db.execute(conv_stmt)
        conv = conv_res.scalar_one_or_none()

        if not conv:
            return None, "not_found"

        if conv.deleted_at is not None:
            return None, "trashed"


        # Build public messages list with safe attachments
        shared_messages: List[SharedMessageItem] = []
        for msg in conv.messages:
            attachments_meta: List[SharedAttachmentMetadata] = []
            for cma in msg.message_attachments:
                # Query target attachment metadata
                att_stmt = select(Attachment).where(Attachment.id == cma.attachment_id)
                att_res = await db.execute(att_stmt)
                att = att_res.scalar_one_or_none()
                if att:
                    attachments_meta.append(
                        SharedAttachmentMetadata(
                            id=str(att.id),
                            original_filename=att.original_filename,
                            mime_type=att.mime_type,
                            size_bytes=att.size_bytes,
                            media_type=att.media_type,
                        )
                    )

            shared_messages.append(
                SharedMessageItem(
                    id=str(msg.id),
                    role=msg.role,
                    content=msg.content,
                    created_at=msg.created_at,
                    attachments=attachments_meta,
                )
            )

        view = PublicShareView(
            conversation_id=str(conv.id),
            title=conv.title,
            model=conv.model,
            created_at=conv.created_at,
            messages=shared_messages,
        )

        return view, "active"
