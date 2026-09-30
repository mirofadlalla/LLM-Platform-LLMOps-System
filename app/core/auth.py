# app/core/auth.py
"""
Password hashing and JWT utilities.

All crypto logic lives here; nothing else in the app touches passlib or jose.
"""

import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings

import bcrypt

# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        hashed_bytes = hashed.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(subject: str) -> str:
    """
    Create a signed JWT whose `sub` claim is the user ID.
    Expiry is controlled by settings.jwt_access_token_expire_minutes.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    """
    Decode and validate a JWT.  Returns the `sub` (user ID) claim.
    Raises JWTError on any validation failure (expired, bad signature, etc.).
    """
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
    user_id: str = payload.get("sub")
    if user_id is None:
        raise JWTError("Token is missing 'sub' claim")
    return user_id


# ── API key generator ─────────────────────────────────────────────────────────

def generate_api_key() -> str:
    """Generate a cryptographically random API key prefixed with 'llmops_'."""
    return f"llmops_{secrets.token_urlsafe(32)}"
