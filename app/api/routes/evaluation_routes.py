# app/api/routes/evaluation_routes.py
"""
Evaluation Routes — HTTP endpoint definitions only.

Rules:
- Define path, method, response_model.
- Inject dependencies (db).
- Call evaluation_controller.
- Return controller result.
- NO business logic, NO db queries, NO LLM calls.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.controllers.evaluation_controller import evaluation_controller
from app.core.database import get_db
from app.schemas.evaluation import EvaluationResponse, GoldenExampleCreate

router = APIRouter(tags=["evaluations"])


@router.post("/prompts/{prompt_id}/golden-examples")
def create_golden_example(
    prompt_id: str,
    payload: GoldenExampleCreate,
    db: Session = Depends(get_db),
):
    return evaluation_controller.create_golden_example(
        db=db,
        prompt_id=prompt_id,
        input_data=payload.input_data,
        expected_output=payload.expected_output,
    )


@router.get("/prompts/{prompt_id}/golden-examples")
def list_golden_examples(
    prompt_id: str,
    db: Session = Depends(get_db),
):
    return evaluation_controller.list_golden_examples(db=db, prompt_id=prompt_id)


@router.post(
    "/prompts/{prompt_id}/versions/{version_id}/evaluate",
    response_model=EvaluationResponse,
)
async def evaluate_prompt_version(
    prompt_id: str,
    version_id: str,
    db: Session = Depends(get_db),
):
    return evaluation_controller.evaluate_prompt_version(
        db=db,
        prompt_id=prompt_id,
        version_id=version_id,
    )
