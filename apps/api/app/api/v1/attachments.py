"""Attachment API router — Phase 10 Multimodal Foundation."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.attachments import (
    AttachmentListResponse,
    AttachmentResponse,
    AttachmentUploadResponse,
)
from app.services.attachments.service import AttachmentService
from app.services.storage.service import get_storage_provider

router = APIRouter(prefix="/attachments", tags=["Attachments"])


def _build_response(attachment, include_download_url: bool = True) -> AttachmentResponse:
    """Map ORM Attachment → AttachmentResponse, injecting the download URL."""
    storage = get_storage_provider()
    data = AttachmentResponse.model_validate(attachment)
    if include_download_url:
        data.download_url = storage.get_download_url(str(attachment.id))
    return data


@router.post(
    "/upload",
    response_model=AttachmentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file attachment (image, document, or audio)",
)
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentUploadResponse:
    """
    Validate, store, and index a file attachment.

    Supported media:
    - **Images**: JPEG, PNG, WebP, GIF (≤ 10 MB)
    - **Documents**: PDF, DOCX, TXT, MD (≤ 25 MB)
    - **Audio**: WebM, MP3, WAV, M4A (≤ 25 MB, Phase 13 feature)

    Returns attachment metadata including a download URL.
    The physical storage path is never exposed to clients.
    """
    filename = file.filename or "upload"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()

    attachment = await AttachmentService.upload(
        db=db,
        user_id=current_user.id,
        filename=filename,
        content_type=content_type,
        data=data,
    )
    storage = get_storage_provider()
    resp = AttachmentUploadResponse.model_validate(attachment)
    resp.download_url = storage.get_download_url(str(attachment.id))
    return resp


@router.get(
    "",
    response_model=AttachmentListResponse,
    summary="List attachments for the authenticated user",
)
async def list_attachments(
    media_type: Optional[str] = Query(
        default=None,
        description="Filter by media type: image | audio | document | video | other",
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentListResponse:
    """Return paginated attachments owned by the authenticated user."""
    items, total = await AttachmentService.list_attachments(
        db=db,
        user_id=current_user.id,
        media_type=media_type,
        page=page,
        page_size=page_size,
    )
    return AttachmentListResponse(
        items=[_build_response(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{attachment_id}",
    response_model=AttachmentResponse,
    summary="Get attachment metadata by ID",
)
async def get_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentResponse:
    """Return metadata for a single attachment with strict ownership enforcement."""
    attachment = await AttachmentService.get_by_id(
        db=db,
        attachment_id=attachment_id,
        user_id=current_user.id,
    )
    return _build_response(attachment)


@router.get(
    "/{attachment_id}/download",
    summary="Stream attachment file bytes",
    response_class=Response,
)
async def download_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Stream the raw file bytes for an attachment owned by the authenticated user.

    Sets appropriate ``Content-Type`` and ``Content-Disposition`` headers.
    """
    data, mime_type = await AttachmentService.read_bytes(
        db=db,
        attachment_id=attachment_id,
        user_id=current_user.id,
    )
    # Fetch filename for Content-Disposition
    attachment = await AttachmentService.get_by_id(
        db=db,
        attachment_id=attachment_id,
        user_id=current_user.id,
    )
    return Response(
        content=data,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{attachment.original_filename}"',
            "Content-Length": str(len(data)),
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an attachment (soft-delete + storage cleanup)",
)
async def delete_attachment(
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete the attachment record and remove the stored file."""
    await AttachmentService.delete(
        db=db,
        attachment_id=attachment_id,
        user_id=current_user.id,
    )
