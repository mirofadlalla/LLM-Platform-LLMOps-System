"""
tests/conftest.py
-----------------
Shared pytest fixtures for the LLMOps test suite.

Migration tests require a live PostgreSQL instance.  The connection URL is
read from the environment variable TEST_DATABASE_URL.  In CI this is
supplied by the GitHub Actions postgres service container; locally you can
export the variable or use the default (points at localhost).

    export TEST_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/llmops_test
"""

import os
import pytest
import sqlalchemy as sa
from sqlalchemy import text


# ---------------------------------------------------------------------------
# Database URL helpers
# ---------------------------------------------------------------------------

DEFAULT_TEST_DB_URL = (
    "postgresql+psycopg2://postgres:postgres@localhost:5432/llmops_test"
)


def _test_db_url() -> str:
    """Return the test database URL, preferring the env var."""
    return os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DB_URL)


# ---------------------------------------------------------------------------
# Session-scoped engine fixture
# Used by test_migrations.py to run Alembic against a real Postgres instance.
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def test_db_url() -> str:
    """Provide the test database connection URL for the whole session."""
    return _test_db_url()


@pytest.fixture(scope="session")
def db_engine(test_db_url: str):
    """
    Create a SQLAlchemy engine connected to the test database.

    The fixture ensures the *llmops_test* database exists (creates it if not)
    and yields the engine.  The engine is disposed after the session ends.
    """
    # Connect to the default postgres DB to create the test DB if needed.
    base_url = test_db_url.rsplit("/", 1)[0] + "/postgres"
    db_name = test_db_url.rsplit("/", 1)[-1].split("?")[0]

    admin_engine = sa.create_engine(base_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :db"),
            {"db": db_name},
        ).fetchone()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    admin_engine.dispose()

    engine = sa.create_engine(test_db_url)
    yield engine
    engine.dispose()
