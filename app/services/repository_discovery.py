"""Borg repository auto-discovery (local FS + remote SSH).

Never recurses into a borg repo's `data/` subtree (millions of small files).
Detection is signature-based (config + data/ dir + INI [repository] section).
"""
from __future__ import annotations

import asyncio
import configparser
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

DEFAULT_EXCLUDES: frozenset = frozenset({
    "/proc", "/sys", "/dev", "/run", "/tmp",
    "/var/lib/docker", "/var/lib/containerd", "/var/lib/snapd",
    "/snap", "/var/cache", "/var/run",
})

DEFAULT_LOCAL_ROOTS: tuple = (
    "/data/backup",
    "/local",
    "/mnt",
    "/srv",
    "/backup",
)


@dataclass
class FoundRepo:
    path: str
    borg_version: int
    repository_id: "str | None" = None
    last_modified_ts: "float | None" = None
    size_bytes: "int | None" = None
    encryption_guess: str = "unknown"          # "encrypted", "unencrypted", "unknown"
    archive_count: "int | None" = None
    already_imported: bool = False
    source: str = "local"                       # "local" or "remote"

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "borg_version": self.borg_version,
            "repository_id": self.repository_id,
            "last_modified_ts": self.last_modified_ts,
            "size_bytes": self.size_bytes,
            "encryption_guess": self.encryption_guess,
            "archive_count": self.archive_count,
            "already_imported": self.already_imported,
            "source": self.source,
        }


def is_borg_repo(path) -> tuple:
    """Cheap O(1) check. Returns (is_repo, metadata-or-None).

    metadata keys when True: id, version, last_modified_ts, size_bytes,
    encryption_guess.
    """
    try:
        p = Path(path)
        cfg = p / "config"
        if not cfg.is_file():
            return False, None
        if not (p / "data").is_dir():
            return False, None
        parser = configparser.ConfigParser()
        parser.read(cfg)
        if "repository" not in parser:
            return False, None
        section = parser["repository"]
        if "id" not in section or "version" not in section:
            return False, None
        version = int(section["version"])

        # Encryption heuristic without invoking borg: if [repository] has a
        # "key" field with non-empty content, the repo uses repokey-style
        # encryption. keyfile-mode repos store the key in ~/.config/borg/keys
        # so this is best-effort only.
        if "key" in section and section["key"].strip():
            enc_guess = "encrypted"
        else:
            enc_guess = "unencrypted"

        try:
            st = cfg.stat()
            last_mod = st.st_mtime
        except OSError:
            last_mod = None

        # Don't du -- cost-prohibitive on TB repos. Leave size None.
        return True, {
            "id": section["id"],
            "version": version,
            "last_modified_ts": last_mod,
            "size_bytes": None,
            "encryption_guess": enc_guess,
        }
    except (configparser.Error, ValueError, OSError) as exc:
        logger.debug("is_borg_repo(%s) failed: %s", path, exc)
        return False, None


def _is_excluded(path: str, excludes: Iterable) -> bool:
    norm = os.path.normpath(path)
    for ex in excludes:
        if norm == ex or norm.startswith(ex + os.sep):
            return True
    return False


def _scan_one_root(
    root: str,
    max_depth: int,
    excludes: Iterable,
    deadline_monotonic: float,
) -> list:
    """Walk `root` up to max_depth, returning every detected borg repo.

    When a directory is identified as a borg repo, do NOT recurse into its
    `data/` subdir. Honor the deadline; return what was found so far.
    """
    found: list = []
    root_abs = os.path.abspath(root)
    if not os.path.isdir(root_abs):
        return found
    if _is_excluded(root_abs, excludes):
        return found

    stack: list = [(root_abs, 0)]
    while stack:
        if time.monotonic() >= deadline_monotonic:
            logger.info("scan: deadline hit at root=%s remaining=%d", root, len(stack))
            break
        current, depth = stack.pop()
        if _is_excluded(current, excludes):
            continue

        is_repo, meta = is_borg_repo(current)
        if is_repo and meta is not None:
            found.append(FoundRepo(
                path=current,
                borg_version=meta["version"],
                repository_id=meta["id"],
                last_modified_ts=meta["last_modified_ts"],
                size_bytes=meta["size_bytes"],
                encryption_guess=meta["encryption_guess"],
                source="local",
            ))
            # short-circuit: never descend into a repo
            continue

        if depth >= max_depth:
            continue

        try:
            with os.scandir(current) as it:
                for entry in it:
                    if time.monotonic() >= deadline_monotonic:
                        break
                    try:
                        if entry.is_symlink():
                            continue
                        if not entry.is_dir(follow_symlinks=False):
                            continue
                    except OSError:
                        continue
                    stack.append((entry.path, depth + 1))
        except (PermissionError, FileNotFoundError, OSError) as exc:
            logger.debug("scandir(%s) failed: %s", current, exc)
            continue
    return found


def scan_for_repos(
    roots=None,
    max_depth: int = 8,
    excludes=None,
    budget_seconds: float = 30.0,
    max_workers: int = 4,
) -> tuple:
    """Multi-root parallel scan. Returns (results, partial).

    `partial` is True if any worker hit the wall-clock budget.
    """
    if roots is None:
        roots = DEFAULT_LOCAL_ROOTS
    if excludes is None:
        excludes = DEFAULT_EXCLUDES

    roots_list = list(roots)
    if not roots_list:
        return [], False

    deadline = time.monotonic() + budget_seconds
    results: list = []
    partial = False

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(_scan_one_root, r, max_depth, excludes, deadline): r
            for r in roots_list
        }
        for fut in as_completed(futures):
            root = futures[fut]
            try:
                results.extend(fut.result())
            except Exception as exc:
                logger.warning("scan_one_root(%s) crashed: %s", root, exc)

    if time.monotonic() >= deadline:
        partial = True

    # de-dupe by (repository_id or path)
    seen: dict = {}
    for f in results:
        key = f.repository_id or f.path
        if key not in seen:
            seen[key] = f
    return list(seen.values()), partial


def _get_connection_for_discovery(connection_id: int, db):
    """Resolve an SSHConnection and its SSHKey to a dict usable by SSH calls.

    Returns dict with: host, username, port, ssh_key (SSHKey ORM or None).
    Returns None if the connection does not exist.
    """
    from app.database.models import SSHConnection, SSHKey  # local import

    conn = db.query(SSHConnection).filter(SSHConnection.id == connection_id).first()
    if conn is None:
        return None

    ssh_key = None
    if conn.ssh_key_id:
        ssh_key = db.query(SSHKey).filter(SSHKey.id == conn.ssh_key_id).first()

    return {
        "host": conn.host,
        "username": conn.username,
        "port": conn.port,
        "ssh_key": ssh_key,
    }


def _build_ssh_argv(host: str, username: str, port: int, key_file: "str | None",
                    command: str, connect_timeout: int = 10) -> list:
    """Build an argv list for an SSH invocation.

    Local helper used because app/api/ssh_keys.py does not export a public
    `build_ssh_command` symbol. Mirrors the option set used in
    `test_ssh_key_connection` (StrictHostKeyChecking=no, BatchMode=yes,
    ConnectTimeout=<n>).
    """
    argv = ["ssh"]
    if key_file:
        argv += ["-i", key_file]
    argv += [
        "-o", "StrictHostKeyChecking=no",
        "-o", "BatchMode=yes",
        "-o", f"ConnectTimeout={int(connect_timeout)}",
        "-p", str(int(port)),
        f"{username}@{host}",
        command,
    ]
    return argv


async def scan_remote_for_repos(
    connection_id: int,
    db,
    roots=None,
    max_depth: int = 6,
    budget_seconds: float = 30.0,
) -> tuple:
    """SSH into a known connection and run a bounded `find` for borg repos."""
    from app.utils.ssh_utils import write_ssh_key_to_tempfile  # local import

    if roots is None:
        roots = ["~", "/srv", "/mnt", "/backup", "/var/backups"]

    conn = _get_connection_for_discovery(connection_id, db)
    if conn is None:
        raise ValueError(f"connection_id {connection_id} not found")

    key_file = None
    if conn["ssh_key"] is not None:
        try:
            key_file = write_ssh_key_to_tempfile(conn["ssh_key"])
        except Exception as exc:
            logger.warning("failed to materialise ssh key for discovery: %s", exc)
            key_file = None

    try:
        # bounded find — only files named 'config', not inside /data/ subtree.
        # `printf %h\n` gives the parent dir for each match.
        safe_roots = " ".join(_shell_quote(r) for r in roots)
        cmd_str = (
            f"timeout {int(budget_seconds)} sh -c "
            f"\"find {safe_roots} -maxdepth {int(max_depth)} -type f -name config "
            f"-not -path '*/data/*' -printf '%h\\n' 2>/dev/null | sort -u\""
        )

        ssh_argv = _build_ssh_argv(
            host=conn["host"],
            username=conn["username"],
            port=conn["port"],
            key_file=key_file,
            command=cmd_str,
            connect_timeout=10,
        )

        proc = await asyncio.create_subprocess_exec(
            *ssh_argv,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=budget_seconds + 5
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return [], True

        if proc.returncode not in (0, 124):  # 124 = `timeout` cmd hit its limit
            logger.warning(
                "remote scan failed rc=%s stderr=%s",
                proc.returncode, stderr[:200] if stderr else b"",
            )
            return [], False

        candidate_paths = [
            line.strip()
            for line in stdout.decode(errors="replace").splitlines()
            if line.strip()
        ]

        if not candidate_paths:
            return [], proc.returncode == 124

        paths_arg = " ".join(_shell_quote(p) for p in candidate_paths)
        inspect_cmd = (
            f"for d in {paths_arg}; do "
            f"  if [ -f \"$d/config\" ] && [ -d \"$d/data\" ]; then "
            f"    echo \"===PATH=== $d\"; "
            f"    cat \"$d/config\" 2>/dev/null; "
            f"    stat -c \"===MTIME=== %Y\" \"$d/config\" 2>/dev/null; "
            f"  fi; "
            f"done"
        )
        inspect_argv = _build_ssh_argv(
            host=conn["host"],
            username=conn["username"],
            port=conn["port"],
            key_file=key_file,
            command=inspect_cmd,
            connect_timeout=10,
        )
        proc2 = await asyncio.create_subprocess_exec(
            *inspect_argv,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout2, _ = await asyncio.wait_for(
                proc2.communicate(), timeout=budget_seconds
            )
        except asyncio.TimeoutError:
            proc2.kill()
            await proc2.communicate()
            return [], True

        return _parse_remote_inspect(stdout2.decode(errors="replace")), False
    finally:
        if key_file:
            try:
                os.unlink(key_file)
            except OSError:
                pass


def _parse_remote_inspect(blob: str) -> list:
    """Parse the heredoc-style output produced by scan_remote_for_repos."""
    results: list = []
    state = {"path": None, "lines": [], "mtime": None}

    def flush():
        if not state["path"] or not state["lines"]:
            state["path"], state["lines"], state["mtime"] = None, [], None
            return
        try:
            parser = configparser.ConfigParser()
            parser.read_string("\n".join(state["lines"]))
            if "repository" in parser:
                sec = parser["repository"]
                if "id" in sec and "version" in sec:
                    enc = "encrypted" if sec.get("key", "").strip() else "unencrypted"
                    results.append(FoundRepo(
                        path=state["path"],
                        borg_version=int(sec["version"]),
                        repository_id=sec["id"],
                        last_modified_ts=state["mtime"],
                        encryption_guess=enc,
                        source="remote",
                    ))
        except (configparser.Error, ValueError) as exc:
            logger.debug("parse remote config(%s) failed: %s", state["path"], exc)
        state["path"], state["lines"], state["mtime"] = None, [], None

    for line in blob.splitlines():
        if line.startswith("===PATH==="):
            flush()
            state["path"] = line[len("===PATH==="):].strip()
        elif line.startswith("===MTIME==="):
            try:
                state["mtime"] = float(line[len("===MTIME==="):].strip())
            except ValueError:
                state["mtime"] = None
        else:
            if state["path"]:
                state["lines"].append(line)
    flush()
    return results


def _shell_quote(s: str) -> str:
    """POSIX shell single-quote escape (safe even for paths with spaces)."""
    return "'" + s.replace("'", "'\"'\"'") + "'"
