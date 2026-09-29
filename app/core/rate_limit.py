# app/core/rate_limit.py
import time

import redis
from fastapi import HTTPException, status

from app.core.config import settings

try:
    redis_client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        decode_responses=True,
        socket_connect_timeout=settings.redis_connect_timeout,
    )
    redis_client.ping()
except (redis.ConnectionError, redis.TimeoutError):
    redis_client = None


def rate_limit(api_key) -> None:
    """
    Sliding-window rate limiter backed by Redis.

    Gracefully no-ops when Redis is unavailable.
    Limits are controlled by settings.rate_limit_requests and
    settings.rate_limit_window.
    """
    if redis_client is None:
        return

    # Use the raw key string so the Redis key is stable regardless of
    # whether api_key is an APIKey ORM object or a plain string.
    key_str = api_key.key if hasattr(api_key, "key") else str(api_key)

    try:
        now = int(time.time())
        window_key = f"rate:{key_str}:{now // settings.rate_limit_window}"

        current = redis_client.incr(window_key)

        if current == 1:
            redis_client.expire(window_key, settings.rate_limit_window)

        if current > settings.rate_limit_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
            )

    except (redis.ConnectionError, redis.TimeoutError):
        # Gracefully skip rate limiting if Redis connection fails mid-request
        pass
