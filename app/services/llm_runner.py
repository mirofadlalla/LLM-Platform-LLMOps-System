# app/services/llm_runner.py
"""
LLM Runner — thin wrapper around LLMService.

The default model name and temperature come from the centralized Settings;
callers can still override them per-call.
"""

import logging

from app.core.config import settings
from app.core.llm_singleton import LLMService

logger = logging.getLogger(__name__)


def call_llama(
    prompt: str,
    model_name: str | None = None,
    system_prompt: str = "",
    temperature: float | None = None,
) -> tuple[str, int, int]:
    """
    Call the LLM (via HuggingFace Inference Client) to generate a response.

    Args:
        prompt:        The user prompt to send to the model.
        model_name:    Ignored — the singleton uses settings.llm_model_name.
                       Kept for call-site compatibility.
        system_prompt: Optional system prompt for context.
        temperature:   Generation temperature; falls back to settings value.

    Returns:
        tuple: (output_text, input_token_count, output_token_count)
    """
    try:
        llm = LLMService()
        output = llm.generate(
            prompt,
            system_prompt=system_prompt,
            temperature=temperature,  # None → LLMService uses settings default
        )

        # Rough word-based approximation of token counts
        input_tokens = len(prompt.split())
        output_tokens = len(output.split())

        logger.info(
            f"LLM call successful. "
            f"Input tokens: {input_tokens}, Output tokens: {output_tokens}"
        )
        return output, input_tokens, output_tokens

    except Exception as exc:
        logger.error(f"Error calling LLM: {exc}", exc_info=True)
        raise