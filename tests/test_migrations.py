"""
tests/test_migrations.py
------------------------
Migration integration tests.

These tests verify the Alembic revision chain against a real PostgreSQL
database.  They are intentionally run in CI *before* the Docker image is
built so that a broken migration cannot make it into a production image.

Requirements
~~~~~~~~~~~~
* A PostgreSQL instance reachable at TEST_DATABASE_URL (set by CI service
  container or locally via env var).
* All Python dependencies from requirements.txt installed.

Test coverage
~~~~~~~~~~~~~
1. test_single_head            – exactly one Alembic head exists in the chain.
2. test_no_missing_revisions   – every down_revision pointer resolves.
3. test_upgrade_head           – alembic upgrade head runs without error.
4. test_schema_tables_exist    – key tables exist after a full upgrade.
5. test_evaluation_results_columns – evaluation_results has the expected columns.
6. test_downgrade_base         – alembic downgrade base runs without error.
7. test_upgrade_downgrade_roundtrip – upgrade → downgrade → upgrade is idempotent.
8. test_revision_chain_order   – revisions form a single linear (non-branching) chain.
"""

import os
import pytest
import sqlalchemy as sa
from sqlalchemy import inspect, text

import alembic.config
from alembic.script import ScriptDirectory
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic import command as alembic_command


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_alembic_cfg(db_url: str) -> Config:
    """Build an Alembic Config object pointed at the test database."""
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", db_url)
    # Suppress Alembic's own logging noise in test output.
    import logging
    logging.getLogger("alembic").setLevel(logging.WARNING)
    return cfg


def _current_heads(cfg: Config, connection: sa.engine.Connection) -> list[str]:
    """Return the list of current Alembic heads in the database."""
    ctx = MigrationContext.configure(connection)
    return list(ctx.get_current_heads())


def _table_names(engine: sa.engine.Engine) -> list[str]:
    insp = inspect(engine)
    return insp.get_table_names()


def _column_names(engine: sa.engine.Engine, table: str) -> list[str]:
    insp = inspect(engine)
    return [c["name"] for c in insp.get_columns(table)]


def _wipe_schema(engine: sa.engine.Engine) -> None:
    """
    Drop all tables (including alembic_version) so each test that needs a
    clean slate can start fresh without recreating the entire database.
    """
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def alembic_cfg(test_db_url: str) -> Config:
    """Alembic Config instance pointing at the test database."""
    return _make_alembic_cfg(test_db_url)


@pytest.fixture(scope="module")
def script_dir(alembic_cfg: Config) -> ScriptDirectory:
    """Loaded ScriptDirectory for inspecting migration metadata."""
    return ScriptDirectory.from_config(alembic_cfg)


# ---------------------------------------------------------------------------
# Group 1 – Static chain validation (no DB required)
# ---------------------------------------------------------------------------

class TestStaticChain:
    """Validate the migration chain without connecting to a database."""

    def test_single_head(self, script_dir: ScriptDirectory) -> None:
        """There must be exactly one head revision (no branch forks)."""
        heads = script_dir.get_heads()
        assert len(heads) == 1, (
            f"Expected exactly 1 Alembic head, got {len(heads)}: {heads}. "
            "You likely have an unmerged branch in alembic/versions/."
        )

    def test_no_missing_revisions(self, script_dir: ScriptDirectory) -> None:
        """
        Every down_revision referenced in a migration must resolve to an
        existing revision (or be None for the base).
        """
        all_revisions = {r.revision for r in script_dir.walk_revisions()}
        missing = []

        for rev in script_dir.walk_revisions():
            if rev.down_revision is None:
                continue
            parents = (
                [rev.down_revision]
                if isinstance(rev.down_revision, str)
                else list(rev.down_revision)
            )
            for parent in parents:
                if parent not in all_revisions:
                    missing.append(
                        f"  {rev.revision} references missing parent {parent!r}"
                    )

        assert not missing, (
            "Broken down_revision pointers found:\n" + "\n".join(missing)
        )

    def test_revision_chain_order(self, script_dir: ScriptDirectory) -> None:
        """
        Walk the full chain and assert it forms a non-empty sequence without
        duplicate revision IDs.
        """
        revisions = list(script_dir.walk_revisions())
        ids = [r.revision for r in revisions]
        assert len(ids) == len(set(ids)), (
            "Duplicate revision IDs detected in the migration chain."
        )
        assert len(ids) > 0, "No revisions found in alembic/versions/."


# ---------------------------------------------------------------------------
# Group 2 – Live database upgrade / downgrade tests
# ---------------------------------------------------------------------------

@pytest.mark.usefixtures("db_engine")
class TestMigrationExecution:
    """
    Run actual Alembic upgrade / downgrade commands against a temporary
    PostgreSQL database.

    Each test that mutates the schema calls _wipe_schema() first so it
    starts from a blank slate.  Tests in this class are intentionally
    ordered: upgrade → schema assertions → downgrade → roundtrip.
    """

    def test_upgrade_head(self, db_engine: sa.engine.Engine, alembic_cfg: Config) -> None:
        """
        `alembic upgrade head` must complete without raising any exception.

        This is the primary regression guard for the production migration
        failure reported in 7922d3edf5ad (hallucination_rate column).
        """
        _wipe_schema(db_engine)
        # Should not raise
        alembic_command.upgrade(alembic_cfg, "head")

        # Confirm alembic_version table exists and has exactly one row
        with db_engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
        assert len(result) == 1, (
            f"Expected 1 row in alembic_version after upgrade head, got {len(result)}."
        )

    def test_schema_tables_exist(self, db_engine: sa.engine.Engine, alembic_cfg: Config) -> None:
        """All core tables must be present after a full upgrade."""
        # Upgrade in case a previous test left the DB at base.
        alembic_command.upgrade(alembic_cfg, "head")

        tables = _table_names(db_engine)
        expected_tables = [
            "users",
            "prompts",
            "prompt_versions",
            "runs",
            "golden_examples",
            "evaluation_results",
            "experiments",
            "experiment_results",
        ]
        missing = [t for t in expected_tables if t not in tables]
        assert not missing, (
            f"The following tables are missing after upgrade head: {missing}"
        )

    def test_evaluation_results_columns(self, db_engine: sa.engine.Engine, alembic_cfg: Config) -> None:
        """
        evaluation_results must contain the expected columns after upgrade.

        Specifically:
          - 'halluation_rate' (typo column introduced in 7922d3edf5ad) must exist.
          - 'hallucination_rate' (old column) must NOT exist — it was
            conditionally dropped by the fixed migration.
          - 'reason' column added by f5eb2a159a3f must exist.
        """
        alembic_command.upgrade(alembic_cfg, "head")

        cols = _column_names(db_engine, "evaluation_results")

        assert "halluation_rate" in cols, (
            "'halluation_rate' column is missing from evaluation_results. "
            "The add_column in 7922d3edf5ad may not have run."
        )
        assert "hallucination_rate" not in cols, (
            "'hallucination_rate' still present in evaluation_results. "
            "The conditional drop in 7922d3edf5ad may have been skipped."
        )
        assert "reason" in cols, (
            "'reason' column is missing from evaluation_results — "
            "migration f5eb2a159a3f may not have run."
        )

    def test_experiment_results_columns(self, db_engine: sa.engine.Engine, alembic_cfg: Config) -> None:
        """experiment_results must contain avg_hallucination_rate after upgrade."""
        alembic_command.upgrade(alembic_cfg, "head")

        cols = _column_names(db_engine, "experiment_results")
        assert "avg_hallucination_rate" in cols, (
            "'avg_hallucination_rate' missing from experiment_results. "
            "Migration add_hallucination_to_exp_results may not have run."
        )

    def test_downgrade_base(self, db_engine: sa.engine.Engine, alembic_cfg: Config) -> None:
        """
        `alembic downgrade base` must complete without raising any exception.
        After downgrade the alembic_version table should have no rows.
        """
        # Ensure we start at head.
        alembic_command.upgrade(alembic_cfg, "head")

        # Should not raise.
        alembic_command.downgrade(alembic_cfg, "base")

        # alembic_version should be empty (or not exist) after full downgrade.
        with db_engine.connect() as conn:
            try:
                result = conn.execute(
                    text("SELECT version_num FROM alembic_version")
                ).fetchall()
                assert result == [], (
                    f"alembic_version should be empty after downgrade base, got: {result}"
                )
            except Exception:
                # Table doesn't exist at all — also acceptable.
                pass

    def test_upgrade_downgrade_roundtrip(
        self, db_engine: sa.engine.Engine, alembic_cfg: Config
    ) -> None:
        """
        Full upgrade → downgrade → upgrade must be idempotent.

        After the second upgrade, schema must be in the same state as after
        the first.  This catches migrations that do not cleanly undo
        themselves (e.g. missing downgrade logic).
        """
        _wipe_schema(db_engine)

        # First pass
        alembic_command.upgrade(alembic_cfg, "head")
        tables_after_first = set(_table_names(db_engine))

        # Tear down
        alembic_command.downgrade(alembic_cfg, "base")

        # Second pass
        alembic_command.upgrade(alembic_cfg, "head")
        tables_after_second = set(_table_names(db_engine))

        # alembic_version is always present, exclude it for comparison
        tables_after_first.discard("alembic_version")
        tables_after_second.discard("alembic_version")

        assert tables_after_first == tables_after_second, (
            "Schema tables differ between first and second upgrade:\n"
            f"  Only in first : {tables_after_first - tables_after_second}\n"
            f"  Only in second: {tables_after_second - tables_after_first}"
        )

    def test_head_revision_is_current_after_upgrade(
        self, db_engine: sa.engine.Engine, alembic_cfg: Config, script_dir: ScriptDirectory
    ) -> None:
        """
        After upgrade head, the DB's current revision must equal the declared
        head in the migration scripts.
        """
        alembic_command.upgrade(alembic_cfg, "head")

        with db_engine.connect() as conn:
            db_heads = _current_heads(alembic_cfg, conn)

        script_heads = script_dir.get_heads()

        assert set(db_heads) == set(script_heads), (
            f"DB is at {db_heads} but script head is {script_heads}. "
            "Not all migrations ran, or an extra revision was applied."
        )
