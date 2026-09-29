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

import logging

from app.llm.base import BaseLLMProvider, LLMResponse, ModelInfo

logger = logging.getLogger(__name__)


class GroqProvider(BaseLLMProvider):
    """
    Strategy implementation for the Groq Cloud API.

    The Groq client is lazily initialised on the first generate() call so that
    importing this module never triggers network I/O or fails on missing config.
    """

    _client = None  # shared across all instances (class-level cache)

    @property
    def client(self):
        if self._client is None:
            # Lazy import — keep startup fast even if `groq` is not installed
            from groq import Groq

            from app.core.config import settings

            self._client = Groq(api_key=settings.groq_api_key)
            logger.info("Groq client initialised")
        return self._client

    def generate(
        self,
        prompt: str,
        model: ModelInfo,
        system_prompt: str = "",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        from app.core.config import settings

        effective_temp = (
            temperature if temperature is not None else settings.llm_default_temperature
        )
        effective_max_tokens = (
            max_tokens if max_tokens is not None else settings.llm_max_new_tokens
        )

        # Build the message list
        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Base API kwargs
        api_kwargs: dict = {
            "model": model.api_id,
            "messages": messages,
            "temperature": effective_temp,
            "max_completion_tokens": effective_max_tokens,  # Groq uses this, not max_tokens
            "stream": False,
        }

        # Merge model-level extra params last so they can override base kwargs.
        # This is how reasoning_effort, top_p, etc. are injected per-model
        # without any if/elif logic inside this class.
        api_kwargs.update(model.extra_params)

        logger.debug(
            f"Groq request: api_id={model.api_id!r} "
            f"extra={model.extra_params or '{}'}"
        )

        completion = self.client.chat.completions.create(**api_kwargs)

        text: str = completion.choices[0].message.content or ""

        # Prefer the actual token counts returned by the API
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
