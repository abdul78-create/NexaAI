"""Unit and integration tests for application health, system metadata, and error handling."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_root_health_endpoint():
    """Verify that root /health returns 200 OK and valid health metadata."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["service"] == settings.APP_NAME.lower().replace(" ", "-")
    assert data["version"] == settings.APP_VERSION
    assert data["environment"] == settings.APP_ENV
    assert "X-Request-ID" in response.headers


def test_versioned_health_endpoint():
    """Verify that /api/v1/health returns 200 OK with identical schema."""
    response = client.get(f"{settings.API_V1_PREFIX}/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["version"] == settings.APP_VERSION


def test_system_info_endpoint():
    """Verify that /api/v1/system/info returns configuration metadata safely."""
    response = client.get(f"{settings.API_V1_PREFIX}/system/info")
    assert response.status_code == 200

    data = response.json()
    assert data["app_name"] == settings.APP_NAME
    assert data["version"] == settings.APP_VERSION
    assert data["api_prefix"] == settings.API_V1_PREFIX


def test_custom_error_envelope_on_404():
    """Verify that unknown routes return the unified JSON error envelope."""
    response = client.get("/api/v1/non-existent-route")
    assert response.status_code == 404

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "HTTP_404"
    assert "Not Found" in data["error"]["message"]
    assert "request_id" in data["error"]
    assert "X-Request-ID" in response.headers


def test_cors_headers():
    """Verify that CORS middleware permits configured origins."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
