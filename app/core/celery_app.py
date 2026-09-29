# app/core/celery_app.py
from celery import Celery

from app.core.config import settings

CeleryApp = Celery(
    "llmops",
    broker=settings.redis_broker_url,
    backend=settings.redis_backend_url,
)

# Export with lowercase name for imports
celery_app = CeleryApp

# Configure Celery
CeleryApp.conf.update(
    task_serializer="pickle",
    accept_content=["pickle", "json"],
    result_serializer="pickle",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.services.run_task.run_prompt_task": {"queue": "llm_tasks_queue"},
        "app.services.run_experiment.run_experiment": {"queue": "llm_tasks_queue"},
    },
    task_track_started=True,
)

# Auto-discover tasks from app modules
CeleryApp.autodiscover_tasks(["app.services"])

# Explicitly import tasks to ensure registration
from app.services import run_task  # noqa: F401
