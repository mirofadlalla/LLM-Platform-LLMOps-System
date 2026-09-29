# app/api/controllers/prompt_controller.py
"""
Prompt Controller — bridges HTTP/API layer and PromptService.

Responsibilities:
- Receive validated request data.
- Call prompt_service methods.
- Translate domain exceptions into HTTPException.
- Shape the response dict returned to the router.

Rules:
- NO SQLAlchemy queries.
- NO Celery.
- NO prompt rendering / scoring.
"""

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import PromptNotFoundError, PromptVersionNotFoundError
from app.services.prompt_service import prompt_service

logger = logging.getLogger(__name__)


class PromptController:
    def create_prompt(
        self,
        db: Session,
        name: str,
        description: str | None,
        template: str,
    ) -> dict:
        prompt, version = prompt_service.create_prompt(
            db=db,
            name=name,
            description=description,
            template=template,
        )
        return {
            "prompt_id": prompt.id,
            "version": version.version,
        }

    def list_prompts(
        self,
        db: Session,
        skip: int,
        limit: int,
    ):
        return prompt_service.list_prompts(db=db, skip=skip, limit=limit)

    def create_prompt_version(
        self,
        db: Session,
        prompt_id: str,
        template: str,
    ) -> dict:
        version = prompt_service.create_new_version(
            db=db,
            prompt_id=prompt_id,
            template=template,
        )
        return {
            "prompt_id": prompt_id,
            "version": version.version,
            "template": version.template,
        }

    def list_prompt_versions(
        self,
        db: Session,
        prompt_id: str,
    ) -> dict:
        versions = prompt_service.list_versions(db=db, prompt_id=prompt_id)
        return {
            "prompt_id": prompt_id,
            "versions": versions,
        }

    def activate_prompt_version(
        self,
        db: Session,
        prompt_id: str,
        version_id: str,
    ) -> dict:
        try:
            version = prompt_service.activate_version(
                db=db,
                prompt_id=prompt_id,
                version_id=version_id,
            )
        except PromptVersionNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Prompt version not found") from exc

        return {
            "prompt_id": prompt_id,
            "activated_version_id": version.id,
            "version": version.version,
        }

    def diff_prompt_versions(
        self,
        db: Session,
        prompt_id: str,
        from_version_id: str,
        to_version_id: str,
    ) -> dict:
        try:
            diff = prompt_service.diff_versions(
                db=db,
                prompt_id=prompt_id,
                from_version_id=from_version_id,
                to_version_id=to_version_id,
            )
        except PromptVersionNotFoundError as exc:
            raise HTTPException(
                status_code=404,
                detail="One or both prompt versions not found",
            ) from exc

        return {
            "prompt_id": prompt_id,
            "from_version_id": from_version_id,
            "to_version_id": to_version_id,
            "diff": diff,
        }


prompt_controller = PromptController()
