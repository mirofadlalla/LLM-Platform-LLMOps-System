import time
from fastapi import HTTPException, status
import redis

try:
    redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
except (redis.ConnectionError, redis.TimeoutError):
    redis_client = None

RATE_LIMIT = 60   # requests
WINDOW = 60       # seconds

def rate_limit(api_key: str):
    # Skip rate limiting if Redis is not available
    if redis_client is None:
        return
    
    try:
        now = int(time.time())
        key = f"rate:{api_key}:{now // WINDOW}" # key per window this means every minute new key for each api key the same api key will have different keys every minute

        # Increment the count for this key
        current = redis_client.incr(key)

        
        # Set expiration time for the key if it's newly created
        if current == 1:
            redis_client.expire(key, WINDOW)

        # Check if the current count exceeds the rate limit
        if current > RATE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
    except (redis.ConnectionError, redis.TimeoutError):
        # Gracefully skip rate limiting if Redis connection fails
        pass
