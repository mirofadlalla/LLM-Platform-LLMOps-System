from fastapi import APIRouter
from app.schemas.run import RunRequest, RunResponse
import time

router = APIRouter()

@router.get("/health")
def health_check():
    """
    Health check endpoint to verify that the API is running.
    """
    return {"status": "ok", "timestamp": int(time.time())}
