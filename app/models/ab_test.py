# app/models/ab_test.py
"""
ABTest — stores one pairwise prompt evaluation session.

Lifecycle:
  1. POST /ab-tests  →  creates the record, runs both LLM calls, stores answers.
  2. POST /ab-tests/{id}/vote  →  user votes (a | b | tie) and adds optional feedback.
  3. GET  /ab-tests  →  list all sessions.
  4. GET  /ab-tests/{id}  →  retrieve a single session.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from .base import Base, uuid_pk


class ABTest(Base):
    __tablename__ = "ab_tests"

    id = uuid_pk()

    # ── Query ─────────────────────────────────────────────────────────────────
    # The raw user query / variables as a JSON string
    # (stored verbatim so we can replay it if needed)
    query = Column(Text, nullable=False)

    # ── Prompt versions under test ────────────────────────────────────────────
    version_a_id = Column(String, nullable=False)   # FK kept soft to avoid cascade issues
    version_b_id = Column(String, nullable=False)

    # ── LLM provider + model used for both calls ──────────────────────────────
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)

    # ── Generated answers ─────────────────────────────────────────────────────
    answer_a = Column(Text, nullable=False)
    answer_b = Column(Text, nullable=False)

    # ── User vote (filled in by the /vote endpoint) ───────────────────────────
    # Allowed values: "a" | "b" | "tie" | NULL (not yet voted)
    winner = Column(String, nullable=True)
    feedback = Column(Text, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow)
    voted_at = Column(DateTime, nullable=True)
