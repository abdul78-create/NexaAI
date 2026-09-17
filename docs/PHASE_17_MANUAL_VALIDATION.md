# Phase 17 — Manual Validation Guide
**Step-by-Step Browser & API Verification Procedures**

This document provides step-by-step instructions for testing and validating all workspace, folder, message editing, regeneration, and branching capabilities in NexaAI.

---

## Prerequisites
1. Start the backend service:
   ```bash
   cd apps/api
   .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
   ```
2. Start the Next.js frontend dev server:
   ```bash
   cd apps/web
   npm run dev
   ```
3. Open `http://localhost:3000` in Google Chrome or Microsoft Edge.

---

## 1. Folder Management Validation

### Step 1.1: Create a Folder
1. In the left workspace sidebar, click **Folders** section or the **+ New Folder** button.
2. Enter folder name: `Machine Learning` and select color `emerald`.
3. Click **Create Folder**.
4. **Expected Result**: `Machine Learning` appears under Folders in the sidebar with an emerald folder icon.

### Step 1.2: Move Conversation into Folder
1. Hover over any active conversation in the sidebar list.
2. Click the `...` action menu and select **Move to Folder** -> **Machine Learning**.
3. **Expected Result**: The conversation shows a tag or moves under `Machine Learning`. Selecting the folder filters the conversation list to only items inside `Machine Learning`.

### Step 1.3: Edit & Delete Folder
1. Click the `...` menu next to `Machine Learning` in the sidebar.
2. Select **Rename/Color** -> Update to `Deep Learning` with `purple`.
3. Select **Delete Folder**.
4. **Expected Result**: The folder is removed from the sidebar. The conversation inside it is NOT deleted; it automatically becomes un-filed.

---

## 2. Pinning & Archiving Validation

### Step 2.1: Pin a Conversation
1. Click the `...` menu on a conversation and select **Pin Conversation**.
2. **Expected Result**: A star or pin icon appears next to the conversation. It moves to the top **Pinned** section in the sidebar.

### Step 2.2: Archive a Conversation
1. Click `...` menu -> **Archive Conversation**.
2. **Expected Result**: The conversation disappears from the main conversation list.
3. Switch sidebar view tab to **Archived**.
4. **Expected Result**: The archived conversation appears in the Archived view. Clicking **Unarchive** returns it to the main list.

---

## 3. Trash, Restore, and Permanent Purge Validation

### Step 3.1: Move to Trash
1. Click `...` menu -> **Move to Trash**.
2. **Expected Result**: The conversation disappears from main and archived views.
3. Switch sidebar view tab to **Trash**.
4. **Expected Result**: The trashed item is listed with a red trash icon and deletion timestamp.

### Step 3.2: Export & Public Share Restrictions on Trash
1. Attempt to search for terms inside the trashed conversation via Search bar.
2. **Expected Result**: Trashed messages do NOT appear in search results.
3. If a public share link was generated before trashing, attempt to access `http://localhost:3000/shared/{token}`.
4. **Expected Result**: The page displays `410 Gone - This shared conversation has been deleted by its owner.`

### Step 3.3: Restore from Trash
1. In the Trash view, click **Restore**.
2. **Expected Result**: The conversation returns to the active workspace list with its original pin, archive, and folder metadata intact.

---

## 4. Message Editing & Assistant Regeneration Validation

### Step 4.1: Edit a User Message Prompt
1. Open an active conversation.
2. Hover over a user message bubble and click the **Pencil (Edit)** icon.
3. Modify the prompt (e.g. from "What is Python?" to "What is Python 3.12?").
4. Click **Save & Submit**.
5. **Expected Result**:
   - The user message updates to the new prompt.
   - A new AI assistant response streams in.
   - The message bubble displays a compact branch navigator: `< 2 / 2 >`.

### Step 4.2: Navigate Branches
1. On the edited user message, click `<` (Previous branch).
2. **Expected Result**: The active conversation path switches back to Version 1 ("What is Python?") and displays the original assistant response.
3. Click `>` (Next branch).
4. **Expected Result**: The path switches back to Version 2 ("What is Python 3.12?") and displays the updated assistant response.

### Step 4.3: Assistant Regeneration
1. Hover over an assistant response bubble and click the **RotateCw (Regenerate)** button.
2. **Expected Result**:
   - A new assistant response is generated under the same user prompt.
   - The assistant message bubble displays `< 2 / 2 >` branch switcher.
   - Clicking `<` and `>` toggles between the original assistant response and the regenerated response.

---

## 5. Security & Isolation Validation

1. Log in as `user_a@example.com` in Browser Window 1.
2. Log in as `user_b@example.com` in Incognito / Browser Window 2.
3. Obtain a message ID or conversation ID from User A.
4. From Browser Window 2 (User B), issue API requests directly to `/api/v1/chat/messages/{user_a_msg_id}/edit` or `/api/v1/chat/conversations/{user_a_conv_id}/select-branch`.
5. **Expected Result**: The backend returns `400 Bad Request` or `404 Not Found`. User B cannot inspect, edit, or manipulate User A's conversation branches.
