# app/services/run_task.py
import logging
import time

from app.core.celery_app import CeleryApp
from app.core.config import settings
from app.core.database import SessionLocal
from app.models import CostLog, PromptVersion, Run
from app.services.prompt_renderer import render_prompt

logger = logging.getLogger(__name__)


@CeleryApp.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={
        "max_retries": settings.celery_task_max_retries,
        "countdown": settings.celery_task_retry_countdown,
    },
    name="app.services.run_task.run_prompt_task",
)
def run_prompt_task(self, run_id: str, payload: dict):
    """Celery task: render prompt, call LLM, persist results."""
    # Lazy import — only load when the task actually executes on a worker
    from app.services.llm_runner import call_llama

    logger.info("run_prompt_task started")
    db = SessionLocal()

    logger.info(f"Starting run_prompt_task for run_id={run_id}")
    logger.info(f"Payload variables: {payload.get('variables')}")

    run = None
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            logger.error(f"Run id={run_id} not found in database")
            raise ValueError(f"Run with id {run_id} not found")

        run.status = "running"
        db.commit()

        prompt_version = (
            db.query(PromptVersion)
            .filter(PromptVersion.id == payload["prompt_version_id"])
            .first()
        )

        rendered_prompt = render_prompt(
            prompt_version.template,
            payload["variables"],
        )

        start = time.perf_counter()
        output, tokens_in, tokens_out = call_llama(
            prompt=rendered_prompt,
            model_name=payload.get("model"),  # None → LLMService uses settings default
        )
        latency_ms = int((time.perf_counter() - start) * 1000)

        run.output = output
        run.latency_ms = latency_ms
        run.tokens_in = tokens_in
        run.tokens_out = tokens_out
        run.status = "completed"

        cost = (tokens_in + tokens_out) * settings.llm_cost_per_token

        db.add(CostLog(run_id=run.id, cost_usd=cost))
        db.commit()

    except Exception as exc:
        logger.error(f"Error in run_prompt_task: {exc}", exc_info=True)
        if run is not None:
            run.status = "failed"
            db.commit()
        raise

    finally:
        db.close()
