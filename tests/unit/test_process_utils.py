import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.database.models import BackupJob, Repository
from app.utils.process_utils import break_repository_lock, cleanup_orphaned_jobs


@pytest.mark.unit
def test_break_repository_lock_uses_v1_command_shape():
    repository = SimpleNamespace(
        id=1,
        borg_version=1,
        path="/repo/path",
        passphrase="secret",
        connection_id=None,
        remote_path="/usr/bin/borg",
    )

    with patch("app.utils.process_utils.subprocess.run") as mock_run:
        mock_run.return_value = SimpleNamespace(returncode=0, stderr="")

        result = break_repository_lock(repository)

    assert result is True
    cmd = mock_run.call_args.args[0]
    env = mock_run.call_args.kwargs["env"]
    assert cmd == ["borg", "break-lock", "--remote-path", "/usr/bin/borg", "/repo/path"]
    assert env["BORG_PASSPHRASE"] == "secret"


@pytest.mark.unit
def test_break_repository_lock_uses_v2_command_shape():
    repository = SimpleNamespace(
        id=2,
        borg_version=2,
        path="/repo/path",
        passphrase="secret",
        connection_id=None,
        remote_path="/usr/bin/borg2",
    )

    with (
        patch("app.core.borg2.borg2.borg_cmd", "borg2"),
        patch("app.utils.process_utils.subprocess.run") as mock_run,
    ):
        mock_run.return_value = SimpleNamespace(returncode=0, stderr="")

        result = break_repository_lock(repository)

    assert result is True
    cmd = mock_run.call_args.args[0]
    env = mock_run.call_args.kwargs["env"]
    assert cmd == [
        "borg2",
        "-r",
        "/repo/path",
        "break-lock",
        "--remote-path",
        "/usr/bin/borg2",
    ]
    assert env["BORG_PASSPHRASE"] == "secret"


@pytest.mark.unit
def test_cleanup_orphaned_backup_job_breaks_stale_local_lock(db_session):
    repo = Repository(
        name="Repo",
        path="/repos/main",
        encryption="none",
        repository_type="local",
    )
    db_session.add(repo)
    db_session.flush()
    job = BackupJob(repository=repo.path, status="running")
    db_session.add(job)
    db_session.commit()

    with patch(
        "app.utils.process_utils.break_repository_lock", return_value=True
    ) as mock_break:
        cleanup_orphaned_jobs(db_session)

    db_session.refresh(job)
    assert job.status == "failed"
    assert job.completed_at is not None
    mock_break.assert_called_once()
    assert mock_break.call_args.args[0].id == repo.id


@pytest.mark.unit
def test_cleanup_orphaned_backup_job_records_break_lock_failure(db_session):
    repo = Repository(
        name="Repo",
        path="/repos/main",
        encryption="none",
        repository_type="local",
    )
    db_session.add(repo)
    db_session.flush()
    job = BackupJob(repository=repo.path, status="running")
    db_session.add(job)
    db_session.commit()

    with patch(
        "app.utils.process_utils.break_repository_lock", return_value=False
    ) as mock_break:
        cleanup_orphaned_jobs(db_session)

    db_session.refresh(job)
    assert job.status == "failed"
    mock_break.assert_called_once()
    assert (
        json.dumps({"key": "backend.errors.service.warningFailedBreakLock"})
        in job.error_message
    )


@pytest.mark.unit
def test_cleanup_orphaned_remote_execution_backup_job_keeps_lock(db_session):
    repo = Repository(
        name="Repo",
        path="/repos/main",
        encryption="none",
        repository_type="local",
    )
    db_session.add(repo)
    db_session.flush()
    job = BackupJob(
        repository=repo.path,
        status="running",
        execution_mode="remote_ssh",
    )
    db_session.add(job)
    db_session.commit()

    with patch(
        "app.utils.process_utils.break_repository_lock", return_value=True
    ) as mock_break:
        cleanup_orphaned_jobs(db_session)

    db_session.refresh(job)
    assert job.status == "failed"
    mock_break.assert_not_called()
    assert (
        json.dumps({"key": "backend.errors.service.warningRemoteProcessMayBeRunning"})
        in job.error_message
    )
