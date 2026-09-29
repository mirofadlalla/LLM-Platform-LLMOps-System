# app/api/routes/prompt_routes.py
"""
Prompt Routes — HTTP endpoint definitions only.

Rules:
- Define path, method, response_model.
- Inject dependencies (db).
- Call prompt_controller.
- Return controller result.
- NO business logic, NO db queries, NO Celery.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.controllers.prompt_controller import prompt_controller
from app.core.database import get_db
from app.schemas.prompt import (
    ActivatePromptVersionResponse,
    PromptCreate,
    PromptCreateResponse,
    PromptDiffResponse,
    PromptVersionCreate,
    PromptVersionHistoryResponse,
    PromptVersionResponse,
)

router = APIRouter(tags=["prompts"])


@router.post("/prompts", response_model=PromptCreateResponse)
def create_prompt(
    payload: PromptCreate,
    db: Session = Depends(get_db),
):
    return prompt_controller.create_prompt(
        db=db,
        name=payload.name,
        description=payload.description,
        template=payload.template,
    )


@router.get("/prompts")
def list_prompts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return prompt_controller.list_prompts(db=db, skip=skip, limit=limit)


@router.post(
    "/prompts/{prompt_id}/versions",
    response_model=PromptVersionResponse,
)
def create_prompt_version(
    prompt_id: str,
    payload: PromptVersionCreate,
    db: Session = Depends(get_db),
):
    return prompt_controller.create_prompt_version(
        db=db,
        prompt_id=prompt_id,
        template=payload.template,
    )


@router.get(
    "/prompts/{prompt_id}/versions",
    response_model=PromptVersionHistoryResponse,
)
def list_prompt_versions(
    prompt_id: str,
    db: Session = Depends(get_db),
):
    return prompt_controller.list_prompt_versions(db=db, prompt_id=prompt_id)


@router.post(
    "/prompts/{prompt_id}/versions/{version_id}/activate",
    response_model=ActivatePromptVersionResponse,
)
def activate_prompt_version(
    prompt_id: str,
    version_id: str,
    db: Session = Depends(get_db),
):
    return prompt_controller.activate_prompt_version(
        db=db,
        prompt_id=prompt_id,
        version_id=version_id,
    )


@router.get("/prompts/diff", response_model=PromptDiffResponse)
def diff_prompt_versions(
    prompt_id: str,
    from_version_id: str,
    to_version_id: str,
    db: Session = Depends(get_db),
):
    return prompt_controller.diff_prompt_versions(
        db=db,
        prompt_id=prompt_id,
        from_version_id=from_version_id,
        to_version_id=to_version_id,
    )
