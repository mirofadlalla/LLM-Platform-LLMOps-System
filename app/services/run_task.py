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
    """
    Celery task: render prompt → call LLM → persist results.

    payload keys:
        prompt_version_id: str
        variables:         dict
        provider:          str   (registry provider key, e.g. "groq")
        model:             str   (registry model slug,   e.g. "gpt-oss-20b")
    """
    # Lazy import — keeps module load fast; avoids circular deps at worker startup
    from app.llm.runner import call_llm

    logger.info(f"run_prompt_task started: run_id={run_id}")
    logger.debug(f"Payload variables: {payload.get('variables')}")

    db = SessionLocal()
    run = None

    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            logger.error(f"Run id={run_id} not found")
            raise ValueError(f"Run {run_id} not found")

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

        # Resolve provider and model — fall back to application defaults
        provider_id = payload.get("provider") or settings.default_llm_provider
        model_slug  = payload.get("model")    or settings.default_llm_model

        start = time.perf_counter()
        output, tokens_in, tokens_out = call_llm(
            prompt=rendered_prompt,
            provider_id=provider_id,
            model_slug=model_slug,
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

        logger.info(
            f"run_prompt_task completed: run_id={run_id} "
            f"provider={provider_id} model={model_slug} "
            f"latency={latency_ms}ms cost=${cost:.6f}"
        )

    except Exception as exc:
        logger.error(f"run_prompt_task failed: run_id={run_id} — {exc}", exc_info=True)
        if run is not None:
            run.status = "failed"
            db.commit()
        raise

    finally:
        db.close()
