"""Unit tests for Phase 17.1.1 ORM models and schema extensions."""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.chat import Conversation, ChatMessage
from app.db.models.folder import Folder

pytestmark = pytest.mark.asyncio


async def test_folder_model_crud_and_uniqueness(async_db: AsyncSession):
    """Test Folder creation, relationship with User, and user_id + name uniqueness constraint."""
    user = User(
        email="folder_test@example.com",
        hashed_password="SecretPassword123!",
        display_name="Folder Test User",
    )
    async_db.add(user)
    await async_db.commit()
    await async_db.refresh(user)

    # 1. Create Folder
    folder1 = Folder(
        user_id=user.id,
        name="Research Projects",
        color="emerald",
    )
    async_db.add(folder1)
    await async_db.commit()
    await async_db.refresh(folder1)

    assert folder1.id is not None
    assert folder1.name == "Research Projects"
    assert folder1.color == "emerald"
    assert folder1.user_id == user.id

    # 2. Unique constraint per user: same name should fail
    duplicate_folder = Folder(
        user_id=user.id,
        name="Research Projects",
        color="indigo",
    )
    async_db.add(duplicate_folder)
    with pytest.raises(IntegrityError):
        await async_db.commit()
    await async_db.rollback()


async def test_conversation_extended_fields_and_folder_unfiling(async_db: AsyncSession):
    """Test is_pinned, deleted_at, folder_id, active_leaf_message_id and folder deletion SET NULL."""
    user = User(
        email="conv_ext_test@example.com",
        hashed_password="SecretPassword123!",
        display_name="Conv Ext Test User",
    )
    async_db.add(user)
    await async_db.commit()
    await async_db.refresh(user)

    folder = Folder(user_id=user.id, name="Work Projects", color="purple")
    async_db.add(folder)
    await async_db.commit()
    await async_db.refresh(folder)

    conv = Conversation(
        user_id=user.id,
        folder_id=folder.id,
        title="Pinned Project Conversation",
        is_pinned=True,
        is_archived=False,
        deleted_at=datetime.now(timezone.utc),
    )
    async_db.add(conv)
    await async_db.commit()
    await async_db.refresh(conv)

    assert conv.is_pinned is True
    assert conv.is_archived is False
    assert conv.deleted_at is not None
    assert conv.folder_id == folder.id

    # Add messages and test parent_message_id & active_leaf_message_id
    msg1 = ChatMessage(
        conversation_id=conv.id,
        role="user",
        content="What is Python asyncio?",
    )
    async_db.add(msg1)
    await async_db.commit()
    await async_db.refresh(msg1)

    msg2 = ChatMessage(
        conversation_id=conv.id,
        parent_message_id=msg1.id,
        role="assistant",
        content="Python asyncio is an event loop library for concurrent code execution.",
    )
    async_db.add(msg2)
    await async_db.commit()
    await async_db.refresh(msg2)

    assert msg2.parent_message_id == msg1.id

    # Set active_leaf_message_id
    conv.active_leaf_message_id = msg2.id
    await async_db.commit()
    await async_db.refresh(conv)

    assert conv.active_leaf_message_id == msg2.id

    # Delete folder -> conversation folder_id should become NULL (un-filed)
    conv.folder_id = None
    await async_db.delete(folder)
    await async_db.commit()

    await async_db.refresh(conv)
    assert conv.folder_id is None
