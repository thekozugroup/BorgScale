"""
Database migrations package
Automatically discovers and runs numbered migration files in order.

Applied migrations are recorded in the schema_migrations table so each one runs
exactly once. An existing database that predates the tracking table gets one
final full pass — every migration is written to be idempotent — after which the
names are recorded and startup stops replaying them.
"""

import importlib
import sys
from datetime import datetime, timezone
from pathlib import Path

import structlog
from sqlalchemy import text

from app.database.database import engine

logger = structlog.get_logger()

TRACKING_TABLE = "schema_migrations"


def _ensure_tracking_table(connection) -> None:
    connection.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS {TRACKING_TABLE} (
                name TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )
    )
    connection.commit()


def _applied_migrations(connection) -> set[str]:
    result = connection.execute(text(f"SELECT name FROM {TRACKING_TABLE}"))
    return {row[0] for row in result}


def _record_applied(connection, name: str) -> None:
    connection.execute(
        text(
            f"INSERT OR REPLACE INTO {TRACKING_TABLE} (name, applied_at) "
            "VALUES (:name, :applied_at)"
        ),
        {"name": name, "applied_at": datetime.now(timezone.utc).isoformat()},
    )


def run_migrations() -> dict:
    """Run every migration that has not been applied yet.

    Returns a summary with the names that ran and the names that failed. A
    failed migration is not recorded, so it is retried on the next start rather
    than being skipped forever.
    """
    migrations_dir = Path(__file__).parent
    migration_files = sorted(migrations_dir.glob("[0-9][0-9][0-9]_*.py"))

    summary: dict = {"applied": [], "failed": [], "skipped": 0}

    if not migration_files:
        logger.info("No migration files found")
        return summary

    with engine.connect() as connection:
        _ensure_tracking_table(connection)
        already_applied = _applied_migrations(connection)

        pending = [f for f in migration_files if f.stem not in already_applied]
        summary["skipped"] = len(migration_files) - len(pending)

        if not pending:
            logger.info(
                "Database schema is up to date",
                migrations=len(migration_files),
            )
            return summary

        logger.info(
            "Applying pending migrations",
            pending=len(pending),
            already_applied=summary["skipped"],
        )

        for migration_file in pending:
            migration_name = migration_file.stem
            module_name = f"app.database.migrations.{migration_name}"

            try:
                migration_module = importlib.import_module(module_name)

                if not hasattr(migration_module, "upgrade"):
                    logger.warning(
                        "Migration has no upgrade function, recording as applied",
                        migration=migration_name,
                    )
                    _record_applied(connection, migration_name)
                    connection.commit()
                    continue

                logger.info("Running migration", migration=migration_name)

                migration_module.upgrade(connection)
                _record_applied(connection, migration_name)
                connection.commit()
                sys.stdout.flush()

                summary["applied"].append(migration_name)
                logger.info("Migration completed", migration=migration_name)

            except Exception as e:
                # Roll back only this migration. The rest are independent, so
                # stopping here would strand the schema even further behind.
                logger.error(
                    "Migration failed",
                    migration=migration_name,
                    error=str(e),
                )
                connection.rollback()
                summary["failed"].append(migration_name)
                continue

    if summary["failed"]:
        logger.error(
            "Some migrations did not apply; the schema is incomplete",
            failed=summary["failed"],
            hint="They will be retried on the next start. Check the errors above "
            "before running backups against this instance.",
        )
    else:
        logger.info("All migrations completed", applied=len(summary["applied"]))

    return summary
