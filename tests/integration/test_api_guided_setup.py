"""Integration tests for POST /api/repositories/guided-setup.

These tests exercise the Wave-13 composite "set up backups in one click"
endpoint that wires together repository creation, scheduled-job creation
and (optionally) queueing the first backup.
"""

import os
import shutil
import pytest

from unittest.mock import patch

from app.database.models import Repository


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #


def _payload(path, name="guided-test", **overrides):
    body = {
        "repository": {
            "name": name,
            "path": path,
            "mode": "full",
            # /etc/hostname exists on basically every Linux box. We don't run
            # the backup in most tests (auto_start_backup defaults to False),
            # so this is mostly satisfying the "non-empty source_directories"
            # validation rule.
            "source_directories": ["/etc/hostname"],
            "encryption": "none",  # avoid passphrase ceremony in tests
            "compression": "lz4",
            "borg_version": 1,
        },
        "schedule": {
            "name": f"{name}-daily",
            "cron_expression": "0 3 * * *",
            "archive_name_template": "{job_name}-{now}",
        },
        "auto_start_backup": False,
    }
    if "repo" in overrides:
        body["repository"].update(overrides["repo"])
    if "sched" in overrides:
        body["schedule"].update(overrides["sched"])
    if "auto_start_backup" in overrides:
        body["auto_start_backup"] = overrides["auto_start_backup"]
    return body


@pytest.fixture
def fresh_repo_path(tmp_path):
    """A path that does not yet exist on disk (the endpoint will mkdir it)."""
    return str(tmp_path / "borg-repo")


# --------------------------------------------------------------------------- #
# happy path
# --------------------------------------------------------------------------- #


@pytest.mark.integration
@pytest.mark.requires_borg
def test_guided_setup_happy_path(test_client, admin_headers, fresh_repo_path):
    resp = test_client.post(
        "/api/repositories/guided-setup",
        headers=admin_headers,
        json=_payload(fresh_repo_path),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["stage"] == "ready"
    assert isinstance(body["repository_id"], int) and body["repository_id"] > 0
    assert isinstance(body["scheduled_job_id"], int) and body["scheduled_job_id"] > 0
    assert body["backup_job_id"] is None  # auto_start_backup=False in default payload


# --------------------------------------------------------------------------- #
# validation
# --------------------------------------------------------------------------- #


def test_guided_setup_rejects_observe_with_no_dirs(
    test_client, admin_headers, fresh_repo_path
):
    body = _payload(
        fresh_repo_path,
        name="no-dirs",
        repo={"mode": "full", "source_directories": []},
    )
    resp = test_client.post(
        "/api/repositories/guided-setup", headers=admin_headers, json=body
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["key"] == "backend.errors.repo.noSourceDirs"


def test_guided_setup_rejects_missing_passphrase_when_encrypted(
    test_client, admin_headers, fresh_repo_path
):
    body = _payload(
        fresh_repo_path,
        name="enc",
        repo={"encryption": "repokey-blake2", "passphrase": None},
    )
    resp = test_client.post(
        "/api/repositories/guided-setup", headers=admin_headers, json=body
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["key"] == "backend.errors.repo.passphraseRequired"


def test_guided_setup_rejects_invalid_cron(
    test_client, admin_headers, fresh_repo_path
):
    body = _payload(
        fresh_repo_path,
        name="cron",
        sched={"cron_expression": "not-a-cron"},
    )
    resp = test_client.post(
        "/api/repositories/guided-setup", headers=admin_headers, json=body
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["key"] == "backend.errors.schedule.invalidCron"


def test_guided_setup_rejects_invalid_mode(
    test_client, admin_headers, fresh_repo_path
):
    body = _payload(
        fresh_repo_path, name="bad-mode", repo={"mode": "bogus"}
    )
    resp = test_client.post(
        "/api/repositories/guided-setup", headers=admin_headers, json=body
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["key"] == "backend.errors.repo.invalidMode"


# --------------------------------------------------------------------------- #
# collision / conflict
# --------------------------------------------------------------------------- #


@pytest.mark.integration
@pytest.mark.requires_borg
def test_guided_setup_rejects_duplicate_name(
    test_client, admin_headers, tmp_path
):
    first_path = str(tmp_path / "first-repo")
    second_path = str(tmp_path / "second-repo")
    r1 = test_client.post(
        "/api/repositories/guided-setup",
        headers=admin_headers,
        json=_payload(first_path, name="dupe-name"),
    )
    assert r1.status_code == 200, r1.text

    r2 = test_client.post(
        "/api/repositories/guided-setup",
        headers=admin_headers,
        json=_payload(second_path, name="dupe-name"),
    )
    assert r2.status_code == 409
    assert r2.json()["detail"]["key"] == "backend.errors.repo.nameTaken"


def test_guided_setup_rejects_non_empty_path(
    test_client, admin_headers, tmp_path
):
    # Pre-populate the target path with an unrelated file so it is non-empty
    # and not a borg repo.
    path = tmp_path / "occupied"
    path.mkdir()
    (path / "junk.txt").write_text("not a borg repo\n")
    body = _payload(str(path), name="occupied")
    resp = test_client.post(
        "/api/repositories/guided-setup", headers=admin_headers, json=body
    )
    assert resp.status_code == 409
    assert resp.json()["detail"]["key"] in (
        "backend.errors.repo.pathNotEmpty",
        "backend.errors.repo.pathAlreadyBorgRepo",
    )


# --------------------------------------------------------------------------- #
# rollback / saga
# --------------------------------------------------------------------------- #


@pytest.mark.integration
@pytest.mark.requires_borg
def test_guided_setup_rolls_back_on_schedule_failure(
    test_client, admin_headers, test_db, fresh_repo_path
):
    """If the schedule stage blows up, the repo must be removed (DB + disk)."""
    from app.api import repositories as repos_mod

    body = _payload(fresh_repo_path, name="rollback-me")

    async def boom(*args, **kwargs):
        raise RuntimeError("simulated schedule failure")

    with patch.object(repos_mod, "create_scheduled_job", new=boom):
        resp = test_client.post(
            "/api/repositories/guided-setup",
            headers=admin_headers,
            json=body,
        )

    assert resp.status_code == 500, resp.text
    assert (
        resp.json()["detail"]["key"]
        == "backend.errors.guidedSetup.scheduleStageFailed"
    )

    # Repo row must be gone.
    leftover = (
        test_db.query(Repository)
        .filter(Repository.name == "rollback-me")
        .first()
    )
    assert leftover is None, "Repository row was not rolled back"

    # Repo directory must be gone (or at least empty).
    assert (not os.path.exists(fresh_repo_path)) or (
        not any(os.scandir(fresh_repo_path))
    ), "Repository directory was not cleaned up after rollback"


# --------------------------------------------------------------------------- #
# authz
# --------------------------------------------------------------------------- #


def test_guided_setup_requires_admin(
    test_client, operator_headers, fresh_repo_path
):
    """Operators must not be able to call guided-setup — same gate as POST /repositories."""
    resp = test_client.post(
        "/api/repositories/guided-setup",
        headers=operator_headers,
        json=_payload(fresh_repo_path, name="op-denied"),
    )
    assert resp.status_code == 403
