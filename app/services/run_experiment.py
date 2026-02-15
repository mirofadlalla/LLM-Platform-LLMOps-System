# app/services/run_task.py
from app.core.celery_app import celery_app
from app.models import Experiment, ExperimentResult, PromptVersion, GoldenExample
from app.core.database import SessionLocal
import json, logging
from app.services.prompt_renderer import render_prompt
from app.services.evaluator import similarity_score
from app.services.llm_runner import call_llama

@celery_app.task(bind=True)
def run_experiment(self, prompt_id: str, experiment_name: str):
    db = SessionLocal()

    try:
        logging.info(f"Starting experiment: {experiment_name} for prompt_id: {prompt_id}")
        experiment = Experiment(
            name=experiment_name,
            prompt_id=prompt_id,
            status="running"
        )
        db.add(experiment)
        db.commit()
        db.refresh(experiment)
        logging.info(f"Experiment record created with ID: {experiment.id}")

        logging.info(f"Fetching prompt versions for prompt_id: {prompt_id}")
        prompt_versions = db.query(PromptVersion).filter_by(prompt_id=prompt_id).all()
        if not prompt_versions:
            raise ValueError("No prompt versions found")
        logging.info(f"Found {len(prompt_versions)} prompt versions")

        logging.info(f"Fetching golden examples for prompt_id: {prompt_id}")
        golden_examples = db.query(GoldenExample).filter_by(prompt_id=prompt_id).all()
        if not golden_examples:
            raise ValueError("No golden examples found")
        logging.info(f"Found {len(golden_examples)} golden examples")


        results_to_add = []

        for version in prompt_versions:
            _score = []
            hallucination_rate = []

            for example in golden_examples:
                try:
                    variables = json.loads(example.input_data)
                    rendered = render_prompt(version.template, variables)
                    output, _, _ = call_llama(rendered)
                    score = similarity_score(rendered, example.expected_output, output)
                except Exception as e:
                    logging.warning(f"Failed example: {example.id}, reason: {e}")
                    continue
                
                print(type(score.get('hallucination_rate', 0)))
                print(type(score['score']))
                hallucination_rate.append(score.get('hallucination_rate', 0))
                _score.append(score['score'])

            results_to_add.append(
                ExperimentResult(
                    experiment_id=experiment.id,
                    prompt_version_id=version.id,
                    avg_score=sum(_score)/len(_score) if _score else 0,
                    min_score=min(_score) if _score else 0,
                    max_score=max(_score) if _score else 0,
                    avg_hallucination_rate=sum(hallucination_rate)/len(hallucination_rate) if hallucination_rate else 0,
                    failure_count=len([s for s in _score if s < 0.5]),
                    total_examples=len(_score)
                )
            )

        db.add_all(results_to_add)
        experiment.status = "completed"
        db.commit()

    except Exception as e:
        logging.error("Experiment run failed", exc_info=True)
        db.rollback()
        experiment.status = "failed"
        db.commit()

    finally:
        db.close()
