# app/schemas/ab_test.py
"""
Pydantic schemas for the A/B Testing feature.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


# ── Request schemas ───────────────────────────────────────────────────────────

class ABTestRunRequest(BaseModel):
    """
    Start an A/B test: send the same query to two prompt versions.

    variables is a dict of template variables, identical to RunRequest.
    provider / model select which LLM to use for both calls.
    """
    version_a_id: str
    version_b_id: str
    variables: Dict[str, Any]
    provider: str = "groq"
    model: str = "gpt-oss-20b"


class ABTestVoteRequest(BaseModel):
    """
    Cast a vote on an existing A/B test session.
    winner must be one of: "a", "b", "tie".
    """
    winner: str = Field(..., pattern="^(a|b|tie)$")
    feedback: Optional[str] = None


# ── Response schemas ──────────────────────────────────────────────────────────

class ABTestRunResponse(BaseModel):
    """Returned immediately after both LLM calls complete."""
    ab_test_id: str
    version_a_id: str
    version_b_id: str
    answer_a: str
    answer_b: str
    provider: str
    model: str
    created_at: datetime


class ABTestDetailResponse(BaseModel):
    """Full detail of an A/B test session including vote (if cast)."""
    ab_test_id: str
    query: str
    version_a_id: str
    version_b_id: str
    answer_a: str
    answer_b: str
    provider: str
    model: str
    winner: Optional[str]
    feedback: Optional[str]
    created_at: datetime
    voted_at: Optional[datetime]


class ABTestVoteResponse(BaseModel):
    """Returned after a vote is recorded."""
    ab_test_id: str
    winner: str
    feedback: Optional[str]
    voted_at: datetime
