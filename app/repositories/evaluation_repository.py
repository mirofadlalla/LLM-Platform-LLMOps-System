# app/repositories/evaluation_repository.py
"""
Evaluation Repository — SQLAlchemy operations for GoldenExample and EvaluationResult.

Rules:
- Only raw db operations here.
- No business logic, no HTTPException, no LLM calls.
"""

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.evaluation import EvaluationResult, GoldenExample

logger = logging.getLogger(__name__)


class EvaluationRepository:
    # ------------------------------------------------------------------ #
    # GoldenExample                                                        #
    # ------------------------------------------------------------------ #

    def create_golden_example(
        self,
        db: Session,
        prompt_id: str,
        input_data: str,   # JSON-serialised string
        expected_output: str,
    ) -> GoldenExample:
        example = GoldenExample(
            prompt_id=prompt_id,
            input_data=input_data,
            expected_output=expected_output,
        )
        db.add(example)
        db.commit()
        db.refresh(example)
        logger.debug(f"Created GoldenExample id={example.id} for prompt_id={prompt_id}")
        return example

    def list_golden_examples(
        self,
        db: Session,
        prompt_id: str,
    ) -> List[GoldenExample]:
        return (
            db.query(GoldenExample)
            .filter(GoldenExample.prompt_id == prompt_id)
            .all()
        )

    # ------------------------------------------------------------------ #
    # EvaluationResult                                                     #
    # ------------------------------------------------------------------ #

    def bulk_add_evaluation_results(
        self,
        db: Session,
        results: List[EvaluationResult],
    ) -> None:
        """Add multiple evaluation results in one flush, then commit once."""
        for result in results:
            db.add(result)
        db.commit()
        logger.debug(f"Committed {len(results)} EvaluationResult records")

    def commit(self, db: Session) -> None:
        db.commit()


evaluation_repository = EvaluationRepository()
