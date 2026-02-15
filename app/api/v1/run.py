import logging
import time
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import get_api_key
from app.core.rate_limit import rate_limit
from app.models import (
    Prompt,
    PromptVersion,
    Run,
    CostLog,
    GoldenExample,
    EvaluationResult,
    Experiment,
    ExperimentResult
)
from app.schemas.prompt import (
    ActivatePromptVersionResponse,
    PromptCreate,
    PromptCreateResponse,
    PromptDiffResponse,
    PromptVersionCreate,
    PromptVersionHistoryResponse,
    PromptVersionResponse,
)
from app.schemas.run import RunRequest, RunResponse
from app.schemas.experiments import ExperimentRunCreate
from app.schemas.evaluation import GoldenExampleCreate, EvaluationResponse
from app.services.prompt_renderer import render_prompt
from app.services.prompt_diff import diff_templates
from app.services.evaluator import similarity_score
from app.services.llm_runner import call_llama
from app.services.run_experiment import run_experiment
from app.services.run_task import run_prompt_task

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.FileHandler("app.log")
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

router = APIRouter()


# Create a new prompt with initial version
@router.post(
    "/prompts",
    response_model=PromptCreateResponse
)
def create_prompt(
    payload: PromptCreate,
    db: Session = Depends(get_db),
):
    prompt = Prompt(
        name=payload.name,
        description=payload.description
    )
    db.add(prompt)
    db.flush()

    version = PromptVersion(
        prompt_id=prompt.id,
        version="v1",
        template=payload.template
    )
    db.add(version)
    db.commit()

    return {
        "prompt_id": prompt.id,
        "version": version.version
    }

# Get list of prompts with pagination
@router.get("/prompts")
def list_prompts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    prompts = (
        db.query(Prompt)
        .order_by(Prompt.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return prompts


# Create a new version of an existing prompt
@router.post(
    "/prompts/{prompt_id}/versions",
    response_model=PromptVersionResponse
)
def create_prompt_version(
    prompt_id: str,
    payload: PromptVersionCreate,
    db: Session = Depends(get_db),
):
    count = (
        db.query(PromptVersion)
        .filter(PromptVersion.prompt_id == prompt_id)
        .count()
    )

    version = PromptVersion(
        prompt_id=prompt_id,
        version=f"v{count + 1}",
        is_active=False,
        template=payload.template
    )

    db.add(version)
    db.commit()

    return {
        "prompt_id": prompt_id,
        "version": version.version,
        "template": version.template
    }


# New endpoint to create a run and immediately return pending status, while processing happens asynchronously
@router.post("/run", response_model=RunResponse)
def run_prompt(
    payload: RunRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key),
):
    # rate limit
    rate_limit(api_key)

    # create run (pending)
    run = Run(
        prompt_version_id=payload.prompt_version_id,
        model=payload.model,
        status="pending",
    )
    db.add(run)
    db.commit()
    
    logger.info(f"Created run: {run.id} for prompt_version: {payload.prompt_version_id}")
    # fire async task - use positional arguments
    try:
        task_result = run_prompt_task.delay(
            str(run.id),
            payload.dict(),
        )
        logger.info(f"Task queued with Celery task ID: {task_result.id}")
    except Exception as e:
        print(f"ERROR: Failed to queue task: {str(e)}")
        logger.error(f"Failed to queue task: {str(e)}", exc_info=True)
        run.status = "failed"
        db.commit()
        raise

    return {
        "run_id": str(run.id),
        "task_id": task_result.id,
        "status": "pending",
    }

# List all runs with pagination
@router.get("/runs")
def list_runs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key),
):
    rate_limit(api_key)
    
    runs = (
        db.query(Run)
        .order_by(Run.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return runs

# Endpoint to check task status and get results
@router.get("/task-status/{task_id}")
def get_task_status(task_id: str, api_key: str = Depends(get_api_key)):
    """
    Check the status of a submitted task
    Returns: pending, processing, success, failed
    """
    task = run_prompt_task.AsyncResult(task_id)
    
    if task.state == 'PENDING':
        return {
            "task_id": task_id,
            "status": "pending",
            "message": "Task is waiting to be processed"
        }
    elif task.state == 'PROGRESS':
        return {
            "task_id": task_id,
            "status": "processing",
            "message": f"Task is processing: {task.info}"
        }
    elif task.state == 'SUCCESS':
        return {
            "task_id": task_id,
            "status": "success",
            "result": task.result
        }
    else:  # FAILURE or RETRY
        return {
            "task_id": task_id,
            "status": "failed",
            "error": str(task.info)
        }


# List all versions of a prompt with metadata
@router.get(
    "/prompts/{prompt_id}/versions",
    response_model=PromptVersionHistoryResponse
)
def list_prompt_versions(
    prompt_id: str,
    db: Session = Depends(get_db),
):
    versions = (
        db.query(PromptVersion)
        .filter(PromptVersion.prompt_id == prompt_id)
        .order_by(PromptVersion.created_at.desc())
        .all()
    )

    return {
        "prompt_id": prompt_id,
        "versions": versions
    }


# Activate a specific prompt versionand deactivate others
@router.post(
    "/prompts/{prompt_id}/versions/{version_id}/activate",
    response_model=ActivatePromptVersionResponse
)
def activate_prompt_version(
    prompt_id: str,
    version_id: str,
    db: Session = Depends(get_db),
):
    # 1- ensure that the version exist
    version = (
        db.query(PromptVersion)
        .filter(
            PromptVersion.id == version_id,
            PromptVersion.prompt_id == prompt_id
        )
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Prompt version not found"
        )

    # update all versions to inactive
    (
        db.query(PromptVersion)
        .filter(PromptVersion.prompt_id == prompt_id)
        .update({"is_active": False})
    )

    # keep only the selected version active
    version.is_active = True

    db.commit()

    return {
        "prompt_id": prompt_id,
        "activated_version_id": version.id,
        "version": version.version
    }



# Diffing two prompt versions
@router.get(
    "/prompts/diff",
    response_model=PromptDiffResponse
)
def diff_prompt_versions(
    prompt_id: str,
    from_version_id: str,
    to_version_id: str,
    db: Session = Depends(get_db),
):
    from_version = (
        db.query(PromptVersion)
        .filter(
            PromptVersion.id == from_version_id,
            PromptVersion.prompt_id == prompt_id
        )
        .first()
    )

    to_version = (
        db.query(PromptVersion)
        .filter(
            PromptVersion.id == to_version_id,
            PromptVersion.prompt_id == prompt_id
        )
        .first()
    )

    if not from_version or not to_version:
        raise HTTPException(
            status_code=404,
            detail="One or both prompt versions not found"
        )

    diff = diff_templates(from_version.template, to_version.template)

    return {
        "prompt_id": prompt_id,
        "from_version_id": from_version_id,
        "to_version_id": to_version_id,
        "diff": diff
    }

'''
http://0.0.0.0:8000/api/v1/prompts/diff?prompt_id=93c8a54c-4722-4787-968b-b33c9136e744&from_version_id=d135a66f-0f0a-454e-9b2e-087b7213853e&to_version_id=d135a66f-0f0a-454e-9b2e-087b7213853A
##                       answer
{
    "prompt_id": "93c8a54c-4722-4787-968b-b33c9136e744",
    "from_version_id": "d135a66f-0f0a-454e-9b2e-087b7213853e",
    "to_version_id": "d135a66f-0f0a-454e-9b2e-087b7213853A",
    "diff": [
        "--- ",
        "+++ ",
        "@@ -1 +1 @@",
        "-Summarize the following text:\\n{text}",
        "+Explain The text :\\n{text}"
    ]
}
'''


# Create a golden example for a prompt
@router.post(
    "/prompts/{prompt_id}/golden-examples")
def create_golden_example(
        prompt_id: str,
    payload: GoldenExampleCreate,
    db: Session = Depends(get_db)
): 
    golden_example = GoldenExample(
        prompt_id=prompt_id,
        input_data=json.dumps(payload.input_data),
        expected_output=payload.expected_output
    )
    db.add(golden_example)
    db.commit()

    return {
        "golden_example_id": golden_example.id
    }


# List golden examples for a prompt
@router.get("/prompts/{prompt_id}/golden-examples")
def list_golden_examples(
    prompt_id: str,
    db: Session = Depends(get_db),
):
    examples = (
        db.query(GoldenExample)
        .filter(GoldenExample.prompt_id == prompt_id)
        .all()
    )
    return examples


# Evaluate a prompt version against its golden examples
@router.post(
    "/prompts/{prompt_id}/versions/{version_id}/evaluate",
    response_model=EvaluationResponse
)
async def evaluate_prompt_version(
    prompt_id: str,
    version_id: str,
    db: Session = Depends(get_db),
):
    logger.info(f"Starting evaluation for prompt_id: {prompt_id}, version_id: {version_id}")
    prompt_version = (
        db.query(PromptVersion)
        .filter(PromptVersion.id == version_id)
        .first()
    )

    logger.info(f"Loaded prompt version: {prompt_version}")

    golden_examples = (
        db.query(GoldenExample)
        .filter(GoldenExample.prompt_id == prompt_id)
        .all()
    )

    logger.info(f"Found {len(golden_examples)} golden examples")

    if not golden_examples:
        logger.error("No golden examples found")
        raise HTTPException(400, "No golden examples found")

    scores = []

    logger.info("Beginning evaluation loop over golden examples")
    for example in golden_examples:
        variables = json.loads(example.input_data)
        logger.info(f"Evaluating golden example ID: {example.id} with variables: {variables}")
        rendered = render_prompt(prompt_version.template, variables)
        logger.info(f"Rendered prompt: {rendered}")

        output, _, _ = call_llama(rendered)
        logger.info(f"Model output: {output}")

        score = similarity_score(
            user_input=rendered,
            expected_output=example.expected_output,
            model_output=output
        )
        logger.info(f"Evaluation score: {score}")


        scores.append(score['score'])

        db.add(
            EvaluationResult(
                prompt_version_id=version_id,
                golden_example_id=example.id,
                score=score['score'],
                reason=score.get('reason', ''),
                output=output,
            )
        )

        logger.debug(f"Logged evaluation result for golden example ID: {example.id}")

    db.commit()

    return {
        "prompt_version_id": version_id,
        "average_score": sum(scores) / len(scores),
        "total_tests": len(scores),
    }



# # Experiment Runner Logic

# endpoint to trigger experiment run
@router.post("/experiments/run")
def trigger_experiment_run(
    playload : ExperimentRunCreate,
    api_key: str = Depends(get_api_key),
):
    rate_limit(api_key)
    
    logger.info(f"Triggering experiment: {playload.experiment_name} for prompt_id: {playload.prompt_id}")
    print(f"\n{'='*60}")
    print(f"API: POST /experiments/run - Triggering Experiment")
    print(f"Experiment Name: {playload.experiment_name}")
    print(f"Prompt ID: {playload.prompt_id}")
    print(f"Queuing async task...")

    # fire async task - use positional arguments
    try:
        task_result = run_experiment.delay(
            playload.prompt_id,
            playload.experiment_name,
        )
        print(f"Task queued successfully! Task ID: {task_result.id}")
        logger.info(f"Experiment task queued with Celery task ID: {task_result.id}")
    except Exception as e:
        print(f"ERROR: Failed to queue task: {str(e)}")
        logger.error(f"Failed to queue experiment task: {str(e)}", exc_info=True)
        raise
    
    print(f"{'='*60}\n")

    return {
        "message": f"Experiment '{playload.experiment_name}' is running. Check results later."
    }

# experiments results endpoint
@router.get("/experiments/{experiment_id}/status")
def get_experiment_status(
    experiment_id: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key),
):
    rate_limit(api_key)

    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()

    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    results = (
        db.query(ExperimentResult)
        .filter(ExperimentResult.experiment_id == experiment_id)
        .all()
    )

    return {
        "experiment_id": experiment_id,
        "experiment_name": experiment.name,
        "status": experiment.status,
        "results": results
    }


# List all experiments with pagination
@router.get("/experiments")
def list_experiments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key),
):
    rate_limit(api_key)
    experiments = (
        db.query(Experiment)
        .order_by(Experiment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return experiments