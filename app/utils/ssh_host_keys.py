"""Shared SSH host-key policy for every outbound connection BorgScale makes.

Every ssh invocation previously passed ``StrictHostKeyChecking=no`` together
with ``UserKnownHostsFile=/dev/null``. That combination does not merely skip the
first-connection prompt — it discards the host key afterwards, so BorgScale can
never notice that a host's key has changed. For software whose entire job is
moving your data to a remote machine, that means an attacker positioned on the
network can impersonate the backup destination indefinitely and nothing will
ever warn about it.

The default here is ``accept-new``: an unknown host is trusted on first use and
recorded, exactly as before from the user's point of view, but a *changed* key
on a host already recorded is refused. That is the protection that matters and
it costs existing installs nothing — no host is known yet, so every one is
accepted once and pinned from then on.

Set ``SSH_HOST_KEY_CHECKING=yes`` to require that hosts be added to the
known_hosts file out of band, or ``no`` to restore the previous behaviour.
"""

from __future__ import annotations

import os
from pathlib import Path

import structlog

from app.config import settings

logger = structlog.get_logger()

VALID_POLICIES = ("accept-new", "yes", "no")


def get_host_key_policy() -> str:
    policy = os.getenv("SSH_HOST_KEY_CHECKING", "accept-new").strip().lower()
    if policy not in VALID_POLICIES:
        logger.warning(
            "Unrecognised SSH_HOST_KEY_CHECKING, falling back to accept-new",
            value=policy,
            valid=VALID_POLICIES,
        )
        return "accept-new"
    return policy


def get_known_hosts_path() -> str:
    """Path to the persistent known_hosts file, created if absent.

    It lives in the data directory so it survives container recreation; a
    known_hosts that resets on every restart pins nothing.
    """
    known_hosts = Path(settings.data_dir) / "known_hosts"
    try:
        known_hosts.parent.mkdir(parents=True, exist_ok=True)
        if not known_hosts.exists():
            known_hosts.touch(mode=0o600)
    except OSError as e:
        # A read-only or missing data dir must not stop backups from running.
        logger.warning(
            "Could not prepare known_hosts, host keys will not persist",
            path=str(known_hosts),
            error=str(e),
        )
        return "/dev/null"
    return str(known_hosts)


def ssh_host_key_options() -> list[str]:
    """The -o flags every ssh invocation should carry."""
    policy = get_host_key_policy()
    if policy == "no":
        return [
            "-o",
            "StrictHostKeyChecking=no",
            "-o",
            "UserKnownHostsFile=/dev/null",
        ]
    return [
        "-o",
        f"StrictHostKeyChecking={policy}",
        "-o",
        f"UserKnownHostsFile={get_known_hosts_path()}",
    ]


def ssh_host_key_args() -> str:
    """The same flags as a string, for BORG_RSH and sshfs -o strings."""
    return " ".join(ssh_host_key_options())
