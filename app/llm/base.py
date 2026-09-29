# app/llm/base.py
"""
LLM Strategy Interface.

Every provider must implement BaseLLMProvider.
ModelInfo and LLMResponse are the shared data contracts across all providers.

Adding a new provider:
  1. Create app/llm/providers/myprovider.py   → subclass BaseLLMProvider
  2. Add entry to PROVIDER_CATALOG in registry.py
  3. Add entry to _PROVIDER_CLASS_MAP in registry.py
  → Done. No other file changes needed.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ModelInfo:
    """
    Describes one model within a provider's catalog.

    slug        — registry key used in the API and UI  (e.g. "gpt-oss-20b")
    api_id      — exact string sent to the provider SDK (e.g. "openai/gpt-oss-20b")
    display_name— human-readable label rendered in the UI (e.g. "GPT OSS 20B")
    extra_params— provider-specific kwargs merged into every API call for this model
                  (e.g. {"reasoning_effort": "medium"} for a reasoning variant)
    """

    slug: str
    api_id: str
    display_name: str
    extra_params: dict = field(default_factory=dict)


@dataclass
class LLMResponse:
    """
    Normalised response returned by every provider.

    Business logic only ever sees this type — never provider-specific objects.
    """

    text: str
    input_tokens: int
    output_tokens: int


class BaseLLMProvider(ABC):
    """
    Strategy interface for all LLM providers.

    Concrete implementations live in app/llm/providers/.
    The rest of the application only imports this ABC and LLMResponse/ModelInfo.
    """

    @abstractmethod
    def generate(
        self,
        prompt: str,
        model: ModelInfo,
        system_prompt: str = "",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """
        Generate a completion for the given prompt.

        Args:
            prompt:        User-facing prompt text.
            model:         ModelInfo resolved from the registry.
            system_prompt: Optional system / instruction prefix.
            temperature:   Sampling temperature; None → use settings default.
            max_tokens:    Maximum output tokens; None → use settings default.

        Returns:
            LLMResponse with the generated text and token counts.

        Raises:
            Any provider-SDK exception — propagated as-is so the caller can
            decide how to handle failures.
        """
        ...
