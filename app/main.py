from fastapi import FastAPI
from app.api.v1.health import router as health_router
from app.api.v1.run import router as run_router
from app.core.middleware import request_id_middleware
from app.api.v1.protected import router as protected_router

app = FastAPI(
    title="LLMOps Platform",
    version="0.1.0"
)

app.middleware("http")(request_id_middleware)

# Include Routers

# Health Check Router
app.include_router(
    health_router,
      prefix="/api/v1",
      tags=["health"]
)

# Run Prompt Router
app.include_router(
    run_router,
    prefix="/api/v1",
    tags=["run"]
)

app.include_router(
    protected_router,
    prefix="/api/v1",
    tags=["protected"]
)
