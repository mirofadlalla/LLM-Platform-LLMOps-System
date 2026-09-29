# app/core/config.py
from typing import List

from pydantic import computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── PostgreSQL ────────────────────────────────────────────────────────────
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "llmops"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_broker_db: int = 0
    redis_backend_db: int = 1
    redis_connect_timeout: int = 2

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_requests: int = 60
    rate_limit_window: int = 60

    # ── External API Keys ─────────────────────────────────────────────────────
    huggingface_api_key: str = ""
    groq_api_key: str = ""          # ← NEW
    wandb_api_key: str = ""
    api_secret_key: str = ""

    # ── LLM Provider / Model Defaults ─────────────────────────────────────────
    # These determine which provider+model is used when none is specified
    # explicitly in a RunRequest or by the evaluator/experiment runner.
    default_llm_provider: str = "groq"          # ← NEW
    default_llm_model: str = "gpt-oss-20b"      # ← NEW (registry slug)

    # ── LLM Generation Defaults ───────────────────────────────────────────────
    llm_max_new_tokens: int = 150
    llm_default_temperature: float = 0.2
    llm_cost_per_token: float = 0.00001

    # ── Celery Task Retry Policy ──────────────────────────────────────────────
    celery_task_max_retries: int = 3
    celery_task_retry_countdown: int = 5

    # ── Logging ───────────────────────────────────────────────────────────────
    log_file: str = "app.log"
    log_level: str = "INFO"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: List[str] = ["*"]

    # ── Application ───────────────────────────────────────────────────────────
    app_title: str = "LLMOps Platform"
    app_version: str = "0.1.0"

    class Config:
        env_file = ".env"
        extra = "ignore"

    # ── Computed properties ───────────────────────────────────────────────────

    @computed_field  # type: ignore[misc]
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field  # type: ignore[misc]
    @property
    def redis_broker_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_broker_db}"

    @computed_field  # type: ignore[misc]
    @property
    def redis_backend_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_backend_db}"

    @computed_field  # type: ignore[misc]
    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}"


settings = Settings()