from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # Security
    SECRET_KEY: str
    SESSION_COOKIE_NAME: str = "kakepple_session"
    SESSION_MAX_AGE: int = 86400 * 7  # 7 days
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 24

    # JWT Settings
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    # LINE OAuth (optional)
    LINE_CHANNEL_ID: Optional[str] = None
    LINE_CHANNEL_SECRET: Optional[str] = None
    LINE_REDIRECT_URI: Optional[str] = None

    # CORS
    FRONTEND_URL: str

    # Web Push Notifications (optional for development)
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_PUBLIC_KEY: Optional[str] = None
    ADMIN_EMAIL: Optional[str] = "admin@kakepple.com"

    # Application
    APP_NAME: str = "Kakepple"
    DEBUG: bool = False  # Must explicitly set to True for development

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
