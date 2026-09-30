# app/repositories/ab_test_repository.py
"""
ABTest Repository — all SQLAlchemy operations for the ABTest table.

Rules (same as every other repository in this codebase):
- Only raw db operations here.
- No business logic, no HTTPException, no LLM calls.
"""

import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.ab_test import ABTest

logger = logging.getLogger(__name__)


class ABTestRepository:

    def create(
        self,
        db: Session,
        *,
        query: str,
        version_a_id: str,
        version_b_id: str,
        provider: str,
        model: str,
        answer_a: str,
        answer_b: str,
    ) -> ABTest:
        record = ABTest(
            query=query,
            version_a_id=version_a_id,
            version_b_id=version_b_id,
            provider=provider,
            model=model,
            answer_a=answer_a,
            answer_b=answer_b,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.debug(f"Created ABTest id={record.id}")
        return record

    def get_by_id(self, db: Session, ab_test_id: str) -> Optional[ABTest]:
        return db.query(ABTest).filter(ABTest.id == ab_test_id).first()

    def list_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ABTest]:
        return (
            db.query(ABTest)
            .order_by(ABTest.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def record_vote(
        self,
        db: Session,
        record: ABTest,
        winner: str,
        feedback: Optional[str],
    ) -> ABTest:
        record.winner = winner
        record.feedback = feedback
        record.voted_at = datetime.utcnow()
        db.commit()
        db.refresh(record)
        logger.debug(f"Recorded vote on ABTest id={record.id} winner={winner!r}")
        return record


ab_test_repository = ABTestRepository()
