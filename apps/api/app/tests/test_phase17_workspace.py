"""Comprehensive test suite for Phase 17.1.2 (Workspace, Folders, Trash, Pin, Restore, Search/Export/Share integration)."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _get_user_token(client: AsyncClient, email: str, name: str) -> str:
    """Helper to register and log in a test user, returning access token."""
    reg_payload = {
        "email": email,
        "password": "ValidPassword999!",
        "display_name": name,
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "ValidPassword999!"},
    )
    return login_res.json()["access_token"]


async def test_folder_crud_and_per_user_uniqueness(client: AsyncClient):
    """Test folder creation, listing, updating, per-user uniqueness, and isolation."""
    token_a = await _get_user_token(client, "folder_owner_a@example.com", "Owner A")
    token_b = await _get_user_token(client, "folder_owner_b@example.com", "Owner B")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Create folder for User A
    res = await client.post(
        "/api/v1/folders",
        headers=headers_a,
        json={"name": "Research Papers", "color": "emerald"},
    )
    assert res.status_code == 201
    folder_a = res.json()
    assert folder_a["name"] == "Research Papers"
    assert folder_a["color"] == "emerald"
    folder_a_id = folder_a["id"]

    # 2. Duplicate folder name for User A fails
    dup_res = await client.post(
        "/api/v1/folders",
        headers=headers_a,
        json={"name": "Research Papers", "color": "blue"},
    )
    assert dup_res.status_code == 400
    assert "already exists" in str(dup_res.json())


    # 3. User B can create folder with same name
    res_b = await client.post(
        "/api/v1/folders",
        headers=headers_b,
        json={"name": "Research Papers", "color": "purple"},
    )
    assert res_b.status_code == 201
    assert res_b.json()["id"] != folder_a_id

    # 4. List folders for User A
    list_res = await client.get("/api/v1/folders", headers=headers_a)
    assert list_res.status_code == 200
    folders_a = list_res.json()
    assert len(folders_a) == 1
    assert folders_a[0]["id"] == folder_a_id

    # 5. Update folder for User A
    update_res = await client.patch(
        f"/api/v1/folders/{folder_a_id}",
        headers=headers_a,
        json={"name": "Deep Learning Papers", "color": "sky"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Deep Learning Papers"

    # 6. User B cannot access or update User A's folder
    cross_res = await client.get(f"/api/v1/folders/{folder_a_id}", headers=headers_b)
    assert cross_res.status_code == 404

    cross_update = await client.patch(
        f"/api/v1/folders/{folder_a_id}",
        headers=headers_b,
        json={"name": "Hacked"},
    )
    assert cross_update.status_code == 404

    # 7. Delete folder for User A
    del_res = await client.delete(f"/api/v1/folders/{folder_a_id}", headers=headers_a)
    assert del_res.status_code == 204


async def test_conversation_pin_archive_folder_and_unfiling(client: AsyncClient):
    """Test conversation pinning, archiving, folder moving, and automatic un-filing on folder deletion."""
    token = await _get_user_token(client, "workspace_user@example.com", "Workspace User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a folder
    f_res = await client.post(
        "/api/v1/folders",
        headers=headers,
        json={"name": "Projects", "color": "amber"},
    )
    assert f_res.status_code == 201
    folder_id = f_res.json()["id"]

    # 2. Create two conversations
    c1_res = await client.post(
        "/api/v1/chat/conversations",
        headers=headers,
        json={"title": "Chat Alpha", "model": "nexa-standard"},
    )
    assert c1_res.status_code == 201
    conv1_id = c1_res.json()["id"]

    c2_res = await client.post(
        "/api/v1/chat/conversations",
        headers=headers,
        json={"title": "Chat Beta", "model": "nexa-pro"},
    )
    assert c2_res.status_code == 201
    conv2_id = c2_res.json()["id"]

    # 3. Pin conv2, move conv1 to folder
    patch1 = await client.patch(
        f"/api/v1/chat/conversations/{conv1_id}",
        headers=headers,
        json={"folder_id": folder_id},
    )
    assert patch1.status_code == 200
    assert patch1.json()["folder_id"] == folder_id

    patch2 = await client.patch(
        f"/api/v1/chat/conversations/{conv2_id}",
        headers=headers,
        json={"is_pinned": True},
    )
    assert patch2.status_code == 200
    assert patch2.json()["is_pinned"] is True

    # 4. Filter list by folder_id
    folder_list = await client.get(f"/api/v1/chat/conversations?folder_id={folder_id}", headers=headers)
    assert folder_list.status_code == 200
    f_convs = folder_list.json()
    assert len(f_convs) == 1
    assert f_convs[0]["id"] == conv1_id

    # 5. Filter list by is_pinned
    pinned_list = await client.get("/api/v1/chat/conversations?is_pinned=true", headers=headers)
    assert pinned_list.status_code == 200
    p_convs = pinned_list.json()
    assert len(p_convs) == 1
    assert p_convs[0]["id"] == conv2_id

    # 6. Delete folder and verify conv1 is un-filed (folder_id becomes None)
    del_f = await client.delete(f"/api/v1/folders/{folder_id}", headers=headers)
    assert del_f.status_code == 204

    get_c1 = await client.get(f"/api/v1/chat/conversations/{conv1_id}", headers=headers)
    assert get_c1.status_code == 200
    assert get_c1.json()["folder_id"] is None


async def test_conversation_soft_delete_trash_restore_and_purge(client: AsyncClient):
    """Test soft-deletion (trash), listing trash, restoring (preserving metadata), and hard purging."""
    token = await _get_user_token(client, "trash_user@example.com", "Trash User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a folder and conversation with pin and folder metadata
    f_res = await client.post("/api/v1/folders", headers=headers, json={"name": "Archive Folder"})
    folder_id = f_res.json()["id"]

    c_res = await client.post("/api/v1/chat/conversations", headers=headers, json={"title": "Important Session"})
    conv_id = c_res.json()["id"]

    # Set metadata
    await client.patch(
        f"/api/v1/chat/conversations/{conv_id}",
        headers=headers,
        json={"is_pinned": True, "is_archived": True, "folder_id": folder_id},
    )

    # 2. Soft-delete conversation (move to trash)
    trash_res = await client.post(f"/api/v1/chat/conversations/{conv_id}/trash", headers=headers)
    assert trash_res.status_code == 200
    assert trash_res.json()["deleted_at"] is not None

    # 3. Active conversation list does not contain trashed conversation
    active_list = await client.get("/api/v1/chat/conversations?include_archived=true", headers=headers)
    assert active_list.status_code == 200
    assert not any(c["id"] == conv_id for c in active_list.json())

    # 4. Trash endpoint lists soft-deleted conversation
    trash_list = await client.get("/api/v1/chat/conversations/trash", headers=headers)
    assert trash_list.status_code == 200
    t_convs = trash_list.json()
    assert len(t_convs) == 1
    assert t_convs[0]["id"] == conv_id

    # 5. Restore conversation and verify metadata preservation
    restore_res = await client.post(f"/api/v1/chat/conversations/{conv_id}/restore", headers=headers)
    assert restore_res.status_code == 200
    restored = restore_res.json()
    assert restored["deleted_at"] is None
    assert restored["is_pinned"] is True
    assert restored["is_archived"] is True
    assert restored["folder_id"] == folder_id

    # 6. Purge conversation permanently
    purge_res = await client.delete(f"/api/v1/chat/conversations/{conv_id}/purge", headers=headers)
    assert purge_res.status_code == 204

    # Verify 404 after purge
    get_res = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert get_res.status_code == 404


async def test_search_export_share_integration_with_trash_and_archived(client: AsyncClient):
    """Test search excluding trashed items, export denying trashed, and public share returning 410 Gone."""
    token = await _get_user_token(client, "integration_user@example.com", "Integration User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a conversation via SSE stream to generate message content
    await client.post(
        "/api/v1/chat/stream",
        headers=headers,
        json={"content": "Secret Confidential Project Delta details", "model": "nexa-standard"},
    )
    convs = (await client.get("/api/v1/chat/conversations", headers=headers)).json()
    conv_id = convs[0]["id"]

    # Create share link before trashing
    share_res = await client.post(f"/api/v1/conversations/{conv_id}/share", headers=headers)
    assert share_res.status_code == 200
    share_token = share_res.json()["share_token"]

    # Verify public share works while active
    pub_res = await client.get(f"/api/v1/shared/{share_token}")
    assert pub_res.status_code == 200

    # 2. Soft-delete the conversation
    await client.post(f"/api/v1/chat/conversations/{conv_id}/trash", headers=headers)

    # 3. Search must NOT return the trashed conversation or messages
    search_res = await client.get("/api/v1/search?q=Confidential", headers=headers)
    assert search_res.status_code == 200
    assert search_res.json()["total_results"] == 0

    # 4. Export must return 404 for trashed conversation
    export_res = await client.get(f"/api/v1/conversations/{conv_id}/export?format=markdown", headers=headers)
    assert export_res.status_code == 404

    # 5. Public share link must return HTTP 410 Gone for trashed conversation
    pub_trashed = await client.get(f"/api/v1/shared/{share_token}")
    assert pub_trashed.status_code == 410
    assert "revoked, deleted, or moved to trash" in str(pub_trashed.json())

