"""Main API Router aggregating all versioned endpoints."""

from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.system import router as system_router

api_v1_router = APIRouter()

# Register sub-routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(auth_router)
