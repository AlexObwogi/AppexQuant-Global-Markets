"""Decoupled Internal Event Hooks and Signal Listeners.

Enables the social automation module to interface with core AppexQuant
trading algorithms, risk engines, and notification buses without direct
circular dependencies or tight coupling.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Coroutine, Dict, List, Any, Type
import logging

logger = logging.getLogger(__name__)


@dataclass
class SocialAutomationEvent:
    """Base event payload for internal event bus."""
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MarketSignalEvent(SocialAutomationEvent):
    """Fired by core trading strategies when an institutional trade setup is detected."""
    symbol: str = ""
    signal_type: str = "BUY"  # BUY, SELL, ALERT, CLOSE
    timeframe: str = "1h"
    entry_price: float = 0.0
    stop_loss: float = 0.0
    take_profit: float = 0.0
    rationale: str = ""
    target_channel_ids: List[int] = field(default_factory=list)


@dataclass
class PostPublishedEvent(SocialAutomationEvent):
    """Fired whenever a post has successfully published to a platform."""
    post_id: int = 0
    channel_id: int = 0
    platform: str = ""
    platform_post_id: str = ""


@dataclass
class PostFailedEvent(SocialAutomationEvent):
    """Fired when all retries are exhausted for a scheduled post."""
    post_id: int = 0
    channel_id: int = 0
    platform: str = ""
    error_message: str = ""


# ---------------------------------------------------------------------------
# Asynchronous In-Memory Event Bus Hook
# ---------------------------------------------------------------------------
EventHandler = Callable[[Any], Coroutine[Any, Any, None]]


class SocialEventBus:
    """Thread-safe, non-blocking asynchronous event bus for inter-module communication."""

    def __init__(self):
        self._subscribers: Dict[Type[SocialAutomationEvent], List[EventHandler]] = {}

    def subscribe(self, event_type: Type[SocialAutomationEvent], handler: EventHandler) -> None:
        """Register an asynchronous callback hook for an event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        logger.info(f"[SocialEventBus] Registered subscriber for {event_type.__name__}: {handler.__name__}")

    async def publish(self, event: SocialAutomationEvent) -> None:
        """Publishes an event to all registered listeners without raising unhandled exceptions."""
        event_type = type(event)
        handlers = self._subscribers.get(event_type, [])
        if not handlers:
            return

        tasks = []
        for handler in handlers:
            tasks.append(self._safe_execute(handler, event))
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _safe_execute(self, handler: EventHandler, event: SocialAutomationEvent) -> None:
        try:
            await handler(event)
        except Exception as exc:
            logger.error(f"[SocialEventBus] Error in handler {handler.__name__} for {type(event).__name__}: {exc}", exc_info=True)


# Global singleton instance
event_bus = SocialEventBus()
