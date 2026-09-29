# app/repositories/prompt_repository.py
"""
Prompt Repository — all SQLAlchemy operations for Prompt and PromptVersion.

Rules:
- Only raw db.query / db.add / db.flush / db.commit / db.update operations here.
- No business logic, no HTTPException, no Celery, no LLM calls.
"""

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.prompt import Prompt, PromptVersion

logger = logging.getLogger(__name__)


class PromptRepository:
    # ------------------------------------------------------------------ #
    # Prompt CRUD                                                          #
    # ------------------------------------------------------------------ #

    def create_prompt(
        self,
        db: Session,
        name: str,
        description: Optional[str],
    ) -> Prompt:
        prompt = Prompt(name=name, description=description)
        db.add(prompt)
        db.flush()  # populate prompt.id without committing
        logger.debug(f"Flushed new Prompt id={prompt.id}")
        return prompt

    def get_prompt_by_id(self, db: Session, prompt_id: str) -> Optional[Prompt]:
        return db.query(Prompt) \
                 .filter(Prompt.id == prompt_id).first()

    def list_prompts(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Prompt]:
        return (
            db.query(Prompt)
            .order_by(Prompt.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    # ------------------------------------------------------------------ #
    # PromptVersion CRUD                                                   #
    # ------------------------------------------------------------------ #

    def create_version(
        self,
        db: Session,
        prompt_id: str,
        version_label: str,
        template: str,
        is_active: bool = False,
    ) -> PromptVersion:
        version = PromptVersion(
            prompt_id=prompt_id,
            version=version_label,
            template=template,
            is_active=is_active,
        )
        db.add(version)
        db.flush()
        logger.debug(f"Flushed new PromptVersion id={version.id} label={version_label}")
        return version

    def count_versions(self, db: Session, prompt_id: str) -> int:
        return (
            db.query(PromptVersion)
            .filter(PromptVersion.prompt_id == prompt_id)
            .count()
        )

    def get_version_by_id(
        self,
        db: Session,
        version_id: str,
        prompt_id: Optional[str] = None,
    ) -> Optional[PromptVersion]:
        q = db.query(PromptVersion).filter(PromptVersion.id == version_id)
        if prompt_id:
            q = q.filter(PromptVersion.prompt_id == prompt_id)
        return q.first()

    def list_versions(
        self,
        db: Session,
        prompt_id: str,
    ) -> List[PromptVersion]:
        return (
            db.query(PromptVersion)
            .filter(PromptVersion.prompt_id == prompt_id)
            .order_by(PromptVersion.created_at.desc())
            .all()
        )

    def deactivate_all_versions(self, db: Session, prompt_id: str) -> None:
        db.query(PromptVersion).filter(
            PromptVersion.prompt_id == prompt_id
        ).update({"is_active": False})

    def activate_version(self, db: Session, version: PromptVersion) -> None:
        version.is_active = True

    def commit(self, db: Session) -> None:
        db.commit()


prompt_repository = PromptRepository()
