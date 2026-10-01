# app/services/evaluator.py
import json
import logging
import re

from langchain_core.exceptions import OutputParserException
from langchain_core.output_parsers import SimpleJsonOutputParser

from app.llm.runner import call_llm

logger = logging.getLogger(__name__)

_EVALUATOR_SYSTEM_PROMPT = """
You are an impartial evaluator.
Your task is to compare a model output against an expected output
for a given user input.
Evaluate based on:
- Task correctness
- Completeness
- Faithfulness to the expected output
Respond ONLY with a valid JSON object. Do not include markdown code blocks, preambles, or explanations.
The JSON object MUST contain:
{
  "score": float between 0 and 1,
  "reason": short explanation,
  "hallucination_rate": float between 0 and 1 indicating the degree of hallucination in the model output
}
"""

_FALLBACK_RESULT = {
    "score": 0.0,
    "reason": "Could not parse evaluator output.",
    "hallucination_rate": 0.0,
}

_NUMBER_RE = re.compile(r"(\d+(?:\.\d+)?)")
_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)
_OBJECT_RE = re.compile(r"\{[\s\S]*\}")


def extract_json_from_text(text: str) -> dict:
    """Parse a JSON object from LLM text, including markdown-wrapped payloads."""
    cleaned = (text or "").strip()
    if not cleaned:
        raise json.JSONDecodeError("Empty evaluator output", cleaned, 0)

    fenced = _FENCE_RE.search(cleaned)
    if fenced:
        cleaned = fenced.group(1).strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = _OBJECT_RE.search(cleaned)
    if match:
        parsed = json.loads(match.group(0))
        if isinstance(parsed, dict):
            return parsed

    raise json.JSONDecodeError("No JSON object found", cleaned, 0)


def _clamp_unit_interval(value: object, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(1.0, number))


def _fallback_from_text(raw_result: str) -> dict:
    """Best-effort numeric score from unstructured judge text."""
    match = _NUMBER_RE.search(raw_result or "")
    if not match:
        return dict(_FALLBACK_RESULT)

    number = float(match.group(1))
    if number > 1.0:
        number = number / 100.0 if number <= 100.0 else 1.0

    return {
        "score": max(0.0, min(1.0, number)),
        "reason": "Evaluator returned non-JSON output; used extracted numeric score.",
        "hallucination_rate": 0.0,
    }


def _normalize_evaluation(parsed: dict) -> dict:
    return {
        "score": _clamp_unit_interval(parsed.get("score"), 0.0),
        "reason": str(parsed.get("reason") or "").strip(),
        "hallucination_rate": _clamp_unit_interval(
            parsed.get("hallucination_rate"), 0.0
        ),
    }


def similarity_score(
    user_input: str,
    expected_output: str,
    model_output: str,
) -> dict:
    """
    Use the default LLM to judge how well model_output matches expected_output.

    Always returns a dict with keys: score, reason, hallucination_rate.
    Invalid judge output is logged and mapped to a safe fallback instead of raising.
    """
    evaluation_prompt = (
        f"User Input: {user_input}\n"
        f"Expected Output: {expected_output}\n"
        f"Model Output: {model_output}\n"
        "Evaluate the model output against the expected output based on the "
        "criteria mentioned in the system prompt. "
        "Respond ONLY with a valid JSON object."
    )

    logger.info("Running similarity evaluation via LLM judge")
    logger.debug(f"Evaluation prompt: {evaluation_prompt}")

    raw_result, _, _ = call_llm(
        prompt=evaluation_prompt,
        system_prompt=_EVALUATOR_SYSTEM_PROMPT,
    )

    logger.debug(f"Evaluation result (raw): {raw_result!r}")

    try:
        parsed = extract_json_from_text(raw_result)
        return _normalize_evaluation(parsed)
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        logger.warning(
            "Direct JSON extraction failed (%s). Trying LangChain parser. raw=%r",
            exc,
            raw_result,
        )

    try:
        parser = SimpleJsonOutputParser()
        parsed = parser.invoke(raw_result)
        if isinstance(parsed, dict):
            return _normalize_evaluation(parsed)
        raise OutputParserException("Parser did not return a JSON object")
    except (OutputParserException, json.JSONDecodeError, Exception) as exc:
        logger.warning(
            "Failed to parse evaluator JSON (%s). Falling back. raw=%r",
            exc,
            raw_result,
        )
        return _fallback_from_text(raw_result)
