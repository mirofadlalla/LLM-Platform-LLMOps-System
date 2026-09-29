# app/services/evaluator.py
import logging

from langchain_core.output_parsers import SimpleJsonOutputParser

from app.llm.runner import call_llm   # ← provider-agnostic entry point

logger = logging.getLogger(__name__)

# Evaluation judge system prompt — unchanged from original
_EVALUATOR_SYSTEM_PROMPT = """
You are an impartial evaluator. \
Your task is to compare a model output against an expected output \
for a given user input. \
Evaluate based on: \
- Task correctness \
- Completeness \
- Faithfulness to the expected output \
Return a JSON object ONLY with: \
{ \
  "score": float between 0 and 1, \
  "reason": short explanation, \
  "hallucination_rate": float between 0 and 1 indicating the degree of hallucination in the model output \
}
"""


def similarity_score(
    user_input: str,
    expected_output: str,
    model_output: str,
) -> dict:
    """
    Use the default LLM to judge how well model_output matches expected_output.

    Returns a dict with keys: score, reason, hallucination_rate.
    """
    evaluation_prompt = (
        f"User Input: {user_input}\n"
        f"Expected Output: {expected_output}\n"
        f"Model Output: {model_output}\n"
        "Evaluate the model output against the expected output based on the "
        "criteria mentioned in the system prompt."
    )

    logger.info("Running similarity evaluation via LLM judge")
    logger.debug(f"Evaluation prompt: {evaluation_prompt}")

    raw_result, _, _ = call_llm(
        prompt=evaluation_prompt,
        system_prompt=_EVALUATOR_SYSTEM_PROMPT,
        # Uses settings.default_llm_provider + settings.default_llm_model
    )

    logger.debug(f"Evaluation result (raw): {raw_result}")

    parser = SimpleJsonOutputParser()
    return parser.invoke(raw_result)