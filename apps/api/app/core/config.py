import os
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict



def _parse_list_or_str(v: Union[str, List[str]], default_if_empty: Optional[List[str]] = None) -> List[str]:
    """Parse environment string (single URL, comma-separated, or JSON list) into List[str]."""
    if isinstance(v, str):
        v_str = v.strip()
        if not v_str:
            return default_if_empty if default_if_empty is not None else []
        if v_str.startswith("[") and v_str.endswith("]"):
            import json
            try:
                parsed = json.loads(v_str)
                if isinstance(parsed, list):
                    return [str(item).strip().rstrip("/") for item in parsed if str(item).strip()]
            except Exception:
                pass
        return [i.strip().rstrip("/") for i in v_str.split(",") if i.strip()]
    elif isinstance(v, list):
        return [str(i).strip().rstrip("/") for i in v if str(i).strip()]
    return [item.rstrip("/") for item in default_if_empty] if default_if_empty is not None else []


class Settings(BaseSettings):
    """NexaAI typed application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # General
    APP_NAME: str = "NexaAI API"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Server Bindings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"

    # Security & Authentication (Phase 5)
    SECRET_KEY: str = "dev_secret_key_change_in_production_min_32_chars_long"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_COOKIE_NAME: str = "nexaai_refresh_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Optional[str] = None

    # OAuth Settings (Task 2)
    AUTH_FRONTEND_URL: str = Field(
        default="https://nexaai-frontend-1yi2.onrender.com" if (os.getenv("APP_ENV") == "production" or os.getenv("RENDER")) else "http://localhost:3000",
        description="Frontend URL for OAuth redirects",
    )
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_REDIRECT_URI: Optional[str] = None

    @field_validator(
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
        "AUTH_FRONTEND_URL",
        "GITHUB_CLIENT_ID",
        "GITHUB_CLIENT_SECRET",
        "GITHUB_REDIRECT_URI",
        mode="before",
    )
    @classmethod
    def sanitize_oauth_strings(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            cleaned = v.strip().strip("'\"").strip()
            return cleaned if cleaned else None
        return v


    # Chat Modes (Task 4)
    CHAT_MODE_LOW_MODEL: str = "gemini-3.6-flash"
    CHAT_MODE_STANDARD_MODEL: str = "gemini-3.6-flash"
    CHAT_MODE_HIGH_MODEL: str = "gemini-3.6-flash"
    CHAT_MODE_HIGH_DAILY_LIMIT: int = 5

    # CORS (accepts JSON array string, comma-separated URLs, or plain URL string)
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://nexaai-frontend-1yi2.onrender.com",
    ]

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        return _parse_list_or_str(v, ["http://localhost:3000", "http://127.0.0.1:3000", "https://nexaai-frontend-1yi2.onrender.com"])

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./nexaai.db",
        description="Async database connection string. Defaults to local SQLite for seamless zero-config development, or postgresql+asyncpg:// for production.",
    )

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("postgres://"):
                return "postgresql+asyncpg://" + v_str[len("postgres://"):]
            if v_str.startswith("postgresql://") and not v_str.startswith("postgresql+asyncpg://"):
                return "postgresql+asyncpg://" + v_str[len("postgresql://"):]
            return v_str
        return v

    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Integration (Gemini Primary / OpenAI Optional Fallback)
    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    GEMINI_MODEL: str = "gemini-3.6-flash"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    AI_REQUEST_TIMEOUT: float = 30.0
    ENABLE_MOCK_AI_FALLBACK: bool = True

    # Logging
    LOG_LEVEL: str = "INFO"

    # ── Phase 10: Multimodal File Upload & Storage ──────────────────────────

    # Storage provider: "local" only for now; extend to "s3" in Phase 18
    STORAGE_PROVIDER: str = "local"
    UPLOAD_DIR: str = Field(
        default="/tmp/uploads" if (os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME")) else "uploads",
        description="Local storage directory for uploads. Defaults to /tmp/uploads in serverless environments, or 'uploads' locally. Overridable via UPLOAD_DIR environment variable.",
    )

    # Global size limits (MB)
    MAX_UPLOAD_SIZE_MB: int = 25
    MAX_IMAGE_SIZE_MB: int = 10
    MAX_DOCUMENT_SIZE_MB: int = 25
    MAX_AUDIO_DURATION_SECONDS: int = 600  # placeholder for Phase 13

    # MIME allowlists (comma-separated string or list in env)
    ALLOWED_IMAGE_MIMETYPES: Union[str, List[str]] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    ]
    ALLOWED_DOCUMENT_MIMETYPES: Union[str, List[str]] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
    ]
    ALLOWED_AUDIO_MIMETYPES: Union[str, List[str]] = [
        "audio/webm",
        "audio/mpeg",
        "audio/wav",
        "audio/mp4",
        "audio/x-m4a",
        "audio/ogg",
    ]

    @field_validator(
        "ALLOWED_IMAGE_MIMETYPES",
        "ALLOWED_DOCUMENT_MIMETYPES",
        "ALLOWED_AUDIO_MIMETYPES",
        mode="after",
    )
    @classmethod
    def assemble_mime_types(cls, v: Union[str, List[str]]) -> List[str]:
        return _parse_list_or_str(v)

    # Feature flags
    ENABLE_IMAGE_FEATURES: bool = True
    ENABLE_VOICE_FEATURES: bool = True

    # ── Phase 11 & 12: Image Intelligence & Production Providers ────────────
    MAX_IMAGE_WIDTH: int = 4096
    MAX_IMAGE_HEIGHT: int = 4096
    OCR_PROVIDER: str = "mock"  # "tesseract" | "mock"
    VISION_PROVIDER: str = "gemini"  # "gemini" | "openai" | "mock"
    OCR_DEFAULT_LANGUAGE: str = "eng"
    VISION_MODEL: str = "gemini-3.6-flash"
    VISION_TIMEOUT_SECONDS: float = 30.0
    VISION_MAX_IMAGE_BYTES: int = 10_485_760  # 10 MB
    VISION_MAX_PROMPT_LENGTH: int = 2000
    VISION_MAX_OUTPUT_TOKENS: int = 1000
    VISION_MAX_REQUESTS_PER_MINUTE: int = 60

    # ── Document Intelligence & Embeddings ─────────────────────────────────
    EMBEDDING_PROVIDER: str = "mock"  # "mock" | "gemini" | "openai"
    EMBEDDING_MODEL: str = "gemini-embedding-001"

    # ── Phase 13: Speech Intelligence & Speech-to-Text ─────────────────────
    AUDIO_MAX_FILE_SIZE_MB: int = 25
    AUDIO_MAX_DURATION_SECONDS: int = 300  # 5 minutes
    AUDIO_MAX_PROMPT_LENGTH: int = 1000
    STT_PROVIDER: str = "openai"  # "openai" | "mock"
    STT_MODEL: str = "whisper-1"
    STT_TIMEOUT_SECONDS: float = 30.0
    STT_MAX_REQUESTS_PER_MINUTE: int = 60


settings = Settings()
