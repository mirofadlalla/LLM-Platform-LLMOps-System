# app/api/controllers/experiment_controller.py
"""
Experiment Controller — bridges HTTP/API layer and ExperimentService.

Responsibilities:
- Apply rate limiting (API-boundary concern).
- Call experiment_service methods.
- Translate domain exceptions into HTTPException.
- Shape response dicts returned to the router.

Rules:
- NO SQLAlchemy queries.
- NO direct Celery calls.
"""

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import ExperimentNotFoundError, TaskQueueError
from app.core.rate_limit import rate_limit
from app.services.experiment_service import experiment_service

logger = logging.getLogger(__name__)


class ExperimentController:
    def trigger_experiment(
        self,
        api_key,
        prompt_id: str,
        experiment_name: str,
    ) -> dict:
        rate_limit(api_key)

        logger.info(
            f"Triggering experiment name={experiment_name!r} prompt_id={prompt_id}"
        )
        try:
            task_id = experiment_service.trigger_experiment(
                prompt_id=prompt_id,
                experiment_name=experiment_name,
            )
        except TaskQueueError as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to queue experiment task: {exc}",
            ) from exc

        return {
            "message": f"Experiment '{experiment_name}' is running. Check results later."
        }

    def get_experiment_status(
        self,
        db: Session,
        api_key,
        experiment_id: str,
    ) -> dict:
        rate_limit(api_key)

        try:
            experiment, results = experiment_service.get_experiment_status(
                db=db,
                experiment_id=experiment_id,
            )
        except ExperimentNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Experiment not found") from exc

        return {
            "experiment_id": experiment_id,
            "experiment_name": experiment.name,
            "status": experiment.status,
            "results": results,
        }

    def list_experiments(
        self,
        db: Session,
        api_key,
        skip: int,
        limit: int,
    ):
        rate_limit(api_key)
        return experiment_service.list_experiments(db=db, skip=skip, limit=limit)


experiment_controller = ExperimentController()
