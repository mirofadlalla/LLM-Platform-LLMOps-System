import logging
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_api_key
from app.core.rate_limit import rate_limit
from app.services.run_task import run_prompt_task

from app.models import Prompt, PromptVersion, Run, CostLog

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

from app.services.prompt_renderer import render_prompt
from app.schemas.run import RunRequest, RunResponse

from app.services.prompt_diff import diff_templates

router = APIRouter()

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



# @router.post(
#     "/run",
#     response_model=RunResponse
# )
# async def run_prompt(
#     payload: RunRequest,
#     db: Session = Depends(get_db),
#     api_key: str = Depends(get_api_key),
# ):
#     """
#     FastAPI Brain - Receives HTTP request
#     1. Load and render prompt
#     2. Send task to Celery muscle via Redis nervous system
#     3. Return task ID for tracking
#     """
#     # Rate limiting
#     rate_limit(api_key)

#     # 1 - Load prompt version
#     prompt_version = (
#         db.query(PromptVersion)
#         .filter(PromptVersion.id == payload.prompt_version_id)
#         .first()
#     )

#     if not prompt_version:
#         raise HTTPException(
#             status_code=404,
#             detail="Prompt version not found"
#         )

#     # 2️ - Render prompt
#     try:
#         rendered_prompt = render_prompt(
#             prompt_version.template,
#             payload.variables
#         )
#         logging.info(f"Rendered prompt: {rendered_prompt}")
#     except ValueError as e:
#         raise HTTPException(status_code=400, detail=str(e))

#     print("Rendered Prompt:", rendered_prompt)
    
#     # 3️ - Submit task to Celery (muscle) via Redis (nervous system)
#     task = run_prompt_task.apply_async(
#         args=[
#             str(prompt_version.id),
#             rendered_prompt,
#             payload.model,
#             api_key
#         ],
#         queue="llm_tasks_queue"
#     )

#     # Return task ID for polling
#     return {
#         "task_id": task.id,
#         "status": "processing",
#         "message": f"Task submitted to Celery. Check status with task_id: {task.id}"
#     }



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

    # fire async task - use positional arguments
    run_prompt_task.delay(
        str(run.id),
        payload.dict(),
    )

    return {
        "run_id": str(run.id),
        "status": "pending",
    }

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