# app/api/controllers/ab_test_controller.py
"""
ABTest Controller — bridges HTTP/API layer and ABTestService.

Responsibilities:
- Receive validated request data.
- Call ab_test_service methods.
- Translate domain exceptions into HTTPException.
- Shape response dicts returned to the router.

Rules (same as every other controller):
- NO SQLAlchemy queries.
- NO LLM calls.
- NO business logic.
"""

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import (
    ABTestAlreadyVotedError,
    ABTestNotFoundError,
    PromptVersionNotFoundError,
)
from app.services.ab_test_service import ab_test_service

logger = logging.getLogger(__name__)


class ABTestController:

    def run_ab_test(
        self,
        db: Session,
        version_a_id: str,
        version_b_id: str,
        variables: dict,
        provider: str,
        model: str,
    ) -> dict:
        try:
            record = ab_test_service.run_ab_test(
                db=db,
                version_a_id=version_a_id,
                version_b_id=version_b_id,
                variables=variables,
                provider=provider,
                model=model,
            )
        except PromptVersionNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        return {
            "ab_test_id": record.id,
            "version_a_id": record.version_a_id,
            "version_b_id": record.version_b_id,
            "answer_a": record.answer_a,
            "answer_b": record.answer_b,
            "provider": record.provider,
            "model": record.model,
            "created_at": record.created_at,
        }

    def vote(
        self,
        db: Session,
        ab_test_id: str,
        winner: str,
        feedback: str | None,
    ) -> dict:
        try:
            record = ab_test_service.vote(
                db=db,
                ab_test_id=ab_test_id,
                winner=winner,
                feedback=feedback,
            )
        except ABTestNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ABTestAlreadyVotedError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

        return {
            "ab_test_id": record.id,
            "winner": record.winner,
            "feedback": record.feedback,
            "voted_at": record.voted_at,
        }

    def get_by_id(self, db: Session, ab_test_id: str) -> dict:
        try:
            record = ab_test_service.get_by_id(db=db, ab_test_id=ab_test_id)
        except ABTestNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        return self._to_detail(record)

    def list_all(self, db: Session, skip: int, limit: int) -> list[dict]:
        records = ab_test_service.list_all(db=db, skip=skip, limit=limit)
        return [self._to_detail(r) for r in records]

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _to_detail(record) -> dict:
        return {
            "ab_test_id": record.id,
            "query": record.query,
            "version_a_id": record.version_a_id,
            "version_b_id": record.version_b_id,
            "answer_a": record.answer_a,
            "answer_b": record.answer_b,
            "provider": record.provider,
            "model": record.model,
            "winner": record.winner,
            "feedback": record.feedback,
            "created_at": record.created_at,
            "voted_at": record.voted_at,
        }


ab_test_controller = ABTestController()
