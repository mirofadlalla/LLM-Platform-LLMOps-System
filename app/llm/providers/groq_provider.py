# app/llm/providers/groq_provider.py
"""
Groq Provider — wraps the official `groq` Python SDK.

Supported models (configured in registry.py):
  gpt-oss-20b   → openai/gpt-oss-20b
  gpt-oss-120b  → openai/gpt-oss-120b
  qwen3-27b     → qwen/qwen3-27b
  reasoning     → openai/gpt-oss-20b  +  reasoning_effort="medium"

The `reasoning` variant is handled automatically via ModelInfo.extra_params —
no special-casing inside this class.
"""

from __future__ import annotations

import logging
import threading

from app.llm.base import BaseLLMProvider, LLMResponse, ModelInfo
from app.llm.http_clients import (
    SYNC_HTTP_TIMEOUT,
    close_sync_httpx_client,
    get_sync_httpx_client,
)

logger = logging.getLogger(__name__)


class GroqProvider(BaseLLMProvider):
    """
    Strategy implementation for the Groq Cloud API.

    The Groq SDK client and its underlying httpx pool are initialised once per
    process (thread-safe) and reused for every generate() call.
    """

    _sdk_client = None
    _client_lock = threading.Lock()

    @classmethod
    def _build_sdk_client(cls):
        from groq import Groq

        from app.core.config import settings

        try:
            return Groq(
                api_key=settings.groq_api_key,
                http_client=get_sync_httpx_client(),
                timeout=SYNC_HTTP_TIMEOUT,
                max_retries=2,
            )
        except Exception as exc:
            logger.error("Failed to initialise Groq client: %s", exc)
            raise

    @classmethod
    def get_sdk_client(cls):
        if cls._sdk_client is None:
            with cls._client_lock:
                if cls._sdk_client is None:
                    cls._sdk_client = cls._build_sdk_client()
                    logger.info("Groq client initialised (shared httpx pool)")
        return cls._sdk_client

    @classmethod
    def reset_sdk_client(cls) -> None:
        """Drop cached SDK + httpx pool after connection failures."""
        with cls._client_lock:
            if cls._sdk_client is not None:
                try:
                    cls._sdk_client.close()
                except Exception:
                    logger.debug("Error closing Groq SDK client", exc_info=True)
                cls._sdk_client = None
            close_sync_httpx_client()

    def generate(
        self,
        prompt: str,
        model: ModelInfo,
        system_prompt: str = "",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        from groq import APIConnectionError

        from app.core.config import settings

        effective_temp = (
            temperature if temperature is not None else settings.llm_default_temperature
        )
        effective_max_tokens = (
            max_tokens if max_tokens is not None else settings.llm_max_new_tokens
        )

        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        api_kwargs: dict = {
            "model": model.api_id,
            "messages": messages,
            "temperature": effective_temp,
            "max_completion_tokens": effective_max_tokens,
            "stream": False,
        }
        api_kwargs.update(model.extra_params)

        logger.debug(
            f"Groq request: api_id={model.api_id!r} "
            f"extra={model.extra_params or '{}'}"
        )

        completion = self._create_completion(api_kwargs, APIConnectionError)

        text: str = completion.choices[0].message.content or ""

        if completion.usage:
            input_tokens = completion.usage.prompt_tokens
            output_tokens = completion.usage.completion_tokens
        else:
            input_tokens = len(prompt.split())
            output_tokens = len(text.split())

        logger.info(
            f"Groq OK: model={model.api_id!r} "
            f"in={input_tokens} out={output_tokens}"
        )
        return LLMResponse(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )

    def _create_completion(self, api_kwargs: dict, connection_error_type: type):
        try:
            return self.get_sdk_client().chat.completions.create(**api_kwargs)
        except connection_error_type as exc:
            logger.warning(
                "Groq connection error (%s), resetting HTTP pool and retrying once",
                exc,
            )
            self.reset_sdk_client()
            return self.get_sdk_client().chat.completions.create(**api_kwargs)
