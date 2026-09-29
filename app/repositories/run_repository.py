# app/repositories/run_repository.py
"""
Run Repository — all SQLAlchemy operations for Run and CostLog.

Rules:
- Only raw db operations here.
- No business logic, no HTTPException, no Celery, no LLM calls.
"""

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.run import CostLog, Run

logger = logging.getLogger(__name__)


class RunRepository:
    def create_run(
        self,
        db: Session,
        prompt_version_id: str,
        model: str,
        status: str = "pending",
    ) -> Run:
        run = Run(
            prompt_version_id=prompt_version_id,
            model=model,
            status=status,
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        logger.debug(f"Created Run id={run.id} status={status}")
        return run

    def get_run_by_id(self, db: Session, run_id: str) -> Optional[Run]:
        return db.query(Run).filter(Run.id == run_id).first()

    def list_runs(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Run]:
        return (
            db.query(Run)
            .order_by(Run.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_run_status(self, db: Session, run: Run, status: str) -> None:
        run.status = status
        db.commit()

    def commit(self, db: Session) -> None:
        db.commit()


run_repository = RunRepository()
