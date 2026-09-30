# app/repositories/user_repository.py
"""
User + APIKey Repository — all SQLAlchemy operations.

Rules (same as every other repository):
- Only raw db operations here.
- No business logic, no HTTPException, no hashing.
"""

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.user import APIKey, User

logger = logging.getLogger(__name__)


class UserRepository:

    # ── User ──────────────────────────────────────────────────────────────────

    def create_user(
        self,
        db: Session,
        username: str,
        email: str,
        password_hash: str,
    ) -> User:
        user = User(username=username, email=email, password_hash=password_hash)
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.debug(f"Created User id={user.id} username={username!r}")
        return user

    def get_by_id(self, db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    # ── APIKey ────────────────────────────────────────────────────────────────

    def create_api_key(
        self,
        db: Session,
        user_id: str,
        key: str,
        name: Optional[str] = None,
    ) -> APIKey:
        api_key = APIKey(user_id=user_id, key=key, name=name)
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        logger.debug(f"Created APIKey id={api_key.id} user_id={user_id}")
        return api_key

    def list_api_keys_for_user(self, db: Session, user_id: str) -> List[APIKey]:
        return (
            db.query(APIKey)
            .filter(APIKey.user_id == user_id)
            .order_by(APIKey.created_at.desc())
            .all()
        )

    def get_api_key_by_id(
        self,
        db: Session,
        api_key_id: str,
        user_id: str,
    ) -> Optional[APIKey]:
        """Scoped to user_id so a user cannot revoke another user's key."""
        return (
            db.query(APIKey)
            .filter(APIKey.id == api_key_id, APIKey.user_id == user_id)
            .first()
        )

    def revoke_api_key(self, db: Session, api_key: APIKey) -> APIKey:
        api_key.is_active = False
        db.commit()
        db.refresh(api_key)
        logger.debug(f"Revoked APIKey id={api_key.id}")
        return api_key


user_repository = UserRepository()
