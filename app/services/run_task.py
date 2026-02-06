import time
from app.core.celery_app import CeleryApp
from app.core.database import SessionLocal
from app.models import PromptVersion, Run, CostLog
from app.services.prompt_renderer import render_prompt
import logging

@CeleryApp.task(bind=True, autoretry_for=(Exception,), retry_kwargs={"max_retries": 3, "countdown": 5}, name='app.services.run_task.run_prompt_task')
def run_prompt_task(self, run_id: str, payload: dict):
    # Lazy import - only load when task is actually executed
    from app.services.llm_runner import call_llama
    
    db = SessionLocal()
    logging.info(f"Starting run_prompt_task for run_id: {run_id}")
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            logging.error(f"Run with id {run_id} not found in database")
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
            payload["variables"]
        )

        start = time.perf_counter()
        output, tokens_in, tokens_out = call_llama(
            rendered_prompt,
            model_name=payload.get("model", "Qwen/Qwen2.5-1.5B-Instruct")
        )
        latency_ms = int((time.perf_counter() - start) * 1000)

        run.output = output
        run.latency_ms = latency_ms
        run.tokens_in = tokens_in
        run.tokens_out = tokens_out
        run.status = "completed"

        cost = (tokens_in + tokens_out) * 0.00001

        cost_log = CostLog(
            run_id=run.id,
            cost_usd=cost
        )

        db.add(cost_log)
        db.commit()

    except Exception as e:
        logging.error(f"Error in run_prompt_task: {str(e)}", exc_info=True)
        if run:
            run.status = "failed"
            db.commit()
        raise e

    finally:
        db.close()
