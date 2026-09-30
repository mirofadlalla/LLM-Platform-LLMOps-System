# app/api/controllers/auth_controller.py
"""
Auth Controller — bridges HTTP/API layer and AuthService.

Translates domain exceptions into HTTPException.
Never contains hashing, JWT, or DB query logic.
"""

import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import (
    APIKeyNotFoundError,
    DuplicateEmailError,
    DuplicateUsernameError,
    InvalidCredentialsError,
)
from app.models.user import User
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)


class AuthController:

    # ── Registration ──────────────────────────────────────────────────────────

    def register(
        self,
        db: Session,
        username: str,
        email: str,
        password: str,
    ) -> dict:
        try:
            user = auth_service.register(
                db=db, username=username, email=email, password=password
            )
        except DuplicateUsernameError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
        except DuplicateEmailError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

        return {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at,
        }

    # ── Login ─────────────────────────────────────────────────────────────────

    def login(self, db: Session, username: str, password: str) -> dict:
        try:
            user, token = auth_service.login(
                db=db, username=username, password=password
            )
        except InvalidCredentialsError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.id,
            "username": user.username,
        }

    # ── API Key management ────────────────────────────────────────────────────

    def create_api_key(
        self,
        db: Session,
        current_user: User,
        name: str | None,
    ) -> dict:
        api_key = auth_service.create_api_key(
            db=db, user_id=current_user.id, name=name
        )
        return {
            "api_key_id": api_key.id,
            "name": api_key.name,
            "key": api_key.key,      # raw — shown only this once
            "created_at": api_key.created_at,
        }

    def list_api_keys(self, db: Session, current_user: User) -> list[dict]:
        keys = auth_service.list_api_keys(db=db, user_id=current_user.id)
        return [
            {
                "api_key_id": k.id,
                "name": k.name,
                "is_active": k.is_active,
                "created_at": k.created_at,
            }
            for k in keys
        ]

    def revoke_api_key(
        self,
        db: Session,
        current_user: User,
        api_key_id: str,
    ) -> dict:
        try:
            api_key = auth_service.revoke_api_key(
                db=db, user_id=current_user.id, api_key_id=api_key_id
            )
        except APIKeyNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

        return {"api_key_id": api_key.id, "revoked": True}


auth_controller = AuthController()
