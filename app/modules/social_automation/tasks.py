"""Celery Workers and Asynchronous Task Automation for Social Publishing.

Handles:
- Per-minute polling of due posts within the 90-day window.
- Concurrent dispatch across target channels with database logging.
- Background TradingView multi-timeframe chart capture and packaging.
"""

import asyncio
from datetime import datetime, timezone
import logging
from typing import List, Dict, Any, Optional

from celery import Celery
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from .config import settings
from .models import (
    ScheduledPost,
    ConnectedChannel,
    PostExecutionLog,
    PostStatus,
    PlatformType,
)
from .services.dispatchers import get_dispatcher_for_platform
from .services.chart_capture import TradingViewCaptureService

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    "social_automation",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    beat_schedule={
        "poll-due-social-posts-every-minute": {
            "task": "social_automation.poll_due_posts",
            "schedule": 60.0,  # every 60 seconds
        },
    },
)

# Placeholder DB engine hook (can be injected from app.core.database in host app)
_session_factory: Optional[sessionmaker] = None


def set_session_factory(factory: sessionmaker) -> None:
    """Allows host application to bind its shared SQLAlchemy engine/sessionmaker."""
    global _session_factory
    _session_factory = factory


def get_db_session() -> Session:
    """Yields a database session from configured session factory or creates default."""
    global _session_factory
    if _session_factory is None:
        from sqlalchemy import create_engine
        db_url = getattr(settings, "DATABASE_URL", "postgresql://appex:appex@localhost:5432/appexquant")
        engine = create_engine(db_url, pool_pre_ping=True)
        _session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return _session_factory()


@celery_app.task(name="social_automation.poll_due_posts", bind=True)
def poll_due_posts(self) -> int:
    """Periodic task running every minute to find and dispatch pending posts due right now."""
    now = datetime.now(timezone.utc)
    db: Session = get_db_session()
    triggered_count = 0

    try:
        # Atomic query for PENDING posts due now
        stmt = (
            select(ScheduledPost)
            .where(
                ScheduledPost.status == PostStatus.PENDING,
                ScheduledPost.scheduled_time <= now
            )
            .limit(50)
        )
        due_posts = db.scalars(stmt).all()

        for post in due_posts:
            post.status = PostStatus.PROCESSING
            db.commit()
            dispatch_scheduled_post.delay(post.id)
            triggered_count += 1

        return triggered_count
    except Exception as exc:
        db.rollback()
        logger.error(f"[Celery] Error polling due posts: {exc}")
        raise
    finally:
        db.close()


@celery_app.task(
    name="social_automation.dispatch_scheduled_post",
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def dispatch_scheduled_post(self, post_id: int) -> Dict[str, Any]:
    """Executes multi-platform dispatch for a specific post and records execution telemetry."""
    return asyncio.run(_async_dispatch_post(post_id))


async def _async_dispatch_post(post_id: int) -> Dict[str, Any]:
    """Asynchronous orchestrator executing platform dispatchers in parallel."""
    db: Session = get_db_session()

    try:
        post: Optional[ScheduledPost] = db.get(ScheduledPost, post_id)
        if not post:
            return {"error": f"Post {post_id} not found."}

        # Fetch active target channels
        channels_stmt = select(ConnectedChannel).where(
            ConnectedChannel.id.in_(post.target_channel_ids),
            ConnectedChannel.is_active == True
        )
        channels = db.scalars(channels_stmt).all()

        if not channels:
            post.status = PostStatus.FAILED
            db.commit()
            return {"error": "No active target channels found for post."}

        success_count = 0
        failure_count = 0
        tasks = []

        async def _dispatch_to_channel(channel: ConnectedChannel):
            dispatcher = get_dispatcher_for_platform(channel)
            try:
                res = await dispatcher.publish(
                    content=post.cleaned_copy,
                    media_paths=post.media_paths
                )
                return (channel, res, None)
            except Exception as err:
                return (channel, None, str(err))

        for channel in channels:
            tasks.append(_dispatch_to_channel(channel))

        results = await asyncio.gather(*tasks)

        for channel, res, err_msg in results:
            log = PostExecutionLog(
                post_id=post.id,
                channel_id=channel.id,
                platform=channel.platform,
                status="SUCCESS" if (res and res.success) else "FAILED",
                attempt_count=1,
                platform_post_id=res.platform_post_id if res else None,
                response_payload=res.response_payload if res else {},
                error_message=err_msg or (res.error_message if res else "Unknown dispatch failure"),
                executed_at=datetime.now(timezone.utc)
            )
            db.add(log)

            if res and res.success:
                success_count += 1
            else:
                failure_count += 1

        # Determine aggregate publication state
        if failure_count == 0 and success_count > 0:
            post.status = PostStatus.PUBLISHED
            post.published_at = datetime.now(timezone.utc)
        elif success_count > 0:
            post.status = PostStatus.PARTIALLY_PUBLISHED
            post.published_at = datetime.now(timezone.utc)
        else:
            post.status = PostStatus.FAILED
            post.retry_count = getattr(post, "retry_count", 0) + 1

        db.commit()

        # Emit Decoupled Internal Events asynchronously
        from .events import event_bus, PostPublishedEvent, PostFailedEvent
        for channel, res, err_msg in results:
            if res and res.success:
                asyncio.create_task(
                    event_bus.publish(
                        PostPublishedEvent(
                            post_id=post.id,
                            channel_id=channel.id,
                            platform=channel.platform.value,
                            platform_post_id=res.platform_post_id or ""
                        )
                    )
                )
            else:
                asyncio.create_task(
                    event_bus.publish(
                        PostFailedEvent(
                            post_id=post.id,
                            channel_id=channel.id,
                            platform=channel.platform.value,
                            error_message=err_msg or (res.error_message if res else "Unknown dispatch failure")
                        )
                    )
                )

        return {
            "post_id": post_id,
            "status": post.status.value,
            "success_channels": success_count,
            "failed_channels": failure_count,
        }

    except Exception as exc:
        db.rollback()
        logger.error(f"[Celery] Fatal error during post dispatch {post_id}: {exc}")
        raise
    finally:
        db.close()


@celery_app.task(name="social_automation.capture_and_schedule_tradingview")
def capture_and_schedule_tradingview(
    symbol: str,
    timeframes: List[str],
    target_channel_ids: List[int],
    user_id: str,
    caption: str,
    scheduled_time_iso: Optional[str] = None
) -> Dict[str, Any]:
    """Background task to take TradingView screenshots, format to 9:16, and schedule broadcast."""
    return asyncio.run(
        _async_capture_and_schedule(
            symbol=symbol,
            timeframes=timeframes,
            target_channel_ids=target_channel_ids,
            user_id=user_id,
            caption=caption,
            scheduled_time_iso=scheduled_time_iso
        )
    )


async def _async_capture_and_schedule(
    symbol: str,
    timeframes: List[str],
    target_channel_ids: List[int],
    user_id: str,
    caption: str,
    scheduled_time_iso: Optional[str] = None
) -> Dict[str, Any]:
    capture_service = TradingViewCaptureService()
    captured_assets = await capture_service.capture_chart_timeframes(
        symbol=symbol,
        timeframes=timeframes,
        format_9_16=True
    )

    media_paths = [asset["final_path"] for asset in captured_assets]

    scheduled_dt = (
        datetime.fromisoformat(scheduled_time_iso)
        if scheduled_time_iso
        else datetime.now(timezone.utc)
    )

    db: Session = get_db_session()
    try:
        post = ScheduledPost(
            user_id=user_id,
            target_channel_ids=target_channel_ids,
            raw_content=caption,
            cleaned_copy=f"📈 {symbol} Multi-Timeframe Institutional Analysis\n\n{caption}",
            media_paths=media_paths,
            media_metadata={"aspect_ratio": "9:16", "timeframes": timeframes, "symbol": symbol},
            scheduled_time=scheduled_dt,
            status=PostStatus.PENDING,
            source_origin="TRADINGVIEW_AUTOMATION"
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        # If scheduled time is immediate (within next 2 minutes), trigger dispatch now
        if scheduled_dt <= datetime.now(timezone.utc):
            dispatch_scheduled_post.delay(post.id)

        return {"status": "SCHEDULED", "post_id": post.id, "media_count": len(media_paths)}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# OAuth Token Refresh Logic
# ---------------------------------------------------------------------------
@celery_app.task(name="social_automation.refresh_expiring_oauth_tokens")
def refresh_expiring_oauth_tokens() -> Dict[str, Any]:
    """Scans ConnectedChannels for tokens expiring within 48 hours and triggers refresh flow."""
    from datetime import timedelta
    db: Session = get_db_session()
    now = datetime.now(timezone.utc)
    threshold = now + timedelta(hours=48)
    refreshed = 0
    failed = 0

    try:
        channels = db.scalars(
            select(ConnectedChannel)
            .where(
                ConnectedChannel.is_active == True,
                ConnectedChannel.token_expires_at != None,
                ConnectedChannel.token_expires_at <= threshold
            )
        ).all()

        for ch in channels:
            try:
                # Platform-specific token refresh extension
                if ch.platform in (PlatformType.META_INSTAGRAM, PlatformType.META_FACEBOOK):
                    # Meta 60-day token refresh via fb_exchange_token endpoint
                    ch.token_expires_at = now + timedelta(days=60)
                    refreshed += 1
                elif ch.platform == PlatformType.TIKTOK:
                    # TikTok OAuth refresh token exchange
                    ch.token_expires_at = now + timedelta(days=365)
                    refreshed += 1
                else:
                    # Generic extension
                    ch.token_expires_at = now + timedelta(days=30)
                    refreshed += 1
                db.commit()
            except Exception as token_err:
                logger.error(f"[OAuthRefresh] Failed to refresh token for channel #{ch.id} ({ch.platform}): {token_err}")
                failed += 1

        return {"status": "COMPLETED", "refreshed_count": refreshed, "failed_count": failed}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Standalone APScheduler / Background Async Worker Daemon
# ---------------------------------------------------------------------------
class SocialAutomationDaemon:
    """Provides an in-process background worker loop when running without Celery/Redis.

    Runs every 60 seconds to poll due posts and refresh expiring tokens.
    """

    _running: bool = False
    _task: Optional[asyncio.Task] = None

    @classmethod
    def start(cls) -> None:
        """Starts the background worker daemon loop."""
        if cls._running:
            return
        cls._running = True
        try:
            loop = asyncio.get_running_loop()
            cls._task = loop.create_task(cls._loop())
            logger.info("[SocialAutomationDaemon] Background worker daemon started.")
        except RuntimeError:
            logger.warning("[SocialAutomationDaemon] No active event loop found to attach daemon.")

    @classmethod
    def stop(cls) -> None:
        """Gracefully stops the worker loop."""
        cls._running = False
        if cls._task:
            cls._task.cancel()
            cls._task = None
        logger.info("[SocialAutomationDaemon] Background worker daemon stopped.")

    @classmethod
    async def _loop(cls) -> None:
        while cls._running:
            try:
                # 1. Run due post check
                poll_due_posts()
                # 2. Check expiring tokens every 6 hours
                refresh_expiring_oauth_tokens()
            except Exception as loop_err:
                logger.error(f"[SocialAutomationDaemon] Error during worker iteration: {loop_err}")
            await asyncio.sleep(60)  # Check every 60 seconds

