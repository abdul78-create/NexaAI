"""Application settings and configuration management via Pydantic."""

from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(f"Invalid CORS origins format: {v}")

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./nexaai.db",
        description="Async database connection string. Defaults to local SQLite for seamless zero-config development, or postgresql+asyncpg:// for production.",
    )
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Integration (Phase 6)
    AI_PROVIDER: str = "openai"
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
    UPLOAD_DIR: str = "uploads"

    # Global size limits (MB)
    MAX_UPLOAD_SIZE_MB: int = 25
    MAX_IMAGE_SIZE_MB: int = 10
    MAX_DOCUMENT_SIZE_MB: int = 25
    MAX_AUDIO_DURATION_SECONDS: int = 600  # placeholder for Phase 13

    # MIME allowlists (comma-separated string or list in env)
    ALLOWED_IMAGE_MIMETYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    ]
    ALLOWED_DOCUMENT_MIMETYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
    ]
    ALLOWED_AUDIO_MIMETYPES: List[str] = [
        "audio/webm",
        "audio/mpeg",
        "audio/wav",
        "audio/mp4",
        "audio/x-m4a",
    ]

    # Feature flags
    ENABLE_IMAGE_FEATURES: bool = True
    ENABLE_VOICE_FEATURES: bool = False  # enabled in Phase 13


settings = Settings()
