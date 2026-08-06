"""Regression tests for the polled endpoints that used to issue per-row queries.

Each endpoint here is polled by the dashboard on a short interval. The defect
these tests guard against is query count growing with the size of the database:
the assertions compare a small dataset against a larger one and require the
statement count to be identical, which only holds if every lookup is batched.
"""

import importlib
from contextlib import contextmanager

import pytest
from sqlalchemy import event, inspect

from app.database.models import (
    BackupJob,
    CheckJob,
    CompactJob,
    InstalledPackage,
    PackageInstallJob,
    PruneJob,
    Repository,
    RestoreJob,
    ScheduledJob,
    ScheduledJobRepository,
    SystemSettings,
    utc_now,
)

MIGRATION_101 = importlib.import_module(
    "app.database.migrations.101_add_job_query_indexes"
)


@contextmanager
def count_statements(session):
    """Collect every SQL statement executed on the session's engine."""
    engine = session.get_bind()
    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", record)


def seed_repository(test_db, index):
    """Create one repository with a full set of jobs and schedules attached."""
    repo = Repository(
        name=f"Repo {index}",
        path=f"/srv/repo-{index}",
        encryption="none",
        compression="lz4",
        repository_type="local",
        mode="full",
        total_size="1 GB",
        archive_count=index,
        last_backup=utc_now(),
        last_check=utc_now(),
        last_compact=utc_now(),
    )
    test_db.add(repo)
    test_db.commit()
    test_db.refresh(repo)

    direct_schedule = ScheduledJob(
        name=f"Direct {index}",
        cron_expression="0 2 * * *",
        repository_id=repo.id,
        enabled=True,
        next_run=utc_now(),
    )
    linked_schedule = ScheduledJob(
        name=f"Linked {index}",
        cron_expression="0 3 * * *",
        enabled=False,
        next_run=utc_now(),
    )
    test_db.add_all([direct_schedule, linked_schedule])
    test_db.commit()
    test_db.refresh(direct_schedule)
    test_db.refresh(linked_schedule)

    package = InstalledPackage(
        name=f"pkg-{index}",
        install_command="apt-get install -y borg",
        status="installed",
    )
    test_db.add(package)
    test_db.commit()
    test_db.refresh(package)

    test_db.add_all(
        [
            ScheduledJobRepository(
                scheduled_job_id=linked_schedule.id,
                repository_id=repo.id,
                execution_order=0,
            ),
            BackupJob(
                repository=repo.path,
                status="completed",
                started_at=utc_now(),
                completed_at=utc_now(),
                progress=100,
                logs="x" * 4096,
                scheduled_job_id=direct_schedule.id,
                original_size=1024,
                deduplicated_size=512,
            ),
            BackupJob(
                repository=repo.path,
                status="failed",
                started_at=utc_now(),
                completed_at=utc_now(),
                progress=40,
                error_message="boom",
            ),
            RestoreJob(
                repository=repo.path,
                archive=f"archive-{index}",
                destination="/restore",
                status="completed",
                started_at=utc_now(),
                logs="restore log",
            ),
            CheckJob(
                repository_id=repo.id,
                repository_path=repo.path,
                status="completed",
                started_at=utc_now(),
            ),
            CompactJob(
                repository_id=repo.id,
                repository_path=repo.path,
                status="running",
                started_at=utc_now(),
            ),
            PruneJob(
                repository_id=repo.id,
                repository_path=repo.path,
                status="completed",
                started_at=utc_now(),
                logs="prune log",
            ),
            PackageInstallJob(
                package_id=package.id,
                status="completed",
                started_at=utc_now(),
            ),
        ]
    )
    test_db.commit()
    return repo


def assert_constant_query_count(test_db, test_client, url, headers=None):
    """Fetch `url` against one repository, then three, and compare both runs.

    Returns the two response payloads so callers can also assert the shape did
    not drift between dataset sizes.
    """
    seed_repository(test_db, 0)
    with count_statements(test_db) as small_run:
        small_response = test_client.get(url, headers=headers)
    assert small_response.status_code == 200

    for index in range(1, 4):
        seed_repository(test_db, index)
    with count_statements(test_db) as large_run:
        large_response = test_client.get(url, headers=headers)
    assert large_response.status_code == 200

    assert len(large_run) == len(small_run), (
        f"{url} issued {len(large_run)} statements for 4 repositories but "
        f"{len(small_run)} for 1 — the per-row lookups are back:\n"
        + "\n".join(large_run)
    )
    return small_response, large_response


@pytest.mark.unit
class TestPolledEndpointQueryCounts:
    """The polled endpoints must cost a fixed number of queries."""

    def test_activity_recent_is_constant_and_keeps_shape(
        self, test_client, admin_headers, test_db
    ):
        small, large = assert_constant_query_count(
            test_db, test_client, "/api/activity/recent", admin_headers
        )

        items = large.json()
        assert len(items) == 4 * 7  # two backups plus one of every other job type
        assert {item["type"] for item in items} == {
            "backup",
            "restore",
            "check",
            "compact",
            "prune",
            "package",
        }
        assert set(small.json()[0]) == set(items[0])
        assert set(items[0]) == {
            "id",
            "type",
            "status",
            "started_at",
            "completed_at",
            "error_message",
            "repository",
            "log_file_path",
            "triggered_by",
            "schedule_id",
            "schedule_name",
            "archive_name",
            "package_name",
            "has_logs",
            "repository_path",
        }

        scheduled_backup = next(
            item
            for item in items
            if item["type"] == "backup" and item["triggered_by"] == "schedule"
        )
        assert scheduled_backup["schedule_name"].startswith("Direct ")
        assert scheduled_backup["has_logs"] is True
        assert next(item for item in items if item["type"] == "package")[
            "package_name"
        ].startswith("pkg-")

    def test_backup_jobs_is_constant_and_keeps_shape(
        self, test_client, admin_headers, test_db
    ):
        _small, large = assert_constant_query_count(
            test_db, test_client, "/api/backup/jobs", admin_headers
        )

        payload = large.json()
        assert list(payload) == ["jobs"]
        assert len(payload["jobs"]) == 8
        job = payload["jobs"][0]
        assert set(job) == {
            "id",
            "repository",
            "status",
            "started_at",
            "completed_at",
            "progress",
            "error_message",
            "has_logs",
            "maintenance_status",
            "scheduled_job_id",
            "archive_name",
            "progress_details",
        }
        assert set(job["progress_details"]) == {
            "current_file",
            "progress_percent",
            "backup_speed",
            "total_expected_size",
            "estimated_time_remaining",
            "nfiles",
            "original_size",
            "compressed_size",
            "deduplicated_size",
        }
        assert any(entry["has_logs"] for entry in payload["jobs"])

    def test_backup_jobs_never_selects_the_log_blob(
        self, test_client, admin_headers, test_db
    ):
        seed_repository(test_db, 0)

        with count_statements(test_db) as statements:
            response = test_client.get("/api/backup/jobs", headers=admin_headers)

        assert response.status_code == 200
        job_selects = [s for s in statements if "FROM backup_jobs" in s]
        assert job_selects
        # length(logs) is fine; selecting the column itself is what pulled
        # megabytes of borg output into every list response.
        assert not any("backup_jobs.logs AS" in s for s in job_selects), (
            "the list endpoint must not load full log blobs"
        )

    def test_dashboard_overview_is_constant_and_keeps_shape(
        self, test_client, admin_headers, test_db
    ):
        _small, large = assert_constant_query_count(
            test_db, test_client, "/api/dashboard/overview", admin_headers
        )

        payload = large.json()
        assert set(payload) == {
            "summary",
            "storage",
            "repository_health",
            "backup_trends",
            "upcoming_tasks",
            "activity_feed",
            "system_metrics",
            "last_updated",
        }
        assert payload["summary"]["total_repositories"] == 4
        assert payload["summary"]["successful_jobs_30d"] == 4
        assert payload["summary"]["failed_jobs_30d"] == 4
        assert {entry["type"] for entry in payload["activity_feed"]} == {
            "backup",
            "check",
            "compact",
        }
        assert all(
            entry["repository"].startswith("Repo ")
            for entry in payload["activity_feed"]
        )
        assert {task["name"] for task in payload["upcoming_tasks"]} == {
            f"Direct {index}" for index in range(4)
        }

    def test_repositories_list_is_constant_and_keeps_shape(
        self, test_client, admin_headers, test_db
    ):
        _small, large = assert_constant_query_count(
            test_db, test_client, "/api/repositories/", admin_headers
        )

        payload = large.json()
        assert payload["success"] is True
        assert len(payload["repositories"]) == 4
        for entry in payload["repositories"]:
            # A running compact is seeded for every repository.
            assert entry["has_running_maintenance"] is True
            assert entry["has_schedule"] is True
            assert entry["schedule_enabled"] is True
            assert entry["schedule_name"] == f"Direct {entry['name'].split()[-1]}"
            assert entry["next_run"] is not None

    def test_metrics_is_constant_and_keeps_shape(self, test_client, test_db):
        settings = test_db.query(SystemSettings).first()
        if settings is None:
            settings = SystemSettings()
            test_db.add(settings)
        settings.metrics_enabled = True
        settings.metrics_require_auth = False
        settings.metrics_token = None
        test_db.commit()

        _small, large = assert_constant_query_count(test_db, test_client, "/metrics")

        content = large.text
        for index in range(4):
            assert (
                f'borg_backup_last_job_success{{repository="Repo {index}"}}' in content
            )
            assert (
                f'borg_backup_last_original_size_bytes{{repository="Repo {index}"}} 1024'
                in content
            )
            assert (
                f'borg_backup_last_deduplicated_size_bytes{{repository="Repo {index}"}} 512'
                in content
            )
            assert (
                f'borg_backup_last_duration_seconds{{repository="Repo {index}"}}'
                in content
            )


@pytest.mark.unit
class TestActivityStatusFilter:
    """The status filter belongs in SQL, not applied after the limit."""

    def test_status_filter_survives_a_full_page_of_other_statuses(
        self, test_client, admin_headers, test_db
    ):
        repo = Repository(
            name="Busy Repo",
            path="/srv/busy",
            encryption="none",
            repository_type="local",
        )
        test_db.add(repo)
        test_db.commit()
        test_db.refresh(repo)

        test_db.add(
            BackupJob(
                repository=repo.path,
                status="failed",
                started_at=utc_now(),
            )
        )
        for _ in range(20):
            test_db.add(
                BackupJob(
                    repository=repo.path,
                    status="completed",
                    started_at=utc_now(),
                )
            )
        test_db.commit()

        response = test_client.get(
            "/api/activity/recent?job_type=backup&status=failed&limit=5",
            headers=admin_headers,
        )

        assert response.status_code == 200
        items = response.json()
        assert len(items) == 1
        assert items[0]["status"] == "failed"


@pytest.mark.unit
class TestJobQueryIndexes:
    """backup_jobs and prune_jobs carry the indexes the polled queries need."""

    def test_models_declare_the_indexes(self, test_db):
        inspector = inspect(test_db.get_bind())

        backup_indexes = {ix["name"] for ix in inspector.get_indexes("backup_jobs")}
        assert {
            "ix_backup_jobs_started_at",
            "ix_backup_jobs_status_started_at",
            "ix_backup_jobs_repository_status",
            "ix_backup_jobs_repository_created_at",
            "ix_backup_jobs_repository_completed_at",
        } <= backup_indexes

        prune_indexes = {ix["name"] for ix in inspector.get_indexes("prune_jobs")}
        assert {
            "ix_prune_jobs_started_at",
            "ix_prune_jobs_status_started_at",
            "ix_prune_jobs_repository_id_status",
            "ix_prune_jobs_repository_path_status",
        } <= prune_indexes

    def test_migration_matches_the_models(self):
        migration_names = {
            name
            for name, _target in MIGRATION_101.BACKUP_JOB_INDEXES
            + MIGRATION_101.PRUNE_JOB_INDEXES
        }
        # The id indexes come from Column(index=True), not the query-tuning set.
        model_names = {
            index.name
            for table in (BackupJob.__table__, PruneJob.__table__)
            for index in table.indexes
        } - {"ix_backup_jobs_id", "ix_prune_jobs_id"}
        assert migration_names == model_names

    def test_migration_is_idempotent(self, test_db):
        engine = test_db.get_bind()
        with engine.connect() as connection:
            MIGRATION_101.upgrade(connection)
            MIGRATION_101.upgrade(connection)

        inspector = inspect(engine)
        assert "ix_backup_jobs_started_at" in {
            ix["name"] for ix in inspector.get_indexes("backup_jobs")
        }
