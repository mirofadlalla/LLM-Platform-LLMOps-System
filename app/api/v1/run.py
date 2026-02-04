import logging
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_api_key
from app.core.rate_limit import rate_limit

from app.models import Prompt, PromptVersion, Run, CostLog

from app.schemas.prompt import (
    PromptCreate,
    PromptCreateResponse,
    PromptVersionCreate,
    PromptVersionResponse,
)
from app.schemas.run import RunRequest, RunResponse

from app.services.prompt_renderer import render_prompt
from app.services.llm_runner import call_llama

router = APIRouter()
import os

# from dotenv import load_dotenv
# load_dotenv("E:\pyDS\llmops\.env")

from app.core.rate_limit import rate_limit

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
        template=payload.template
    )

    db.add(version)
    db.commit()

    return {
        "prompt_id": prompt_id,
        "version": version.version,
        "template": version.template
    }


@router.post(
    "/run",
    response_model=RunResponse
)
async def run_prompt(
    payload: RunRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key),
):
    # Rate limiting
    rate_limit(api_key)

    # 1 - Load prompt version
    prompt_version = (
        db.query(PromptVersion)
        .filter(PromptVersion.id == payload.prompt_version_id)
        .first()
    )

    if not prompt_version:
        raise HTTPException(
            status_code=404,
            detail="Prompt version not found"
        )

    # 2️ - Render prompt
    try:
        rendered_prompt = render_prompt(
            prompt_version.template,
            payload.variables
        )
        logging.info(f"Rendered prompt: {rendered_prompt}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    print("Rendered Prompt:", rendered_prompt)
    # 3️ - Call LLM + latency
    start = time.perf_counter()
    result = await call_llama(
        rendered_prompt,
        payload.model
    )
    latency_ms = int((time.perf_counter() - start) * 1000)

    # 4️ - Save Run
    run = Run(
        prompt_version_id=prompt_version.id,
        input=rendered_prompt,
        output=result["output"],
        model=payload.model,
        latency_ms=latency_ms,
        tokens_in=result["tokens_in"],
        tokens_out=result["tokens_out"],
    )
    db.add(run)
    db.flush()

    # 5️ - Cost log (mock pricing)
    cost = (result["tokens_in"] + result["tokens_out"]) * 0.00001

    cost_log = CostLog(
        run_id=run.id,
        cost_usd=cost
    )
    db.add(cost_log)
    db.commit()

    return {
        "run_id": run.id,
        "output": result["output"],
        "latency_ms": latency_ms,
        "tokens_in": result["tokens_in"],
        "tokens_out": result["tokens_out"],
        "cost_usd": cost,
    }
