# app/services/auth_service.py
"""
Auth Service — business logic for registration, login, and API key management.

Rules:
- Raises domain exceptions, NEVER HTTPException.
- No db.query() — delegates all DB work to user_repository.
- No JWT / crypto details — delegates to app.core.auth helpers.
"""

import logging

from sqlalchemy.orm import Session

from app.core.auth import (
    create_access_token,
    generate_api_key,
    hash_password,
    verify_password,
)
from app.core.exceptions import (
    APIKeyNotFoundError,
    DuplicateEmailError,
    DuplicateUsernameError,
    InvalidCredentialsError,
)
from app.models.user import APIKey, User
from app.repositories.user_repository import user_repository

logger = logging.getLogger(__name__)


class AuthService:

    # ── Registration ──────────────────────────────────────────────────────────

    def register(
        self,
        db: Session,
        username: str,
        email: str,
        password: str,
    ) -> User:
        if user_repository.get_by_username(db, username):
            raise DuplicateUsernameError(f"Username {username!r} is already taken")

        if user_repository.get_by_email(db, email):
            raise DuplicateEmailError(f"Email {email!r} is already registered")

        user = user_repository.create_user(
            db=db,
            username=username,
            email=email,
            password_hash=hash_password(password),
        )
        logger.info(f"Registered new user: id={user.id} username={username!r}")
        return user

    # ── Login ─────────────────────────────────────────────────────────────────

    def login(
        self,
        db: Session,
        username: str,
        password: str,
    ) -> tuple[User, str]:
        """
        Authenticate a user and return (user, access_token).
        Raises InvalidCredentialsError on any failure.
        """
        user = user_repository.get_by_username(db, username)

        if user is None or not verify_password(password, user.password_hash):
            # Deliberately vague — don't reveal whether username exists
            raise InvalidCredentialsError("Incorrect username or password")

        token = create_access_token(subject=str(user.id))
        logger.info(f"Login successful: user_id={user.id}")
        return user, token

    # ── API Key management ────────────────────────────────────────────────────

    def create_api_key(
        self,
        db: Session,
        user_id: str,
        name: str | None = None,
    ) -> APIKey:
        raw_key = generate_api_key()
        api_key = user_repository.create_api_key(
            db=db,
            user_id=user_id,
            key=raw_key,
            name=name,
        )
        logger.info(f"Created APIKey id={api_key.id} for user_id={user_id}")
        return api_key

    def list_api_keys(self, db: Session, user_id: str) -> list[APIKey]:
        return user_repository.list_api_keys_for_user(db=db, user_id=user_id)

    def revoke_api_key(
        self,
        db: Session,
        user_id: str,
        api_key_id: str,
    ) -> APIKey:
        api_key = user_repository.get_api_key_by_id(
            db=db, api_key_id=api_key_id, user_id=user_id
        )
        if api_key is None:
            raise APIKeyNotFoundError(
                f"API key {api_key_id!r} not found for this user"
            )
        return user_repository.revoke_api_key(db=db, api_key=api_key)


auth_service = AuthService()
