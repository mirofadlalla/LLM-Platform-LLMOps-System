# app/repositories/experiment_repository.py
"""
Experiment Repository — SQLAlchemy operations for Experiment and ExperimentResult.

Rules:
- Only raw db operations here.
- No business logic, no HTTPException, no Celery.
"""

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.experiment import Experiment, ExperimentResult

logger = logging.getLogger(__name__)


class ExperimentRepository:
    def create_experiment(
        self,
        db: Session,
        prompt_id: str,
        name: str,
        status: str = "running",
    ) -> Experiment:
        experiment = Experiment(
            prompt_id=prompt_id,
            name=name,
            status=status,
        )
        db.add(experiment)
        db.commit()
        db.refresh(experiment)
        logger.debug(f"Created Experiment id={experiment.id} name={name}")
        return experiment

    def get_experiment_by_id(
        self,
        db: Session,
        experiment_id: str,
    ) -> Optional[Experiment]:
        return (
            db.query(Experiment)
            .filter(Experiment.id == experiment_id)
            .first()
        )

    def list_experiments(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Experiment]:
        return (
            db.query(Experiment)
            .order_by(Experiment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def list_results_by_experiment(
        self,
        db: Session,
        experiment_id: str,
    ) -> List[ExperimentResult]:
        return (
            db.query(ExperimentResult)
            .filter(ExperimentResult.experiment_id == experiment_id)
            .all()
        )

    def update_experiment_status(
        self,
        db: Session,
        experiment: Experiment,
        status: str,
    ) -> None:
        experiment.status = status
        db.commit()

    def commit(self, db: Session) -> None:
        db.commit()


experiment_repository = ExperimentRepository()
