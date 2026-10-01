# app/llm/runner.py
"""
Provider-agnostic LLM entry point.

This is the ONLY symbol that business services (EvaluationService,
RunService, ExperimentService, etc.) should import from the LLM layer:

    from app.llm.runner import call_llm

Services never import GroqProvider, HuggingFaceProvider, or LLMRegistry
directly.  Provider-selection logic lives here and in the registry.
"""

import logging

from app.core.config import settings
from app.llm.registry import llm_registry

logger = logging.getLogger(__name__)


def call_llm(
    prompt: str,
    provider_id: str | None = None,
    model_slug: str | None = None,
    system_prompt: str = "",
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> tuple[str, int, int]:
    """
    Generate a completion using the specified provider and model.

    Falls back to settings.default_llm_provider / settings.default_llm_model
    when provider_id or model_slug are not supplied.

    Args:
        prompt:       The user prompt text.
        provider_id:  Registry provider key (e.g. "groq", "huggingface").
        model_slug:   Registry model slug   (e.g. "gpt-oss-20b", "reasoning").
        system_prompt:Optional system / instruction prefix.
        temperature:  Sampling temperature; None → provider/settings default.
        max_tokens:   Maximum output tokens; None → settings default.

    Returns:
        (output_text, input_token_count, output_token_count)

    Raises:
        ValueError   — unknown provider or model slug
        <SDK errors> — propagated from the provider (network, auth, etc.)

    HTTP clients are pooled inside each provider module; this function does not
    create a new SDK client per call.
    """
    effective_provider = provider_id or settings.default_llm_provider
    effective_model = model_slug or settings.default_llm_model

    provider = llm_registry.get_provider(effective_provider)
    model_info = llm_registry.get_model(effective_provider, effective_model)

    logger.info(
        f"call_llm: provider={effective_provider!r} "
        f"model={effective_model!r} (api_id={model_info.api_id!r})"
    )

    response = provider.generate(
        prompt=prompt,
        model=model_info,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    logger.info(
        f"call_llm done: in={response.input_tokens} out={response.output_tokens}"
    )
    return response.text, response.input_tokens, response.output_tokens
