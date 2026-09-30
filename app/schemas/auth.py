# app/schemas/auth.py
"""
Pydantic schemas for authentication and API key management.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Registration ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterResponse(BaseModel):
    user_id: str
    username: str
    email: str
    created_at: datetime


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


# ── API Key management ────────────────────────────────────────────────────────

class CreateAPIKeyRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100, description="Optional label, e.g. 'production'")


class APIKeyResponse(BaseModel):
    """Returned once on creation — includes the raw key (never shown again)."""
    api_key_id: str
    name: Optional[str]
    key: str                  # raw secret — show once, store nowhere on server
    created_at: datetime


class APIKeyListItem(BaseModel):
    """Safe list item — key value is masked."""
    api_key_id: str
    name: Optional[str]
    is_active: bool
    created_at: datetime


class RevokeAPIKeyResponse(BaseModel):
    api_key_id: str
    revoked: bool
