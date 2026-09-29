# app/api/routes/experiment_routes.py
"""
Experiment Routes — HTTP endpoint definitions only.

Rules:
- Define path, method, response_model.
- Inject dependencies (db, api_key).
- Call experiment_controller.
- Return controller result.
- NO business logic, NO db queries, NO Celery.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.controllers.experiment_controller import experiment_controller
from app.core.database import get_db
from app.core.security import get_api_key
from app.schemas.experiments import ExperimentRunCreate

router = APIRouter(tags=["experiments"])


@router.post("/experiments/run")
def trigger_experiment_run(
    payload: ExperimentRunCreate,
    api_key=Depends(get_api_key),
):
    return experiment_controller.trigger_experiment(
        api_key=api_key,
        prompt_id=payload.prompt_id,
        experiment_name=payload.experiment_name,
    )


@router.get("/experiments/{experiment_id}/status")
def get_experiment_status(
    experiment_id: str,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    return experiment_controller.get_experiment_status(
        db=db,
        api_key=api_key,
        experiment_id=experiment_id,
    )


@router.get("/experiments")
def list_experiments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    return experiment_controller.list_experiments(
        db=db,
        api_key=api_key,
        skip=skip,
        limit=limit,
    )
