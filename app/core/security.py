# app/core/security.py
"""
FastAPI security dependencies.

get_api_key      — validates Bearer <llmops_xxx> against the api_keys table.
                   Used by all existing platform endpoints (unchanged).

get_current_user — validates Bearer <JWT> and returns the User object.
                   Used by auth-management endpoints (create/list/revoke keys).
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import APIKey
from app.models.user import User

security = HTTPBearer(auto_error=False)


# ── Existing: API key auth (unchanged) ───────────────────────────────────────

def get_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> APIKey:
    """
    Validate a raw API key passed as   Authorization: Bearer llmops_xxx
    Returns the APIKey ORM object on success.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth scheme",
        )

    api_key = (
        db.query(APIKey)
        .filter(APIKey.key == credentials.credentials)
        .filter(APIKey.is_active == True)
        .first()
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key",
        )

    return api_key


# ── New: JWT auth (for auth-management endpoints) ────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Validate a JWT passed as   Authorization: Bearer <token>
    Returns the User ORM object on success.

    Used by endpoints that manage the user's own account/keys.
    The frontend stores the JWT after login and sends it here.
    """
    from app.core.auth import decode_access_token  # lazy to avoid circular

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        user_id = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user
