from fastapi import APIRouter
from app.schemas.run import RunRequest, RunResponse
import time

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}
