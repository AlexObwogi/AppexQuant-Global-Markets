"""Services sub-package for Social Automation."""

from .chart_capture import TradingViewCaptureService
from .vision_sanitizer import VisionSanitizerService
from .dispatchers import (
    TelegramDispatcher,
    DiscordDispatcher,
    MetaDispatcher,
    TikTokDispatcher,
    SnapchatDispatcher,
    WhatsAppDispatcher,
    get_dispatcher_for_platform,
)

__all__ = [
    "TradingViewCaptureService",
    "VisionSanitizerService",
    "TelegramDispatcher",
    "DiscordDispatcher",
    "MetaDispatcher",
    "TikTokDispatcher",
    "SnapchatDispatcher",
    "WhatsAppDispatcher",
    "get_dispatcher_for_platform",
]
