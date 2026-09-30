from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.middleware import request_id_middleware

# Initialise centralised logging before anything else
setup_logging()

from app.api.v1.health import router as health_router
from app.api.v1.protected import router as protected_router
from app.api.routes.prompt_routes import router as prompt_router
from app.api.routes.run_routes import router as run_router
from app.api.routes.evaluation_routes import router as evaluation_router
from app.api.routes.experiment_routes import router as experiment_router
from app.api.routes.models_routes import router as models_router
from app.api.routes.ab_test_routes import router as ab_test_router
from app.api.routes.auth_routes import router as auth_router            # ← NEW

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
)

app.middleware("http")(request_id_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health & Auth ────────────────────────────────────────────────────────────
app.include_router(health_router, prefix="/api/v1", tags=["health"])
app.include_router(protected_router, prefix="/api/v1", tags=["protected"])
app.include_router(auth_router, prefix="/api/v1")                   # ← NEW

# ── Domain Routers ───────────────────────────────────────────────────────────
app.include_router(prompt_router, prefix="/api/v1")
app.include_router(run_router, prefix="/api/v1")
app.include_router(evaluation_router, prefix="/api/v1")
app.include_router(experiment_router, prefix="/api/v1")
app.include_router(models_router, prefix="/api/v1")
app.include_router(ab_test_router, prefix="/api/v1")