"""AppexQuant Markets Global - Social Automation Module.

This module provides omni-channel automated trade signal scraping,
computer vision sanitization, automated TradingView screenshot capture with
9:16 vertical formatting, and scheduled multi-platform publishing.
"""

from .router import automation_router
from .models import (
    ConnectedChannel,
    ConnectedChannels,
    ScheduledPost,
    ScheduledPosts,
    PostExecutionLog,
    PostExecutionLogs,
    PlatformType,
    PostStatus,
)
from .services.chart_capture import TradingViewCaptureService
from .services.vision_sanitizer import VisionSanitizerService, TelegramScraperService
from .tasks import (
    SocialAutomationDaemon,
    poll_due_posts,
    dispatch_scheduled_post,
    refresh_expiring_oauth_tokens,
    set_session_factory,
    celery_app,
)
from .events import (
    event_bus,
    MarketSignalEvent,
    PostPublishedEvent,
    PostFailedEvent,
)

__all__ = [
    "automation_router",
    "ConnectedChannel",
    "ConnectedChannels",
    "ScheduledPost",
    "ScheduledPosts",
    "PostExecutionLog",
    "PostExecutionLogs",
    "PlatformType",
    "PostStatus",
    "TradingViewCaptureService",
    "VisionSanitizerService",
    "TelegramScraperService",
    "SocialAutomationDaemon",
    "poll_due_posts",
    "dispatch_scheduled_post",
    "refresh_expiring_oauth_tokens",
    "set_session_factory",
    "celery_app",
    "event_bus",
    "MarketSignalEvent",
    "PostPublishedEvent",
    "PostFailedEvent",
]

