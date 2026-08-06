"""Drop the licensing_state table.

BorgScale has no plans, tiers, entitlements or licence keys, and nothing reads
this table. Removing it stops a schema that implies paid gating from following
every instance forward, and takes the customer_id / license_id / payload_json
columns out of any database backup.

Migration 086 created the table; a database that never ran it simply has nothing
to drop.
"""

import structlog
from sqlalchemy import text

logger = structlog.get_logger()


def upgrade(db):
    db.execute(text("DROP TABLE IF EXISTS licensing_state"))
    db.commit()
    logger.info("Dropped licensing_state table")


def downgrade(db):
    """Not supported.

    Recreating an empty table would restore the shape without restoring any
    meaning, and nothing in the application reads it.
    """
    logger.warning("Downgrade not supported: licensing_state stays dropped")
