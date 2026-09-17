"""Main API Router aggregating all versioned endpoints."""

from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.attachments import router as attachments_router
from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.folders import router as folders_router
from app.api.v1.health import router as health_router
from app.api.v1.images import router as images_router
from app.api.v1.nlp import router as nlp_router
from app.api.v1.oauth import router as oauth_router
from app.api.v1.prompts import router as prompts_router
from app.api.v1.search import router as search_router
from app.api.v1.settings import router as settings_router
from app.api.v1.share import router as share_router
from app.api.v1.speech import router as speech_router
from app.api.v1.system import router as system_router
from app.api.v1.usage import router as usage_router

api_v1_router = APIRouter()

# Register sub-routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(oauth_router)
api_v1_router.include_router(prompts_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(folders_router)
api_v1_router.include_router(nlp_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(attachments_router)
api_v1_router.include_router(images_router)
api_v1_router.include_router(speech_router)
api_v1_router.include_router(usage_router)
api_v1_router.include_router(settings_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(share_router)



