# app/core/llm_singleton.py
"""
LLM Singleton — wraps the HuggingFace InferenceClient.

Configuration is consumed from the centralised Settings object.
The hardcoded absolute .env path and os.getenv() calls have been removed;
the HF API key is now read exclusively through settings.huggingface_api_key,
which pydantic-settings resolves from the .env file or environment variables.
"""

import logging

from huggingface_hub import InferenceClient

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    _instance = None

    def __new__(cls) -> "LLMService":
        if cls._instance is None:
            logger.info("Initializing HuggingFace InferenceClient (first call)...")
            cls._instance = super().__new__(cls)

            cls._instance.client = InferenceClient(
                api_key=settings.huggingface_api_key,
            )
            cls._instance.model = settings.llm_model_name

        return cls._instance

    def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_new_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str:
        """
        Generate a completion via the HuggingFace Inference API.

        Args:
            prompt:         User message content.
            system_prompt:  Optional system message.
            max_new_tokens: Override the default from settings if provided.
            temperature:    Override the default from settings if provided.

        Returns:
            The model's text response.
        """
        effective_max_tokens = (
            max_new_tokens if max_new_tokens is not None else settings.llm_max_new_tokens
        )
        effective_temperature = (
            temperature if temperature is not None else settings.llm_default_temperature
        )

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            max_tokens=effective_max_tokens,
            temperature=effective_temperature,
        )

        return completion.choices[0].message.content
