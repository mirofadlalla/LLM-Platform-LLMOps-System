# app/services/evaluation_service.py
"""
Evaluation Service — business / application logic for evaluations and golden examples.

Rules:
- Orchestrates: prompt_repository, evaluation_repository, llm_runner, evaluator.
- Raises domain exceptions (not HTTPException).
- Does NOT import FastAPI.
- A single db.commit() is issued at the end of the evaluation loop.
"""

import json
import logging
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import GoldenExamplesNotFoundError, PromptVersionNotFoundError
from app.models.evaluation import EvaluationResult, GoldenExample
from app.repositories.evaluation_repository import evaluation_repository
from app.repositories.prompt_repository import prompt_repository
from app.services.evaluator import similarity_score
from app.services.llm_runner import call_llama
from app.services.prompt_renderer import render_prompt

logger = logging.getLogger(__name__)


class EvaluationService:
    # ------------------------------------------------------------------ #
    # Golden Examples                                                       #
    # ------------------------------------------------------------------ #

    def create_golden_example(
        self,
        db: Session,
        prompt_id: str,
        input_data: dict,
        expected_output: str,
    ) -> GoldenExample:
        return evaluation_repository.create_golden_example(
            db=db,
            prompt_id=prompt_id,
            input_data=json.dumps(input_data),
            expected_output=expected_output,
        )

    def list_golden_examples(
        self,
        db: Session,
        prompt_id: str,
    ) -> List[GoldenExample]:
        return evaluation_repository.list_golden_examples(db=db, prompt_id=prompt_id)

    # ------------------------------------------------------------------ #
    # Evaluation                                                           #
    # ------------------------------------------------------------------ #

    def evaluate_prompt_version(
        self,
        db: Session,
        prompt_id: str,
        version_id: str,
    ) -> Tuple[str, float, int]:
        """
        Run all golden examples against the given prompt version.

        Returns (version_id, average_score, total_tests).

        Raises:
            PromptVersionNotFoundError  — version not found
            GoldenExamplesNotFoundError — no golden examples exist
        """
        logger.info(
            f"Starting evaluation prompt_id={prompt_id} version_id={version_id}"
        )

        prompt_version = prompt_repository.get_version_by_id(
            db=db, version_id=version_id
        )
        if not prompt_version:
            raise PromptVersionNotFoundError(
                f"PromptVersion id={version_id} not found"
            )

        golden_examples = evaluation_repository.list_golden_examples(
            db=db, prompt_id=prompt_id
        )
        if not golden_examples:
            raise GoldenExamplesNotFoundError(
                f"No golden examples found for prompt_id={prompt_id}"
            )

        logger.info(f"Evaluating {len(golden_examples)} golden examples")

        scores: List[float] = []
        results: List[EvaluationResult] = []

        for example in golden_examples:
            variables = json.loads(example.input_data)
            logger.info(f"Processing golden_example id={example.id}")

            rendered = render_prompt(prompt_version.template, variables)
            logger.debug(f"Rendered prompt: {rendered!r}")

            output, _, _ = call_llama(rendered)
            logger.info(f"LLM output for example id={example.id}: {output!r}")

            try:
                score = similarity_score(
                    user_input=rendered,
                    expected_output=example.expected_output,
                    model_output=output,
                )
            except Exception as exc:
                logger.warning(
                    "similarity_score failed for example id=%s: %s",
                    example.id,
                    exc,
                )
                score = {
                    "score": 0.0,
                    "reason": "Evaluator failed; assigned default score.",
                    "hallucination_rate": 0.0,
                }

            numeric_score = float(score.get("score", 0.0) or 0.0)
            numeric_score = max(0.0, min(1.0, numeric_score))
            hallucination_rate = float(score.get("hallucination_rate", 0.0) or 0.0)
            hallucination_rate = max(0.0, min(1.0, hallucination_rate))

            logger.info(f"Score for example id={example.id}: {score}")

            scores.append(numeric_score)
            results.append(
                EvaluationResult(
                    prompt_version_id=version_id,
                    golden_example_id=example.id,
                    score=numeric_score,
                    reason=score.get("reason") or "",
                    hallucination_rate=hallucination_rate,
                    output=output,
                )
            )

        # Single atomic commit for all evaluation results
        evaluation_repository.bulk_add_evaluation_results(db=db, results=results)

        average_score = sum(scores) / len(scores)
        logger.info(
            f"Evaluation complete: avg_score={average_score:.4f} total={len(scores)}"
        )
        return version_id, average_score, len(scores)


evaluation_service = EvaluationService()
