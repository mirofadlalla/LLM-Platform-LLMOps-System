# app/api/routes/auth_routes.py
"""
Auth Routes — registration, login, and API key management.

Public endpoints (no auth required):
  POST /auth/register    → create account
  POST /auth/login       → get JWT

JWT-protected endpoints (Authorization: Bearer <JWT>):
  POST   /auth/api-keys          → create a new API key
  GET    /auth/api-keys          → list this user's API keys
  DELETE /auth/api-keys/{id}     → revoke an API key

Workflow the frontend should follow:
  1. POST /auth/register  (once)
  2. POST /auth/login     → receives JWT + user info
  3. POST /auth/api-keys  → receives raw API key (store it — shown only once)
  4. All other platform endpoints use  Authorization: Bearer <API-KEY>
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.controllers.auth_controller import auth_controller
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import (
    APIKeyListItem,
    APIKeyResponse,
    CreateAPIKeyRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    RevokeAPIKeyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Public endpoints ──────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Create a new user account."""
    return auth_controller.register(
        db=db,
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate with username + password.
    Returns a JWT access token — use it to manage API keys.
    """
    return auth_controller.login(
        db=db,
        username=payload.username,
        password=payload.password,
    )


# ── JWT-protected: API key management ────────────────────────────────────────

@router.post("/api-keys", response_model=APIKeyResponse, status_code=201)
def create_api_key(
    payload: CreateAPIKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new API key for the authenticated user.
    The raw key value is returned exactly once — save it immediately.
    """
    return auth_controller.create_api_key(
        db=db,
        current_user=current_user,
        name=payload.name,
    )


@router.get("/api-keys", response_model=list[APIKeyListItem])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all API keys belonging to the authenticated user (key values masked)."""
    return auth_controller.list_api_keys(db=db, current_user=current_user)


@router.delete("/api-keys/{api_key_id}", response_model=RevokeAPIKeyResponse)
def revoke_api_key(
    api_key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Revoke (deactivate) one of the authenticated user's API keys.
    The key stops working immediately for all platform calls.
    """
    return auth_controller.revoke_api_key(
        db=db,
        current_user=current_user,
        api_key_id=api_key_id,
    )
