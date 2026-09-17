"""API endpoints for conversation export and secure hashed-token sharing."""

import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.share import (
    CreateShareRequest,
    PublicShareView,
    ShareResponse,
    UpdateShareRequest,
)
from app.services.export_service import ExportService
from app.services.share_service import ShareService

router = APIRouter(tags=["export-and-share"])


# ---------------------------------------------------------------------------
# 1. Conversation Export Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/conversations/{conversation_id}/export",
    summary="Export conversation to Markdown, JSON, or PDF",
)
async def export_conversation(
    conversation_id: uuid.UUID,
    format: str = Query("markdown", description="Export format: 'markdown', 'json', or 'pdf'"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export an owned conversation in Markdown, JSON, or PDF format with sanitized headers."""
    fmt = format.lower().strip()
    if fmt not in ("markdown", "json", "pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported export format. Supported formats: 'markdown', 'json', 'pdf'.",
        )

    if fmt == "markdown":
        md_text, filename = await ExportService.export_markdown(db, conversation_id, current_user.id)
        if md_text is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        return Response(
            content=md_text.encode("utf-8"),
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    elif fmt == "json":
        json_payload, filename = await ExportService.export_json(db, conversation_id, current_user.id)
        if json_payload is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        json_bytes = json.dumps(json_payload, indent=2).encode("utf-8")
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    else:  # pdf
        pdf_bytes, filename = await ExportService.export_pdf(db, conversation_id, current_user.id)
        if pdf_bytes is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


# ---------------------------------------------------------------------------
# 2. Owner Share Management Endpoints (Authenticated)
# ---------------------------------------------------------------------------

@router.post(
    "/conversations/{conversation_id}/share",
    response_model=ShareResponse,
    summary="Create or re-enable public share link",
)
async def create_share_link(
    conversation_id: uuid.UUID,
    body: Optional[CreateShareRequest] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ShareResponse:
    """Generate or update public share link for an owned conversation."""
    expires_in_days = body.expires_in_days if body else None
    share, raw_token = await ShareService.create_or_update_share(
        db=db,
        conversation_id=conversation_id,
        owner_id=current_user.id,
        expires_in_days=expires_in_days,
    )
    if not share or not raw_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )

    return ShareResponse(
        id=str(share.id),
        conversation_id=str(share.conversation_id),
        share_token=raw_token,
        share_url=f"/shared/{raw_token}",
        is_enabled=share.is_enabled,
        expires_at=share.expires_at,
        revoked_at=share.revoked_at,
        access_count=share.access_count,
        last_accessed_at=share.last_accessed_at,
        created_at=share.created_at,
    )


@router.get(
    "/conversations/{conversation_id}/share",
    response_model=ShareResponse,
    summary="Get share link status for an owned conversation",
)
async def get_share_status(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ShareResponse:
    """Retrieve existing share status for an owned conversation."""
    share = await ShareService.get_owner_share(db, conversation_id, current_user.id)
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No share link configured for this conversation.",
        )

    return ShareResponse(
        id=str(share.id),
        conversation_id=str(share.conversation_id),
        share_token=None,
        share_url=None,
        is_enabled=share.is_enabled,
        expires_at=share.expires_at,
        revoked_at=share.revoked_at,
        access_count=share.access_count,
        last_accessed_at=share.last_accessed_at,
        created_at=share.created_at,
    )


@router.patch(
    "/conversations/{conversation_id}/share",
    response_model=ShareResponse,
    summary="Update share link settings (enable/disable/expiration)",
)
async def update_share_settings(
    conversation_id: uuid.UUID,
    body: UpdateShareRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ShareResponse:
    """Update share link active status or expiration."""
    share = await ShareService.update_share_status(
        db=db,
        conversation_id=conversation_id,
        owner_id=current_user.id,
        is_enabled=body.is_enabled,
        expires_in_days=body.expires_in_days,
    )
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No share link found to update.",
        )

    return ShareResponse(
        id=str(share.id),
        conversation_id=str(share.conversation_id),
        share_token=None,
        share_url=None,
        is_enabled=share.is_enabled,
        expires_at=share.expires_at,
        revoked_at=share.revoked_at,
        access_count=share.access_count,
        last_accessed_at=share.last_accessed_at,
        created_at=share.created_at,
    )


@router.delete(
    "/conversations/{conversation_id}/share",
    summary="Revoke share link",
)
async def revoke_share_link(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Revoke public share link immediately."""
    success = await ShareService.revoke_share(db, conversation_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active share link found to revoke.",
        )
    return {"message": "Share link revoked successfully"}


# ---------------------------------------------------------------------------
# 3. Public Read-Only Endpoint (Unauthenticated)
# ---------------------------------------------------------------------------

@router.get(
    "/shared/{token}",
    response_model=PublicShareView,
    summary="Get read-only view of a shared conversation",
)
async def get_public_shared_conversation(
    token: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> PublicShareView:
    """Public read-only endpoint returning shared conversation payload.

    Includes 'X-Robots-Tag: noindex, nofollow' header to prevent search engine indexing.
    """
    response.headers["X-Robots-Tag"] = "noindex, nofollow"

    view, reason = await ShareService.get_public_shared_view(db, token)
    if not view:
        if reason == "expired":
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This shared conversation link has expired.",
            )
        elif reason in ("disabled", "revoked", "trashed"):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This shared conversation link has been revoked, deleted, or moved to trash.",
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared conversation not found or invalid token.",
            )

    return view
