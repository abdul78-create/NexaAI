"""Folder endpoints router."""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate
from app.services.folder_service import (
    create_user_folder,
    delete_user_folder,
    get_user_folder,
    list_user_folders,
    update_user_folder,
)

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.get(
    "",
    response_model=List[FolderResponse],
    summary="List all folders owned by current authenticated user",
)
async def list_folders(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[FolderResponse]:
    """Retrieve all folders for caller with strict ownership filtering."""
    folders = await list_user_folders(db, current_user.id)
    return [FolderResponse.model_validate(f) for f in folders]


@router.post(
    "",
    response_model=FolderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace folder",
)
async def create_folder(
    payload: FolderCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> FolderResponse:
    """Create a new folder owned by authenticated user."""
    try:
        folder = await create_user_folder(db, current_user.id, payload)
        return FolderResponse.model_validate(folder)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{folder_id}",
    response_model=FolderResponse,
    summary="Get folder details by ID",
)
async def get_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> FolderResponse:
    """Get folder details with strict ownership verification."""
    folder = await get_user_folder(db, folder_id, current_user.id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found or access denied.",
        )
    return FolderResponse.model_validate(folder)


@router.patch(
    "/{folder_id}",
    response_model=FolderResponse,
    summary="Update folder name or color",
)
async def update_folder(
    folder_id: UUID,
    payload: FolderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> FolderResponse:
    """Update folder owned by current user."""
    try:
        folder = await update_user_folder(db, folder_id, current_user.id, payload)
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found or access denied.",
            )
        return FolderResponse.model_validate(folder)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workspace folder",
)
async def delete_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a folder owned by current user. Conversations in this folder will be un-filed."""
    deleted = await delete_user_folder(db, folder_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found or access denied.",
        )
    return None
