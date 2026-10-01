"""
Shared synchronous HTTP clients for LLM provider SDKs.

Celery workers and API threads reuse one httpx.Client per process so outbound
connections are pooled instead of opening a new socket per request (which can
lead to ephemeral port exhaustion under load).
"""

from __future__ import annotations

import logging
import threading

import httpx

logger = logging.getLogger(__name__)

# Tuned for worker concurrency + parallel call_llm (e.g. AB tests); Groq SDK defaults match.
SYNC_HTTP_LIMITS = httpx.Limits(max_keepalive_connections=20, max_connections=100)
SYNC_HTTP_TIMEOUT = httpx.Timeout(60.0, connect=10.0)

_lock = threading.Lock()
_sync_client: httpx.Client | None = None


def get_sync_httpx_client() -> httpx.Client:
    """Return a process-wide sync httpx client (lazy, thread-safe)."""
    global _sync_client
    if _sync_client is None or _sync_client.is_closed:
        with _lock:
            if _sync_client is None or _sync_client.is_closed:
                _sync_client = httpx.Client(
                    limits=SYNC_HTTP_LIMITS,
                    timeout=SYNC_HTTP_TIMEOUT,
                    follow_redirects=True,
                )
                logger.debug("Shared sync httpx client created")
    return _sync_client


def close_sync_httpx_client() -> None:
    """Close and drop the shared client so the next call builds a fresh pool."""
    global _sync_client
    with _lock:
        if _sync_client is None:
            return
        try:
            if not _sync_client.is_closed:
                _sync_client.close()
        except Exception:
            logger.debug("Error closing shared httpx client", exc_info=True)
        finally:
            _sync_client = None
