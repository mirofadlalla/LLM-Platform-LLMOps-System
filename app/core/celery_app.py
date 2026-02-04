from celery import Celery

CeleryApp = Celery(
    "llmops",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1"
)

# Configure Celery
CeleryApp.conf.update(
    task_serializer="pickle",
    accept_content=["pickle", "json"],
    result_serializer="pickle",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.services.run_task.run_prompt_task": {"queue": "llm_tasks_queue"},
    },
    task_track_started=True,
)

# Auto-discover tasks from app modules
CeleryApp.autodiscover_tasks(["app.services"])

# Explicitly import tasks to ensure registration
from app.services import run_task  # noqa: F401

# Export with lowercase name for imports
celery_app = CeleryApp