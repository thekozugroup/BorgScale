"""
Unit tests for `POST /api/repositories/{repo_id}/test-backup`.

The endpoint runs `borg create --dry-run --stats --list` against the
repository's configured source_directories and reports what would be
backed up. Tests here cover validation paths and the parsing of canned
borg --stats/--list output (subprocess is mocked).
"""

import asyncio
import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.database.models import Repository


def _make_repo(test_db, **overrides) -> Repository:
    """Create a repository row mirroring the patterns in test_api_repositories.py."""
    defaults = dict(
        name="Test Repo",
        path="/tmp/test-repo-test-backup",
        encryption="none",
        compression="lz4",
        repository_type="local",
        mode="full",
        source_directories=json.dumps(["/tmp/source"]),
    )
    defaults.update(overrides)
    repo = Repository(**defaults)
    test_db.add(repo)
    test_db.commit()
    test_db.refresh(repo)
    return repo


@pytest.mark.unit
class TestTestBackupEndpoint:
    """Test the POST /{repo_id}/test-backup endpoint."""

    def test_test_backup_404_for_missing_repo(
        self, test_client: TestClient, admin_headers
    ):
        """Unknown repo IDs return 404 with the expected i18n key."""
        resp = test_client.post(
            "/api/repositories/99999/test-backup",
            headers=admin_headers,
        )
        assert resp.status_code == 404
        assert resp.json()["detail"]["key"] == "backend.errors.repo.notFound"

    def test_test_backup_rejects_observe_mode(
        self, test_client: TestClient, admin_headers, test_db
    ):
        """Observe-only repos cannot run a dry-run create."""
        repo = _make_repo(
            test_db,
            name="Observe Repo",
            path="/tmp/observe-repo",
            mode="observe",
            source_directories=json.dumps(["/tmp/source"]),
        )

        resp = test_client.post(
            f"/api/repositories/{repo.id}/test-backup",
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert resp.json()["detail"]["key"] == "backend.errors.repo.observeNoDryRun"

    def test_test_backup_rejects_no_source_dirs(
        self, test_client: TestClient, admin_headers, test_db
    ):
        """Repos with empty source_directories cannot be dry-run."""
        repo = _make_repo(
            test_db,
            name="No Sources Repo",
            path="/tmp/no-sources-repo",
            mode="full",
            source_directories=None,
        )

        resp = test_client.post(
            f"/api/repositories/{repo.id}/test-backup",
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert resp.json()["detail"]["key"] == "backend.errors.repo.noSourceDirs"

    def test_test_backup_rejects_remote_repo(
        self, test_client: TestClient, admin_headers, test_db
    ):
        """Repos with a connection_id (remote) cannot be dry-run yet."""
        repo = _make_repo(
            test_db,
            name="Remote Repo",
            path="ssh://user@host/path/repo",
            mode="full",
            repository_type="ssh",
            connection_id=12345,
            source_directories=json.dumps(["/tmp/source"]),
        )

        resp = test_client.post(
            f"/api/repositories/{repo.id}/test-backup",
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert (
            resp.json()["detail"]["key"]
            == "backend.errors.repo.dryRunRemoteUnsupported"
        )

    def test_test_backup_parses_borg_output(
        self, test_client: TestClient, admin_headers, test_db
    ):
        """A successful borg dry-run is parsed into structured fields."""
        repo = _make_repo(
            test_db,
            name="Parse Repo",
            path="/tmp/parse-repo",
            mode="full",
            source_directories=json.dumps(["/tmp/source"]),
        )

        canned_stdout = (
            b"A /home/test/file1.txt\n"
            b"A /home/test/file2.txt\n"
            b"M /home/test/file3.txt\n"
        )
        canned_stderr = (
            b"------------------------------------------------------------------------------\n"
            b"Archive name: test-archive\n"
            b"Archive fingerprint: deadbeef\n"
            b"Time (start): Tue, 2026-05-26 21:00:00\n"
            b"Time (end):   Tue, 2026-05-26 21:00:01\n"
            b"Duration: 1.00 seconds\n"
            b"Number of files: 42\n"
            b"Utilization of max. archive size: 0%\n"
            b"------------------------------------------------------------------------------\n"
            b"                       Original size      Compressed size    Deduplicated size\n"
            b"This archive:                1.23 GB              456.7 MB             123.4 MB\n"
            b"All archives:                1.23 GB              456.7 MB             123.4 MB\n"
            b"                       Unique chunks         Total chunks\n"
            b"Chunk index:                      0                    0\n"
            b"------------------------------------------------------------------------------\n"
            b"Original size:           1.23 GB              \n"
        )
        fake_proc = AsyncMock()
        fake_proc.returncode = 0
        fake_proc.communicate = AsyncMock(
            return_value=(canned_stdout, canned_stderr)
        )

        with patch(
            "app.api.repositories.asyncio.create_subprocess_exec",
            AsyncMock(return_value=fake_proc),
        ):
            resp = test_client.post(
                f"/api/repositories/{repo.id}/test-backup",
                headers=admin_headers,
            )

        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["files_count"] == 42
        # 1.23 GB decimal == 1_230_000_000
        assert body["would_back_up_bytes"] == 1_230_000_000
        assert body["sample_paths"][:3] == [
            "/home/test/file1.txt",
            "/home/test/file2.txt",
            "/home/test/file3.txt",
        ]
        assert body["timed_out"] is False
        assert body["error_message"] is None

    def test_test_backup_nonzero_returncode_surfaces_tail(
        self, test_client: TestClient, admin_headers, test_db
    ):
        """Non-zero exit returns 200 with error_message + tail (not an HTTP error)."""
        repo = _make_repo(
            test_db,
            name="Fail Repo",
            path="/tmp/fail-repo",
            mode="full",
            source_directories=json.dumps(["/tmp/source"]),
        )

        fake_proc = AsyncMock()
        fake_proc.returncode = 2
        fake_proc.communicate = AsyncMock(
            return_value=(b"", b"borg: repository does not exist\n")
        )

        with patch(
            "app.api.repositories.asyncio.create_subprocess_exec",
            AsyncMock(return_value=fake_proc),
        ):
            resp = test_client.post(
                f"/api/repositories/{repo.id}/test-backup",
                headers=admin_headers,
            )

        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["timed_out"] is False
        assert body["error_message"] is not None
        assert "code 2" in body["error_message"]
        assert "repository does not exist" in (body["raw_output_tail"] or "")

    def test_test_backup_timeout(
        self, test_client: TestClient, admin_headers, test_db
    ):
        """A subprocess that exceeds the 60s budget reports timed_out=True."""
        repo = _make_repo(
            test_db,
            name="Slow Repo",
            path="/tmp/slow-repo",
            mode="full",
            source_directories=json.dumps(["/tmp/source"]),
        )

        fake_proc = AsyncMock()
        fake_proc.returncode = 0
        fake_proc.communicate = AsyncMock(side_effect=asyncio.TimeoutError())
        fake_proc.kill = lambda: None

        # Force wait_for itself to raise TimeoutError so we don't actually wait.
        async def _raise_timeout(*_args, **_kwargs):
            raise asyncio.TimeoutError()

        with patch(
            "app.api.repositories.asyncio.create_subprocess_exec",
            AsyncMock(return_value=fake_proc),
        ), patch("app.api.repositories.asyncio.wait_for", _raise_timeout):
            resp = test_client.post(
                f"/api/repositories/{repo.id}/test-backup",
                headers=admin_headers,
            )

        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["timed_out"] is True
        assert body["error_message"] is not None
        assert "60s" in body["error_message"]
