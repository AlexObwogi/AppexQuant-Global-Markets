"""Worker module alias directly exporting Celery tasks and APScheduler background daemon."""

from .tasks import (
    celery_app,
    poll_due_posts,
    dispatch_scheduled_post,
    capture_and_schedule_tradingview,
    refresh_expiring_oauth_tokens,
    SocialAutomationDaemon,
    set_session_factory,
    get_db_session,
)

__all__ = [
    "celery_app",
    "poll_due_posts",
    "dispatch_scheduled_post",
    "capture_and_schedule_tradingview",
    "refresh_expiring_oauth_tokens",
    "SocialAutomationDaemon",
    "set_session_factory",
    "get_db_session",
]
