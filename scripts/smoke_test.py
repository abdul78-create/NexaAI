#!/usr/bin/env python3
"""
NexaAI Production Deployment Smoke Test Suite
Executes lightweight non-destructive verification probes against a running NexaAI instance.
"""

import sys
import uuid
import time
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple


class SmokeTestRunner:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.email = f"smoketest_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "SmokeTest_SecurePass_2026!"
        self.token = ""
        self.passed = 0
        self.failed = 0

    def log(self, test_name: str, success: bool, message: str = ""):
        if success:
            self.passed += 1
            print(f"  [PASS] {test_name} {message}")
        else:
            self.failed += 1
            print(f"  [FAIL] {test_name} - {message}")

    def request(
        self,
        path: str,
        method: str = "GET",
        data: Dict[str, Any] = None,
        headers: Dict[str, str] = None,
    ) -> Tuple[int, Dict[str, Any], Dict[str, str]]:
        url = f"{self.base_url}{path}"
        req_headers = {"Content-Type": "application/json"}
        if self.token:
            req_headers["Authorization"] = f"Bearer {self.token}"
        if headers:
            req_headers.update(headers)

        encoded_data = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                status_code = resp.status
                resp_headers = dict(resp.headers)
                body_text = resp.read().decode("utf-8")
                resp_json = json.loads(body_text) if body_text and "json" in resp_headers.get("Content-Type", "") else {"raw": body_text}
                return status_code, resp_json, resp_headers
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8")
            try:
                resp_json = json.loads(body_text)
            except Exception:
                resp_json = {"raw": body_text}
            return e.code, resp_json, dict(e.headers)
        except Exception as exc:
            return 500, {"error": str(exc)}, {}

    def run_all(self):
        print("=" * 60)
        print(f"NexaAI Production Smoke Test Suite -> {self.base_url}")
        print("=" * 60)

        # 1. Health Probes
        code, body, _ = self.request("/health")
        self.log("Root Health Probe (/health)", code == 200 and body.get("status") in ["healthy", "degraded"])

        code, body, _ = self.request("/health/liveness")
        self.log("Liveness Probe (/health/liveness)", code == 200 and body.get("status") == "healthy")

        code, body, _ = self.request("/health/readiness")
        self.log("Readiness Probe (/health/readiness)", code == 200 and body.get("database") == "connected")

        # 2. Registration & Auth
        reg_payload = {"email": self.email, "password": self.password, "display_name": "Smoke Test User"}
        code, body, _ = self.request("/api/v1/auth/register", method="POST", data=reg_payload)
        self.log("User Registration (/auth/register)", code == 201)

        login_payload = {"email": self.email, "password": self.password}
        code, body, _ = self.request("/api/v1/auth/login", method="POST", data=login_payload)

        if code == 200 and "access_token" in body:
            self.token = body["access_token"]
            self.log("User Login (/auth/login)", True)
        else:
            self.log("User Login (/auth/login)", False, f"Code {code}")
            return

        code, body, _ = self.request("/api/v1/auth/me")
        self.log("Protected User Profile (/auth/me)", code == 200 and body.get("email") == self.email)

        # 3. Models Endpoint
        code, body, _ = self.request("/api/v1/chat/models")
        self.log("List AI Models (/chat/models)", code == 200 and isinstance(body, list) and len(body) > 0)

        # 4. Folder Operations
        folder_payload = {"name": f"SmokeFolder_{uuid.uuid4().hex[:4]}", "color": "#8B5CF6"}
        code, body, _ = self.request("/api/v1/folders", method="POST", data=folder_payload)
        folder_id = body.get("id") if code == 201 else None
        self.log("Create Folder (/folders)", code == 201 and folder_id is not None)

        # 5. Conversation Lifecycle
        conv_payload = {"title": "Smoke Test Conversation", "model": "nexa-standard"}
        code, body, _ = self.request("/api/v1/chat/conversations", method="POST", data=conv_payload)
        conv_id = body.get("id") if code == 201 else None
        self.log("Create Conversation (/chat/conversations)", code == 201 and conv_id is not None)

        if conv_id:
            # Move to folder
            code, body, _ = self.request(f"/api/v1/chat/conversations/{conv_id}", method="PATCH", data={"folder_id": folder_id, "is_pinned": True})
            self.log("Update Conversation Folder & Pin", code == 200 and body.get("is_pinned") is True)

            # Move to Trash
            code, body, _ = self.request(f"/api/v1/chat/conversations/{conv_id}/trash", method="POST")
            self.log("Trash Conversation", code == 200 and body.get("deleted_at") is not None)

            # Restore from Trash
            code, body, _ = self.request(f"/api/v1/chat/conversations/{conv_id}/restore", method="POST")
            self.log("Restore Conversation", code == 200 and body.get("deleted_at") is None)

            # Purge Conversation
            code, _, _ = self.request(f"/api/v1/chat/conversations/{conv_id}/purge", method="DELETE")
            self.log("Purge Conversation", code == 204)

        if folder_id:
            # Delete Folder
            code, _, _ = self.request(f"/api/v1/folders/{folder_id}", method="DELETE")
            self.log("Delete Folder (/folders/{id})", code == 204)

        print("=" * 60)
        print(f"Smoke Test Summary: {self.passed} Passed, {self.failed} Failed")
        print("=" * 60)
        if self.failed > 0:
            sys.exit(1)


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    runner = SmokeTestRunner(target)
    runner.run_all()


if __name__ == "__main__":
    main()
