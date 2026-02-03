from fastapi import FastAPI
from app.api.v1.health import router as health_router

app = FastAPI(
    title="LLMOps Platform",
    version="0.1.0"
)

app.include_router(health_router, prefix="/api/v1")
