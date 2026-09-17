"""Folder service enforcing strict per-user ownership and unique folder names."""

import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.folder import Folder
from app.schemas.folder import FolderCreate, FolderUpdate


async def get_user_folder(
    db: AsyncSession,
    folder_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Optional[Folder]:
    """Retrieve a folder by ID ONLY if owned by target user_id."""
    stmt = select(Folder).where(
        Folder.id == folder_id,
        Folder.user_id == user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_user_folders(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> List[Folder]:
    """List all folders owned by target user_id."""
    stmt = select(Folder).where(Folder.user_id == user_id).order_by(Folder.name.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_user_folder(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: FolderCreate,
) -> Folder:
    """Create a new folder for user_id, checking for duplicate folder name."""
    clean_name = payload.name.strip()
    clean_color = (payload.color or "indigo").strip()

    # Check if folder name already exists for this user
    existing_stmt = select(Folder).where(
        Folder.user_id == user_id,
        Folder.name == clean_name,
    )
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise ValueError(f"A folder named '{clean_name}' already exists.")

    folder = Folder(
        user_id=user_id,
        name=clean_name,
        color=clean_color,
    )
    db.add(folder)
    try:
        await db.commit()
        await db.refresh(folder)
    except IntegrityError:
        await db.rollback()
        raise ValueError(f"A folder named '{clean_name}' already exists.")

    return folder


async def update_user_folder(
    db: AsyncSession,
    folder_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: FolderUpdate,
) -> Optional[Folder]:
    """Update name or color of a folder owned by user_id."""
    folder = await get_user_folder(db, folder_id, user_id)
    if not folder:
        return None

    if payload.name is not None:
        clean_name = payload.name.strip()
        if clean_name != folder.name:
            # Check for duplicate name
            existing_stmt = select(Folder).where(
                Folder.user_id == user_id,
                Folder.name == clean_name,
                Folder.id != folder_id,
            )
            existing_res = await db.execute(existing_stmt)
            if existing_res.scalar_one_or_none():
                raise ValueError(f"A folder named '{clean_name}' already exists.")
            folder.name = clean_name

    if payload.color is not None:
        folder.color = payload.color.strip()

    try:
        await db.commit()
        await db.refresh(folder)
    except IntegrityError:
        await db.rollback()
        raise ValueError("Folder update failed due to constraint violation.")

    return folder


async def delete_user_folder(
    db: AsyncSession,
    folder_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Delete a folder owned by user_id.
    
    Database foreign key `conversations.folder_id` ON DELETE SET NULL
    automatically un-files conversations without deleting them.
    """
    folder = await get_user_folder(db, folder_id, user_id)
    if not folder:
        return False

    await db.delete(folder)
    await db.commit()
    return True
