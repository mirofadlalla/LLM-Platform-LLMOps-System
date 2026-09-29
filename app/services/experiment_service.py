# app/services/experiment_service.py
"""
Experiment Service — business / application logic for experiments.

Rules:
- Enqueues Celery task; does not run the experiment inline.
- Raises domain exceptions (not HTTPException).
- Does NOT import FastAPI.
"""

import logging
from typing import List

from sqlalchemy.orm import Session

from app.core.exceptions import ExperimentNotFoundError, TaskQueueError
from app.models.experiment import Experiment, ExperimentResult
from app.repositories.experiment_repository import experiment_repository

logger = logging.getLogger(__name__)


class ExperimentService:
    def trigger_experiment(
        self,
        prompt_id: str,
        experiment_name: str,
    ) -> str:
        """
        Enqueue a Celery experiment task.

        Returns the Celery task_id.
        Raises TaskQueueError on Celery failure.
        """
        from app.services.run_experiment import run_experiment  # lazy import

        logger.info(
            f"Triggering experiment name={experiment_name!r} prompt_id={prompt_id}"
        )
        try:
            task_result = run_experiment.delay(prompt_id, experiment_name)
            logger.info(f"Experiment task queued task_id={task_result.id}")
            return task_result.id
        except Exception as exc:
            logger.error(f"Failed to queue experiment task: {exc}", exc_info=True)
            raise TaskQueueError(str(exc)) from exc

    def get_experiment_status(
        self,
        db: Session,
        experiment_id: str,
    ) -> tuple[Experiment, List[ExperimentResult]]:
        """
        Retrieve experiment and its results.
        Raises ExperimentNotFoundError if the experiment does not exist.
        """
        experiment = experiment_repository.get_experiment_by_id(
            db=db, experiment_id=experiment_id
        )
        if not experiment:
            raise ExperimentNotFoundError(
                f"Experiment id={experiment_id} not found"
            )

        results = experiment_repository.list_results_by_experiment(
            db=db, experiment_id=experiment_id
        )
        return experiment, results

    def list_experiments(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Experiment]:
        return experiment_repository.list_experiments(db=db, skip=skip, limit=limit)


experiment_service = ExperimentService()
