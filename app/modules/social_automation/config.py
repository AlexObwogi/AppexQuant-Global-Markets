"""Configuration settings for the Social Automation Module."""

import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class SocialAutomationSettings(BaseSettings):
    """Environment configuration for social media scrapers, engines, and dispatchers."""

    # Storage paths
    MEDIA_STORAGE_DIR: str = Field(
        default=os.getenv("MEDIA_STORAGE_DIR", "/tmp/appexquant/media"),
        description="Local or mounted volume path for chart screenshots and media assets"
    )
    BRAND_ASSETS_DIR: str = Field(
        default=os.getenv("BRAND_ASSETS_DIR", "/app/assets/branding"),
        description="Directory housing AppexQuant watermark logos and 9:16 background frames"
    )

    # Telethon Telegram Scraper
    TELEGRAM_API_ID: Optional[int] = Field(
        default=int(os.getenv("TELEGRAM_API_ID", "0")) if os.getenv("TELEGRAM_API_ID") else None,
        description="Telegram application API ID from my.telegram.org"
    )
    TELEGRAM_API_HASH: Optional[str] = Field(
        default=os.getenv("TELEGRAM_API_HASH", ""),
        description="Telegram application API Hash from my.telegram.org"
    )
    TELEGRAM_SESSION_STRING: Optional[str] = Field(
        default=os.getenv("TELEGRAM_SESSION_STRING", ""),
        description="Telethon StringSession authorization string for the userbot"
    )
    TELEGRAM_SOURCE_CHANNELS: str = Field(
        default=os.getenv("TELEGRAM_SOURCE_CHANNELS", ""),
        description="Comma-delimited source channel usernames or IDs to monitor"
    )

    # TradingView Playwright Captures
    TRADINGVIEW_USERNAME: Optional[str] = Field(default=os.getenv("TRADINGVIEW_USERNAME", ""))
    TRADINGVIEW_PASSWORD: Optional[str] = Field(default=os.getenv("TRADINGVIEW_PASSWORD", ""))
    PLAYWRIGHT_HEADLESS: bool = Field(default=True)

    # Token Encryption Key (Fernet 32-byte urlsafe base64 string)
    CREDENTIALS_ENCRYPTION_KEY: str = Field(
        default=os.getenv("CREDENTIALS_ENCRYPTION_KEY", "bGFyZ2Utc2VjcmV0LWtleS1mb3ItYXBwZXhxdWFudC1zb2NpYWw="),
        description="Symmetric encryption key used to protect stored OAuth tokens and webhook URLs"
    )

    # Celery Redis / RabbitMQ Broker
    CELERY_BROKER_URL: str = Field(default=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"))
    CELERY_RESULT_BACKEND: str = Field(default=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"))

    class Config:
        env_prefix = "SOCIAL_"
        case_sensitive = True
        extra = "ignore"


settings = SocialAutomationSettings()
