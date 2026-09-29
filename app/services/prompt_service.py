# app/services/prompt_service.py
"""
Prompt Service — business / application logic for prompt management.

Rules:
- Orchestrates repositories.
- Raises domain exceptions (not HTTPException).
- Does NOT import FastAPI.
- Controls transaction boundaries (single commit per business operation).
"""

import logging
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import PromptVersionNotFoundError
from app.models.prompt import Prompt, PromptVersion
from app.repositories.prompt_repository import prompt_repository
from app.services.prompt_diff import diff_templates

logger = logging.getLogger(__name__)


class PromptService:
    # ------------------------------------------------------------------ #
    # Prompt Creation                                                       #
    # ------------------------------------------------------------------ #

    def create_prompt(
        self,
        db: Session,
        name: str,
        description: str | None,
        template: str,
    ) -> Tuple[Prompt, PromptVersion]:
        """
        Create a new prompt with its initial version (v1) atomically.

        Uses db.flush() between the two inserts so both share a single
        db.commit() at the end.
        """
        logger.info(f"Creating prompt name={name!r}")

        prompt = prompt_repository.create_prompt(
            db=db,
            name=name,
            description=description,
        )

        version = prompt_repository.create_version(
            db=db,
            prompt_id=prompt.id,
            version_label="v1",
            template=template,
            is_active=False,
        )

        prompt_repository.commit(db)
        logger.info(f"Prompt created id={prompt.id}, version={version.version}")
        return prompt, version

    # ------------------------------------------------------------------ #
    # Prompt Listing                                                        #
    # ------------------------------------------------------------------ #

    def list_prompts(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Prompt]:
        return prompt_repository.list_prompts(db=db, skip=skip, limit=limit)

    # ------------------------------------------------------------------ #
    # Version Management                                                    #
    # ------------------------------------------------------------------ #

    def create_new_version(
        self,
        db: Session,
        prompt_id: str,
        template: str,
    ) -> PromptVersion:
        """
        Append a new version (vN+1) to an existing prompt.
        """
        count = prompt_repository.count_versions(db=db, prompt_id=prompt_id)
        version_label = f"v{count + 1}"

        version = prompt_repository.create_version(
            db=db,
            prompt_id=prompt_id,
            version_label=version_label,
            template=template,
            is_active=False,
        )
        prompt_repository.commit(db)
        logger.info(f"Created new version {version_label} for prompt_id={prompt_id}")
        return version

    def list_versions(self, db: Session, prompt_id: str) -> List[PromptVersion]:
        return prompt_repository.list_versions(db=db, prompt_id=prompt_id)

    # ------------------------------------------------------------------ #
    # Version Activation                                                    #
    # ------------------------------------------------------------------ #

    def activate_version(
        self,
        db: Session,
        prompt_id: str,
        version_id: str,
    ) -> PromptVersion:
        """
        Atomically deactivate all versions and activate the chosen one.
        Raises PromptVersionNotFoundError if the version does not exist.
        """
        version = prompt_repository.get_version_by_id(
            db=db,
            version_id=version_id,
            prompt_id=prompt_id,
        )
        if not version:
            raise PromptVersionNotFoundError(
                f"PromptVersion id={version_id} not found for prompt_id={prompt_id}"
            )

        prompt_repository.deactivate_all_versions(db=db, prompt_id=prompt_id)
        prompt_repository.activate_version(db=db, version=version)
        prompt_repository.commit(db)
        logger.info(f"Activated version id={version_id} for prompt_id={prompt_id}")
        return version

    # ------------------------------------------------------------------ #
    # Diff                                                                  #
    # ------------------------------------------------------------------ #

    def diff_versions(
        self,
        db: Session,
        prompt_id: str,
        from_version_id: str,
        to_version_id: str,
    ) -> List[str]:
        """
        Return a unified-diff list between two prompt version templates.
        Raises PromptVersionNotFoundError if either version is missing.
        """
        from_version = prompt_repository.get_version_by_id(
            db=db, version_id=from_version_id, prompt_id=prompt_id
        )
        to_version = prompt_repository.get_version_by_id(
            db=db, version_id=to_version_id, prompt_id=prompt_id
        )

        if not from_version or not to_version:
            raise PromptVersionNotFoundError(
                "One or both prompt versions not found"
            )

        return diff_templates(from_version.template, to_version.template)


prompt_service = PromptService()
