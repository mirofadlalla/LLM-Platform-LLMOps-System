# app/services/ab_test_service.py
"""
ABTest Service — business logic for pairwise prompt evaluation.

Flow for starting a test:
  1. Fetch PromptVersion A and B from the DB.
  2. Render both templates against the user-supplied variables.
  3. Call call_llm() twice with the same provider/model.
  4. Persist the ABTest record with both answers.

Flow for voting:
  1. Fetch the ABTest record.
  2. Reject if already voted.
  3. Persist winner + feedback.

Rules (same as every other service in this codebase):
- Raises domain exceptions, NEVER HTTPException.
- No db.query() — delegates all persistence to the repository.
"""

import json
import logging

from sqlalchemy.orm import Session

from app.core.exceptions import (
    ABTestAlreadyVotedError,
    ABTestNotFoundError,
    PromptVersionNotFoundError,
)
from app.llm.runner import call_llm
from app.models.ab_test import ABTest
from app.repositories.ab_test_repository import ab_test_repository
from app.repositories.prompt_repository import prompt_repository
from app.services.prompt_renderer import render_prompt

logger = logging.getLogger(__name__)


class ABTestService:

    def run_ab_test(
        self,
        db: Session,
        version_a_id: str,
        version_b_id: str,
        variables: dict,
        provider: str,
        model: str,
    ) -> ABTest:
        """
        Render both prompt versions, call the LLM for each, and persist
        the result in a single ABTest record.
        """
        # 1. Fetch both prompt versions
        version_a = prompt_repository.get_version_by_id(db=db, version_id=version_a_id)
        if version_a is None:
            raise PromptVersionNotFoundError(
                f"Prompt version A not found: {version_a_id}"
            )

        version_b = prompt_repository.get_version_by_id(db=db, version_id=version_b_id)
        if version_b is None:
            raise PromptVersionNotFoundError(
                f"Prompt version B not found: {version_b_id}"
            )

        # 2. Render both templates
        rendered_a = render_prompt(version_a.template, variables)
        rendered_b = render_prompt(version_b.template, variables)

        # 3. Call the LLM for version A
        logger.info(
            f"ABTest: calling LLM for version_a={version_a_id!r} "
            f"provider={provider!r} model={model!r}"
        )
        answer_a, _, _ = call_llm(
            prompt=rendered_a,
            provider_id=provider,
            model_slug=model,
        )

        # 4. Call the LLM for version B
        logger.info(f"ABTest: calling LLM for version_b={version_b_id!r}")
        answer_b, _, _ = call_llm(
            prompt=rendered_b,
            provider_id=provider,
            model_slug=model,
        )

        # 5. Store the query as JSON so it can be replayed
        query_str = json.dumps(variables, ensure_ascii=False)

        # 6. Persist
        record = ab_test_repository.create(
            db=db,
            query=query_str,
            version_a_id=version_a_id,
            version_b_id=version_b_id,
            provider=provider,
            model=model,
            answer_a=answer_a,
            answer_b=answer_b,
        )

        logger.info(f"ABTest created: id={record.id}")
        return record

    def vote(
        self,
        db: Session,
        ab_test_id: str,
        winner: str,
        feedback: str | None,
    ) -> ABTest:
        """Record the user's vote on an existing A/B test session."""
        record = ab_test_repository.get_by_id(db=db, ab_test_id=ab_test_id)
        if record is None:
            raise ABTestNotFoundError(f"ABTest not found: {ab_test_id}")

        if record.winner is not None:
            raise ABTestAlreadyVotedError(
                f"ABTest {ab_test_id} has already been voted on (winner={record.winner!r})"
            )

        return ab_test_repository.record_vote(
            db=db,
            record=record,
            winner=winner,
            feedback=feedback,
        )

    def get_by_id(self, db: Session, ab_test_id: str) -> ABTest:
        """Fetch a single ABTest or raise ABTestNotFoundError."""
        record = ab_test_repository.get_by_id(db=db, ab_test_id=ab_test_id)
        if record is None:
            raise ABTestNotFoundError(f"ABTest not found: {ab_test_id}")
        return record

    def list_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ABTest]:
        return ab_test_repository.list_all(db=db, skip=skip, limit=limit)


ab_test_service = ABTestService()
