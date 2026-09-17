# NexaAI Smoke Testing Documentation

**Project**: NexaAI Multimodal AI SaaS Platform  
**Location**: `C:\Users\Abdul\Desktop\Chatbot`  
**Script**: `scripts/smoke_test.py`  

---

## 1. Overview

The NexaAI Smoke Test Suite (`scripts/smoke_test.py`) is a zero-dependency Python verification tool designed to run against a live local or production NexaAI deployment.

It performs non-destructive verification across:
1. Root health (`/health`), liveness (`/health/liveness`), and readiness (`/health/readiness`).
2. Authentication pipeline (User registration, login JWT issuance, and protected profile `/auth/me`).
3. Model discovery (`/chat/models`).
4. Workspace folder lifecycle (Folder creation, conversation assignment, folder deletion with auto-unfiling).
5. Conversation lifecycle (Pinning, soft-deletion/trash, restoration, and permanent purge).

---

## 2. Running Smoke Tests

### Local Execution (against local backend on port 8000)

```bash
.venv\Scripts\python scripts/smoke_test.py http://localhost:8000
```

### Production / Staging Execution

```bash
python3 scripts/smoke_test.py https://your-production-domain.com
```

---

## 3. Expected Output

```text
============================================================
NexaAI Production Smoke Test Suite -> http://localhost:8000
============================================================
  [PASS] Root Health Probe (/health) 
  [PASS] Liveness Probe (/health/liveness) 
  [PASS] Readiness Probe (/health/readiness) 
  [PASS] User Registration (/auth/register) 
  [PASS] User Login (/auth/login) 
  [PASS] Protected User Profile (/auth/me) 
  [PASS] List AI Models (/chat/models) 
  [PASS] Create Folder (/folders) 
  [PASS] Create Conversation (/chat/conversations) 
  [PASS] Update Conversation Folder & Pin 
  [PASS] Trash Conversation 
  [PASS] Restore Conversation 
  [PASS] Purge Conversation 
  [PASS] Delete Folder (/folders/{id}) 
============================================================
Smoke Test Summary: 13 Passed, 0 Failed
============================================================
```
