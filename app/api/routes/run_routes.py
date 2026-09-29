# app/api/routes/run_routes.py
"""
Run Routes — HTTP endpoint definitions only.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.controllers.run_controller import run_controller
from app.core.database import get_db
from app.core.security import get_api_key
from app.schemas.run import RunRequest, RunResponse

router = APIRouter(tags=["runs"])


@router.post("/run", response_model=RunResponse)
def run_prompt(
    payload: RunRequest,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    return run_controller.create_run(
        db=db,
        api_key=api_key,
        prompt_version_id=payload.prompt_version_id,
        provider=payload.provider,
        model=payload.model,
        payload=payload.dict(),
    )


@router.get("/runs")
def list_runs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    return run_controller.list_runs(db=db, api_key=api_key, skip=skip, limit=limit)


@router.get("/task-status/{task_id}")
def get_task_status(
    task_id: str,
    api_key=Depends(get_api_key),
):
    return run_controller.get_task_status(api_key=api_key, task_id=task_id)
