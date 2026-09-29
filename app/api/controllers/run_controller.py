# app/api/controllers/run_controller.py
"""
Run Controller — bridges HTTP/API layer and RunService.
"""

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import TaskQueueError
from app.core.rate_limit import rate_limit
from app.services.run_service import run_service

logger = logging.getLogger(__name__)


class RunController:
    def create_run(
        self,
        db: Session,
        api_key,
        prompt_version_id: str,
        provider: str,
        model: str,
        payload: dict,
    ) -> dict:
        rate_limit(api_key)

        try:
            run, task_id = run_service.create_run_and_enqueue(
                db=db,
                prompt_version_id=prompt_version_id,
                provider=provider,
                model=model,
                payload=payload,
            )
        except TaskQueueError as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to queue run task: {exc}",
            ) from exc

        return {
            "run_id": str(run.id),
            "task_id": task_id,
            "status": "pending",
        }

    def list_runs(self, db: Session, api_key, skip: int, limit: int):
        rate_limit(api_key)
        return run_service.list_runs(db=db, skip=skip, limit=limit)

    def get_task_status(self, api_key, task_id: str) -> dict:
        rate_limit(api_key)
        return run_service.get_task_status(task_id=task_id)


run_controller = RunController()
