# app/services/run_experiment.py
import json
import logging

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models import Experiment, ExperimentResult, GoldenExample, PromptVersion
from app.services.prompt_renderer import render_prompt

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def run_experiment(self, prompt_id: str, experiment_name: str):
    """
    Celery task: run all prompt versions against all golden examples.

    Uses the application default provider/model (settings.default_llm_provider
    and settings.default_llm_model) for generation and evaluation.
    """
    from app.llm.runner import call_llm          # lazy import
    from app.services.evaluator import similarity_score

    db = SessionLocal()

    try:
        logger.info(f"Experiment starting: {experiment_name!r} prompt_id={prompt_id}")

        experiment = Experiment(
            name=experiment_name,
            prompt_id=prompt_id,
            status="running",
        )
        db.add(experiment)
        db.commit()
        db.refresh(experiment)
        logger.info(f"Experiment record created: id={experiment.id}")

        prompt_versions = db.query(PromptVersion).filter_by(prompt_id=prompt_id).all()
        if not prompt_versions:
            raise ValueError("No prompt versions found")
        logger.info(f"Found {len(prompt_versions)} prompt versions")

        golden_examples = db.query(GoldenExample).filter_by(prompt_id=prompt_id).all()
        if not golden_examples:
            raise ValueError("No golden examples found")
        logger.info(f"Found {len(golden_examples)} golden examples")

        results_to_add: list[ExperimentResult] = []

        for version in prompt_versions:
            scores: list[float] = []
            hallucination_rates: list[float] = []

            for example in golden_examples:
                try:
                    variables = json.loads(example.input_data)
                    rendered = render_prompt(version.template, variables)
                    output, _, _ = call_llm(rendered)          # default provider/model
                    score = similarity_score(rendered, example.expected_output, output)
                except Exception as exc:
                    logger.warning(f"Skipping example id={example.id}: {exc}")
                    continue

                scores.append(score["score"])
                hallucination_rates.append(score.get("hallucination_rate", 0))

            results_to_add.append(
                ExperimentResult(
                    experiment_id=experiment.id,
                    prompt_version_id=version.id,
                    avg_score=sum(scores) / len(scores) if scores else 0,
                    min_score=min(scores) if scores else 0,
                    max_score=max(scores) if scores else 0,
                    avg_hallucination_rate=(
                        sum(hallucination_rates) / len(hallucination_rates)
                        if hallucination_rates else 0
                    ),
                    failure_count=len([s for s in scores if s < 0.5]),
                    total_examples=len(scores),
                )
            )

        db.add_all(results_to_add)
        experiment.status = "completed"
        db.commit()
        logger.info(f"Experiment completed: id={experiment.id}")

    except Exception as exc:
        logger.error("Experiment run failed", exc_info=True)
        db.rollback()
        if experiment:
            experiment.status = "failed"
            db.commit()

    finally:
        db.close()
