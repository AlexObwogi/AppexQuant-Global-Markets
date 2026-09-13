"""
AppexQuant Markets Global - Sliding Window Rate Limiter
Enforces rate-limiting per API key with accurate X-RateLimit headers and 429 exceptions.
"""

import time
from typing import Dict, List, Tuple
from fastapi import HTTPException, status, Request
from .models import ApiKeyRecord


class SlidingWindowRateLimiter:
    """
    In-memory sliding window rate limiter simulating Redis sorted set ZREMRANGEBYSCORE/ZADD.
    """
    def __init__(self):
        # Maps key_id -> list of timestamps (seconds)
        self._requests: Dict[str, List[float]] = {}

    def check_rate_limit(self, key_record: ApiKeyRecord, window_seconds: int = 60) -> Tuple[bool, int, int]:
        """
        Returns (is_allowed, remaining_requests, reset_seconds)
        """
        now = time.time()
        key_id = key_record.id
        limit = key_record.rate_limit_per_minute

        if key_id not in self._requests:
            self._requests[key_id] = []

        # Evict timestamps older than window
        cutoff = now - window_seconds
        self._requests[key_id] = [ts for ts in self._requests[key_id] if ts > cutoff]

        current_count = len(self._requests[key_id])
        if current_count >= limit:
            oldest_timestamp = self._requests[key_id][0] if self._requests[key_id] else now
            reset_seconds = max(1, int(oldest_timestamp + window_seconds - now))
            return False, 0, reset_seconds

        # Record this request
        self._requests[key_id].append(now)
        remaining = max(0, limit - current_count - 1)
        reset_seconds = window_seconds
        return True, remaining, reset_seconds


rate_limiter = SlidingWindowRateLimiter()
