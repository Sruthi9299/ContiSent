# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Container Security Automation Platform"
    
    # Database Settings
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./container_security.db"
    
    # Auth settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2 hours
    
    # CORS settings
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Security
    VERIFY_SSL_CERTS: bool = True
    INTERNAL_IP_RANGES: list = ["127.0.0.1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
    
    # Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "noreply@contisent.app")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.SECRET_KEY:
            raise ValueError(
                "SECRET_KEY environment variable is required. "
                "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )

settings = Settings()
