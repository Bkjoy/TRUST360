import os
from pathlib import Path
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "TRUST"
    PROJECT_FULL_NAME: str = "Transparent Repository for Unified Security-deposit Tracking"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aicte_sih2026_super_secret_jwt_key_deposit360_production_ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # Database configuration (Defaults to SQLite for local development or PostgreSQL if specified)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{Path(__file__).resolve().parent.parent.parent}/deposit360.db"
    )
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Document Vault Storage Directory
    STORAGE_DIR: str = os.getenv(
        "STORAGE_DIR",
        str(Path(__file__).resolve().parent.parent.parent / "storage" / "vault")
    )
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".png", ".jpg", ".jpeg"]

    # Bank Verification Sandbox
    ENABLE_BANK_SANDBOX: bool = True
    SIMULATED_BANK_LATENCY_MS: int = 250

    # Maturity Alert Thresholds (Days)
    MATURITY_ALERT_THRESHOLDS: List[int] = [90, 60, 30, 7, 0]

    # Email / Alert Dispatch Configuration
    ALERT_NOTIFICATION_EMAIL: str = os.getenv("ALERT_NOTIFICATION_EMAIL", "trust360toucan@gmail.com")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER", "auditteamtoucan@gmail.com")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", "Deepan3108")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "auditteamtoucan@gmail.com")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "true").lower() in ("true", "1", "yes")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
