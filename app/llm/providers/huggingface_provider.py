# app/llm/providers/huggingface_provider.py
"""
HuggingFace Provider — wraps the `huggingface_hub.InferenceClient`.

Supported models (configured in registry.py):
  qwen-2.5-1.5b → Qwen/Qwen2.5-1.5B-Instruct
"""

import logging
import threading

from app.llm.base import BaseLLMProvider, LLMResponse, ModelInfo

logger = logging.getLogger(__name__)

_HF_REQUEST_TIMEOUT_S = 60.0


class HuggingFaceProvider(BaseLLMProvider):
    """
    Strategy implementation for the HuggingFace Inference API.

    The InferenceClient is lazily initialised once per process (thread-safe).
    """

    _client = None
    _client_lock = threading.Lock()

    @classmethod
    def get_inference_client(cls):
        if cls._client is None:
            with cls._client_lock:
                if cls._client is None:
                    from huggingface_hub import InferenceClient

                    from app.core.config import settings

                    cls._client = InferenceClient(
                        api_key=settings.huggingface_api_key,
                        timeout=_HF_REQUEST_TIMEOUT_S,
                    )
                    logger.info("HuggingFace InferenceClient initialised")
        return cls._client

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

        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # HF InferenceClient uses max_tokens (not max_completion_tokens)
        api_kwargs: dict = {
            "model": model.api_id,
            "messages": messages,
            "max_tokens": effective_max_tokens,
            "temperature": effective_temp,
        }

        # Merge any model-specific extra params
        api_kwargs.update(model.extra_params)

        logger.debug(f"HuggingFace request: api_id={model.api_id!r}")

        completion = self.get_inference_client().chat.completions.create(**api_kwargs)

        text: str = completion.choices[0].message.content or ""

        # HF InferenceClient doesn't always return usage counts — fall back
        input_tokens = len(prompt.split())
        output_tokens = len(text.split())

        logger.info(
            f"HuggingFace OK: model={model.api_id!r} "
            f"in={input_tokens} out={output_tokens}"
        )
        return LLMResponse(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
