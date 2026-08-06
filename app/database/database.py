from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
from app.config import settings
import os
import structlog
from pathlib import Path

logger = structlog.get_logger()

# Ensure database directory exists before creating engine
if settings.database_url.startswith("sqlite:///"):
    # Extract database file path from URL
    # Format: sqlite:////absolute/path/to/db.db
    db_path = settings.database_url.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)

    # Create directory if it doesn't exist
    if db_dir and not os.path.exists(db_dir):
        Path(db_dir).mkdir(parents=True, exist_ok=True)
        print(f"Created database directory: {db_dir}")

# Create database engine with connection pooling
# Note: echo=False disables SQL query logging for performance
# Use LOG_LEVEL=DEBUG environment variable if you need to debug SQL queries
engine = create_engine(
    settings.database_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,  # Always disable SQL logging for performance (creates massive log spam)
)

if settings.database_url.startswith("sqlite"):
    # How long a connection waits for a competing writer before giving up with
    # "database is locked". BorgScale writes from request handlers, the schedule
    # checker, the stats refresher and every running job at once, so a write can
    # legitimately queue behind another for a moment.
    SQLITE_BUSY_TIMEOUT_MS = int(os.getenv("SQLITE_BUSY_TIMEOUT_MS", "10000"))

    _journal_mode_logged = False

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        nonlocal_logged = _journal_mode_logged
        cursor = dbapi_conn.cursor()
        try:
            # Required for CASCADE deletes to work.
            cursor.execute("PRAGMA foreign_keys=ON")

            # Write-ahead logging lets readers proceed during a write. Without
            # it a single in-flight write blocks every dashboard poll, which is
            # the usual source of "database is locked" on a busy instance.
            cursor.execute("PRAGMA journal_mode=WAL")

            # Wait instead of failing instantly when another writer holds the
            # lock. Applied per connection; SQLite has no global default.
            cursor.execute(f"PRAGMA busy_timeout={SQLITE_BUSY_TIMEOUT_MS}")

            # WAL already survives application crashes; NORMAL only risks losing
            # the last transactions on host power loss, and removes an fsync per
            # commit from every job progress update.
            cursor.execute("PRAGMA synchronous=NORMAL")

            # Report the mode that actually took effect, once. WAL cannot be
            # enabled on some network filesystems, where the pragma silently
            # leaves the previous mode in place.
            if not nonlocal_logged:
                _report_journal_mode(cursor)
        finally:
            cursor.close()

    def _report_journal_mode(cursor) -> None:
        global _journal_mode_logged
        _journal_mode_logged = True
        try:
            cursor.execute("PRAGMA journal_mode")
            mode = cursor.fetchone()[0]
        except Exception:
            return

        if str(mode).lower() == "wal":
            logger.info("SQLite journal mode active", journal_mode=mode)
        else:
            logger.warning(
                "SQLite is not using WAL; concurrent access will be slower",
                journal_mode=mode,
                hint="WAL is unavailable on some network filesystems. Put the "
                "database on local storage if you see 'database is locked'.",
            )


# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
