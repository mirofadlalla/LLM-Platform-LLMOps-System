# app/api/routes/ab_test_routes.py
"""
A/B Test Routes — HTTP endpoint definitions only.

Endpoints:
  POST /ab-tests                  → run both prompts, return answers A & B
  POST /ab-tests/{id}/vote        → cast vote (a | b | tie) + optional feedback
  GET  /ab-tests/{id}             → retrieve a single session
  GET  /ab-tests                  → list all sessions (paginated)

Rules (same as every other router):
- NO business logic, NO db queries, NO LLM calls.
- Inject dependencies, call controller, return result.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.controllers.ab_test_controller import ab_test_controller
from app.core.database import get_db
from app.core.security import get_api_key
from app.schemas.ab_test import (
    ABTestDetailResponse,
    ABTestRunRequest,
    ABTestRunResponse,
    ABTestVoteRequest,
    ABTestVoteResponse,
)

router = APIRouter(prefix="/ab-tests", tags=["ab-testing"])


@router.post("", response_model=ABTestRunResponse)
def run_ab_test(
    payload: ABTestRunRequest,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    """
    Start a pairwise evaluation.

    Renders both prompt versions with the supplied variables, calls the LLM
    for each, and returns both answers for the user to compare.
    """
    return ab_test_controller.run_ab_test(
        db=db,
        version_a_id=payload.version_a_id,
        version_b_id=payload.version_b_id,
        variables=payload.variables,
        provider=payload.provider,
        model=payload.model,
    )


@router.post("/{ab_test_id}/vote", response_model=ABTestVoteResponse)
def vote(
    ab_test_id: str,
    payload: ABTestVoteRequest,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    """
    Cast a vote on an A/B test session.

    winner must be one of: "a", "b", "tie".
    Returns 409 if the session has already been voted on.
    """
    return ab_test_controller.vote(
        db=db,
        ab_test_id=ab_test_id,
        winner=payload.winner,
        feedback=payload.feedback,
    )


@router.get("/{ab_test_id}", response_model=ABTestDetailResponse)
def get_ab_test(
    ab_test_id: str,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    """Retrieve a single A/B test session (including vote if cast)."""
    return ab_test_controller.get_by_id(db=db, ab_test_id=ab_test_id)


@router.get("", response_model=list[ABTestDetailResponse])
def list_ab_tests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    """List all A/B test sessions, newest first."""
    return ab_test_controller.list_all(db=db, skip=skip, limit=limit)
