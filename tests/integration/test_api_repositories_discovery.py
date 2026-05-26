"""Integration tests for /api/repositories/discover/* and /quick-import."""
import configparser
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

from tests.utils.borg import make_borg_test_env


@pytest.fixture
def scan_root():
    """Provide a writable temp directory outside DEFAULT_EXCLUDES (/tmp).

    The discovery service hard-excludes paths under /tmp by default, so
    tests use /var/tmp instead to exercise the real default-exclude logic.
    """
    with tempfile.TemporaryDirectory(prefix="borgscan-", dir="/var/tmp") as td:
        yield Path(td)


def _make_fake_repo(parent: Path, name: str) -> Path:
    """Build a directory that LOOKS like a borg repo for signature detection.

    Use this when you only need scan/inspection — NOT for quick-import which
    runs `borg info` and requires a real repo.
    """
    repo = parent / name
    repo.mkdir()
    (repo / "data").mkdir()
    cfg = repo / "config"
    p = configparser.ConfigParser()
    p["repository"] = {
        "id": f"id-{name}",
        "version": "1",
        "segments_per_dir": "1000",
        "max_segment_size": "524288000",
    }
    with cfg.open("w") as fh:
        p.write(fh)
    return repo


def _make_real_repo(parent: Path, name: str) -> Path:
    """Initialise a real (unencrypted) borg repo via the borg CLI.

    Skips the test if the borg binary is not installed.
    """
    borg_path = shutil.which("borg")
    if not borg_path:
        pytest.skip("borg binary not available")
    repo = parent / name
    env = make_borg_test_env(str(parent))
    result = subprocess.run(
        [borg_path, "init", "--encryption=none", str(repo)],
        capture_output=True,
        text=True,
        env=env,
    )
    if result.returncode != 0:
        pytest.skip(f"borg init failed: {result.stderr}")
    return repo


def test_discover_local_finds_repo(test_client, admin_headers, scan_root):
    _make_fake_repo(scan_root, "rA")
    resp = test_client.post(
        "/api/repositories/discover/local",
        headers=admin_headers,
        json={"roots": [str(scan_root)], "max_depth": 4, "budget_seconds": 10},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["partial"] is False
    assert len(body["found"]) == 1
    assert body["found"][0]["repository_id"] == "id-rA"
    assert body["found"][0]["already_imported"] is False


def test_quick_import_creates_repo(test_client, admin_headers, scan_root):
    repo = _make_real_repo(scan_root, "rB")
    resp = test_client.post(
        "/api/repositories/quick-import",
        headers=admin_headers,
        json={"path": str(repo), "name": "test-rB", "mode": "observe"},
    )
    assert resp.status_code in (200, 201), resp.text


def test_discover_then_marks_already_imported(test_client, admin_headers, scan_root):
    repo = _make_real_repo(scan_root, "rC")
    imp = test_client.post(
        "/api/repositories/quick-import",
        headers=admin_headers,
        json={"path": str(repo), "name": "test-rC", "mode": "observe"},
    )
    assert imp.status_code in (200, 201), imp.text

    resp = test_client.post(
        "/api/repositories/discover/local",
        headers=admin_headers,
        json={"roots": [str(scan_root)], "max_depth": 4, "budget_seconds": 10},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    found = [f for f in body["found"] if f["path"] == str(repo)]
    assert found, body
    assert found[0]["already_imported"] is True
