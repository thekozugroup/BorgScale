"""Drop the analytics consent columns from users.

BorgScale collects nothing, so there is nothing to consent to. Migrations 051
and 052 added users.analytics_enabled and users.analytics_consent_given; the
model no longer maps either. Leaving them behind means every database backup
still carries a consent field implying tracking that does not exist.

ALTER TABLE ... DROP COLUMN needs SQLite 3.35 (2021). On anything older the
columns are left in place and a warning is logged — they are unmapped booleans,
so nothing breaks either way.
"""

import structlog
from sqlalchemy import text

logger = structlog.get_logger()

COLUMNS = ("analytics_enabled", "analytics_consent_given")


def _existing_columns(db, table: str) -> set[str]:
    rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def upgrade(db):
    present = _existing_columns(db, "users")
    dropped = []

    for column in COLUMNS:
        if column not in present:
            continue
        try:
            db.execute(text(f"ALTER TABLE users DROP COLUMN {column}"))
            dropped.append(column)
        except Exception as e:
            # Older SQLite cannot drop a column. Rebuilding the users table to
            # remove two unused booleans is not worth the risk to account data.
            logger.warning(
                "Could not drop analytics column; leaving it unused",
                column=column,
                error=str(e),
            )
            db.rollback()
            return

    db.commit()
    if dropped:
        logger.info("Dropped analytics columns", columns=dropped)


def downgrade(db):
    """Not supported. Nothing reads these columns."""
    logger.warning("Downgrade not supported: analytics columns stay dropped")
