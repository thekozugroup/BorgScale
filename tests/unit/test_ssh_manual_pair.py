"""Unit tests for manual-pair SSH helpers in app.api.ssh_keys."""
import pytest

from app.api.ssh_keys import (
    _redact_secrets,
    _classify_hint,
    _build_authorize_command,
)


def test_redact_password_field():
    out = _redact_secrets("ssh: password=hunter2 something")
    assert "hunter2" not in out
    assert "[redacted]" in out


def test_redact_passphrase_field():
    out = _redact_secrets("Borg passphrase: SuperSecretValue123")
    assert "SuperSecretValue123" not in out


def test_redact_long_base64_blob():
    blob = "key " + "AAAA1234abcd" * 10 + "=="
    out = _redact_secrets(blob)
    assert "[redacted-base64]" in out
    assert "AAAA1234abcd" not in out


def test_redact_leaves_short_strings_alone():
    out = _redact_secrets("borg 1.2.7\n")
    assert "borg 1.2.7" in out


def test_classify_hint_publickey():
    assert _classify_hint("Permission denied (publickey).") == "backend.ssh.hint.publicKeyNotAuthorized"


def test_classify_hint_borg_missing():
    assert _classify_hint("bash: borg: command not found") == "backend.ssh.hint.borgNotInstalled"


def test_classify_hint_refused():
    assert _classify_hint("ssh: connect to host x port 22: Connection refused") == "backend.ssh.hint.connectionRefused"


def test_classify_hint_dns():
    assert _classify_hint("ssh: Could not resolve hostname foo.bar") == "backend.ssh.hint.dnsFailed"


def test_classify_hint_unknown_returns_none():
    assert _classify_hint("just some other failure") is None


def test_build_authorize_command_includes_key():
    cmd = _build_authorize_command("ssh-ed25519 AAAA test@host")
    assert "ssh-ed25519 AAAA test@host" in cmd
    assert "authorized_keys" in cmd
    assert "chmod 700" in cmd
    assert "chmod 600" in cmd


def test_build_authorize_command_escapes_quotes():
    cmd = _build_authorize_command('ssh-ed25519 "tricky" comment')
    # double quotes inside the key get escaped, so the outer echo still works
    assert cmd.count('"') >= 4  # opening + closing of echo + 2 escaped
