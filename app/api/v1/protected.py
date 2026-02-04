from fastapi import APIRouter, Depends
from app.core.security import get_api_key
from app.models import APIKey

router = APIRouter()

@router.get("/protected")
def protected_route(api_key: APIKey = Depends(get_api_key)):
    return {
        "message": "Access granted",
        "user_id": api_key.user_id
    }
