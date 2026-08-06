"""
Unit tests for CheckService
"""

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.orm import sessionmaker

from app.database.models import CheckJob, Repository
from app.services.check_service import CheckService


class AsyncLineStream:
    def __init__(self, lines):
        self._lines = [
            line if isinstance(line, bytes) else line.encode("utf-8") for line in lines
        ]
        self._index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._index >= len(self._lines):
            raise StopAsyncIteration
        value = self._lines[self._index]
        self._index += 1
        return value


class FakeProcess:
    def __init__(self, returncode=0, stdout_lines=None, stderr_lines=None, pid=4321):
        self.returncode = returncode
        self.stdout = AsyncLineStream(stdout_lines or [])
        self.stderr = AsyncLineStream(stderr_lines or [])
        self.pid = pid

    async def wait(self):
        return self.returncode

    def terminate(self):
        self.returncode = -15

    def kill(self):
        self.returncode = -9


@pytest.mark.unit
@pytest.mark.asyncio
async def test_execute_check_drains_stdout_into_log_buffer(db_session, tmp_path):
    repo = Repository(
        name="Repo",
        path="/tmp/repo",
        encryption="none",
        compression="lz4",
        repository_type="local",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    job = CheckJob(repository_id=repo.id, status="pending")
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    testing_session_local = sessionmaker(
        bind=db_session.get_bind(), autocommit=False, autoflush=False
    )

    fake_process = FakeProcess(
        returncode=0,
        stdout_lines=["stdout finding from borg check"],
        stderr_lines=[
            '{"type": "progress_percent", "message": "Checking segments", '
            '"current": 1, "total": 2, "operation": 1, "finished": false}',
        ],
    )

    async def fake_exec(*args, **kwargs):
        return fake_process

    with (
        patch("app.services.check_service.SessionLocal", testing_session_local),
        patch(
            "app.services.check_service.asyncio.create_subprocess_exec",
            side_effect=fake_exec,
        ),
        patch("app.services.check_service.get_process_start_time", return_value=123),
        patch(
            "app.services.check_service.NotificationService.send_check_completion",
            new=AsyncMock(),
        ),
    ):
        service = CheckService()
        service.log_dir = Path(tmp_path)
        await asyncio.wait_for(
            service.execute_check(job_id=job.id, repository_id=repo.id), timeout=30
        )

    verification_session = testing_session_local()
    try:
        saved_job = (
            verification_session.query(CheckJob).filter(CheckJob.id == job.id).first()
        )
        assert saved_job.status == "completed"
        assert saved_job.has_logs is True
        log_text = Path(saved_job.log_file_path).read_text()
        # stdout must be consumed (it would otherwise fill the pipe and hang
        # borg) and preserved alongside the stderr progress stream
        assert "stdout finding from borg check" in log_text
        assert "Checking segments" in log_text
    finally:
        verification_session.close()
