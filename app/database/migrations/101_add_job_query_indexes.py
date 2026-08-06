"""Add indexes for the job tables the dashboard polls.

backup_jobs and prune_jobs are read by /api/dashboard/overview,
/api/activity/recent, /api/backup/jobs, /api/repositories/ and /metrics on
short polling intervals, all of them filtering or ordering on the columns
below. Without these indexes every poll degrades into a full table scan.

Mirrors the __table_args__ on BackupJob and PruneJob so freshly created and
upgraded databases end up with the same schema.
"""

from sqlalchemy import text

BACKUP_JOB_INDEXES = (
    ("ix_backup_jobs_started_at", "backup_jobs (started_at)"),
    ("ix_backup_jobs_status_started_at", "backup_jobs (status, started_at)"),
    ("ix_backup_jobs_repository_status", "backup_jobs (repository, status)"),
    ("ix_backup_jobs_repository_created_at", "backup_jobs (repository, created_at)"),
    (
        "ix_backup_jobs_repository_completed_at",
        "backup_jobs (repository, completed_at)",
    ),
)

PRUNE_JOB_INDEXES = (
    ("ix_prune_jobs_started_at", "prune_jobs (started_at)"),
    ("ix_prune_jobs_status_started_at", "prune_jobs (status, started_at)"),
    ("ix_prune_jobs_repository_id_status", "prune_jobs (repository_id, status)"),
    (
        "ix_prune_jobs_repository_path_status",
        "prune_jobs (repository_path, status)",
    ),
)


def upgrade(db):
    for index_name, target in BACKUP_JOB_INDEXES + PRUNE_JOB_INDEXES:
        db.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {target}"))

    db.commit()


def downgrade(db):
    for index_name, _target in BACKUP_JOB_INDEXES + PRUNE_JOB_INDEXES:
        db.execute(text(f"DROP INDEX IF EXISTS {index_name}"))

    db.commit()
