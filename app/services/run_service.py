# app/services/run_service.py
"""
Run Service — business / application logic for run management.

Rules:
- Creates the Run record (pending) then enqueues the Celery task.
- Raises domain exceptions (not HTTPException).
- Does NOT import FastAPI.
"""

import logging

from sqlalchemy.orm import Session

from app.core.exceptions import TaskQueueError
from app.models.run import Run
from app.repositories.run_repository import run_repository

logger = logging.getLogger(__name__)


class RunService:
    def create_run_and_enqueue(
        self,
        db: Session,
        prompt_version_id: str,
        model: str,
        payload: dict,
    ) -> tuple[Run, str]:
        """
        1. Persist a Run record with status='pending'.
        2. Fire the Celery task.
        3. On Celery failure, mark the run as 'failed' and re-raise.

        Returns (run, celery_task_id).
        """
        # Import here to avoid circular imports at module load time
        from app.services.run_task import run_prompt_task

        run = run_repository.create_run(
            db=db,
            prompt_version_id=prompt_version_id,
            model=model,
            status="pending",
        )
        logger.info(f"Created Run id={run.id} for prompt_version_id={prompt_version_id}")

        try:
            task_result = run_prompt_task.delay(str(run.id), payload)
            logger.info(f"Task queued Celery task_id={task_result.id}")
        except Exception as exc:
            logger.error(f"Failed to queue task for run_id={run.id}: {exc}", exc_info=True)
            run_repository.update_run_status(db=db, run=run, status="failed")
            raise TaskQueueError(str(exc)) from exc

        return run, task_result.id

    def list_runs(self, db: Session, skip: int = 0, limit: int = 100):
        return run_repository.list_runs(db=db, skip=skip, limit=limit)

    def get_task_status(self, task_id: str) -> dict:
        """
        Query Celery for task state and return a normalised status dict.
        This keeps Celery state mapping out of the router.
        """
        from app.services.run_task import run_prompt_task

        task = run_prompt_task.AsyncResult(task_id)

        if task.state == "PENDING":
            return {
                "task_id": task_id,
                "status": "pending",
                "message": "Task is waiting to be processed",
            }
        elif task.state == "PROGRESS":
            return {
                "task_id": task_id,
                "status": "processing",
                "message": f"Task is processing: {task.info}",
            }
        elif task.state == "SUCCESS":
            return {
                "task_id": task_id,
                "status": "success",
                "result": task.result,
            }
        else:  # FAILURE or RETRY
            return {
                "task_id": task_id,
                "status": "failed",
                "error": str(task.info),
            }


run_service = RunService()
