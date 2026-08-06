"""Endpoint-level tests for /api/ssh-keys/manual-pair/*"""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.unit
def test_manual_pair_init_generates_key_on_first_call(test_client, admin_headers):
    resp = test_client.post(
        "/api/ssh-keys/manual-pair/init",
        headers=admin_headers,
        json={"name": "borgscale-test-key", "key_type": "ed25519"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["created"] is True
    assert body["public_key"].startswith("ssh-ed25519 ")
    assert body["name"] == "borgscale-test-key"
    assert "authorized_keys" in body["suggested_command"]


@pytest.mark.unit
def test_manual_pair_init_is_idempotent(test_client, admin_headers):
    first = test_client.post(
        "/api/ssh-keys/manual-pair/init",
        headers=admin_headers,
        json={"name": "borgscale-test-key-idem", "key_type": "ed25519"},
    ).json()
    second = test_client.post(
        "/api/ssh-keys/manual-pair/init",
        headers=admin_headers,
        json={"name": "borgscale-test-key-idem", "key_type": "ed25519"},
    ).json()
    assert first["ssh_key_id"] == second["ssh_key_id"]
    assert first["public_key"] == second["public_key"]
    assert second["created"] is False


@pytest.mark.unit
def test_manual_pair_init_rejects_bad_key_type(test_client, admin_headers):
    resp = test_client.post(
        "/api/ssh-keys/manual-pair/init",
        headers=admin_headers,
        json={"name": "x", "key_type": "dsa-please-no"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["key"] == "backend.errors.ssh.invalidKeyType"


@pytest.mark.unit
def test_manual_pair_verify_success_path(test_client, admin_headers):
    init = test_client.post(
        "/api/ssh-keys/manual-pair/init",
        headers=admin_headers,
        json={"name": "borgscale-test-verify-ok", "key_type": "ed25519"},
    ).json()

    with patch(
        "app.api.ssh_keys._ssh_run_command",
        new=AsyncMock(return_value=(0, "borg 1.2.7\n", "")),
    ):
        resp = test_client.post(
            "/api/ssh-keys/manual-pair/verify",
            headers=admin_headers,
            json={
                "ssh_key_id": init["ssh_key_id"],
                "host": "example.com",
                "username": "borguser",
                "port": 22,
                "save_connection": True,
            },
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert body["borg_version"] == "1.2.7"
    assert body["hint_key"] is None
    assert body["connection_id"] is not None


@pytest.mark.unit
def test_manual_pair_verify_publickey_denied(test_client, admin_headers):
    init = test_client.post(
        "/api/ssh-keys/manual-pair/init",
        headers=admin_headers,
        json={"name": "borgscale-test-verify-fail-pk", "key_type": "ed25519"},
    ).json()

    with patch(
        "app.api.ssh_keys._ssh_run_command",
        new=AsyncMock(return_value=(255, "", "Permission denied (publickey).")),
    ):
        resp = test_client.post(
            "/api/ssh-keys/manual-pair/verify",
            headers=admin_headers,
            json={
                "ssh_key_id": init["ssh_key_id"],
                "host": "example.com",
                "username": "borguser",
                "save_connection": True,
            },
        )
    body = resp.json()
    assert body["success"] is False
    assert body["hint_key"] == "backend.ssh.hint.publicKeyNotAuthorized"
    assert body["connection_id"] is None


@pytest.mark.unit
def test_manual_pair_verify_borg_missing(test_client, admin_headers):
    init = test_client.post(
        "/api/ssh-keys/manual-pair/init",
        headers=admin_headers,
        json={"name": "borgscale-test-verify-fail-borg", "key_type": "ed25519"},
    ).json()

    with patch(
        "app.api.ssh_keys._ssh_run_command",
        new=AsyncMock(
            return_value=(0, "BORG_MISSING\n", "bash: borg: command not found")
        ),
    ):
        resp = test_client.post(
            "/api/ssh-keys/manual-pair/verify",
            headers=admin_headers,
            json={
                "ssh_key_id": init["ssh_key_id"],
                "host": "example.com",
                "username": "borguser",
            },
        )
    body = resp.json()
    assert body["success"] is False
    assert body["borg_version"] is None
    assert body["hint_key"] == "backend.ssh.hint.borgNotInstalled"


@pytest.mark.unit
def test_manual_pair_verify_missing_key(test_client, admin_headers):
    resp = test_client.post(
        "/api/ssh-keys/manual-pair/verify",
        headers=admin_headers,
        json={"ssh_key_id": 99999, "host": "x", "username": "y"},
    )
    assert resp.status_code == 404
