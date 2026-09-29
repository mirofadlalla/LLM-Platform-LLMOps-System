# app/api/controllers/evaluation_controller.py
"""
Evaluation Controller — bridges HTTP/API layer and EvaluationService.

Responsibilities:
- Receive validated request data.
- Call evaluation_service methods.
- Translate domain exceptions into HTTPException.
- Shape response dicts returned to the router.

Rules:
- NO SQLAlchemy queries.
- NO LLM calls.
- NO scoring logic.
"""

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import GoldenExamplesNotFoundError, PromptVersionNotFoundError
from app.services.evaluation_service import evaluation_service

logger = logging.getLogger(__name__)


class EvaluationController:
    def create_golden_example(
        self,
        db: Session,
        prompt_id: str,
        input_data: dict,
        expected_output: str,
    ) -> dict:
        example = evaluation_service.create_golden_example(
            db=db,
            prompt_id=prompt_id,
            input_data=input_data,
            expected_output=expected_output,
        )
        return {"golden_example_id": example.id}

    def list_golden_examples(self, db: Session, prompt_id: str):
        return evaluation_service.list_golden_examples(db=db, prompt_id=prompt_id)

    def evaluate_prompt_version(
        self,
        db: Session,
        prompt_id: str,
        version_id: str,
    ) -> dict:
        try:
            version_id_out, average_score, total_tests = (
                evaluation_service.evaluate_prompt_version(
                    db=db,
                    prompt_id=prompt_id,
                    version_id=version_id,
                )
            )
        except PromptVersionNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Prompt version not found") from exc
        except GoldenExamplesNotFoundError as exc:
            raise HTTPException(status_code=400, detail="No golden examples found") from exc

        return {
            "prompt_version_id": version_id_out,
            "average_score": average_score,
            "total_tests": total_tests,
        }


evaluation_controller = EvaluationController()
