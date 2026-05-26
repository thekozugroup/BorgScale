"""Unit tests for app.services.repository_discovery."""
import configparser
import os
import time
from pathlib import Path

import pytest

from app.services.repository_discovery import (
    DEFAULT_EXCLUDES,
    FoundRepo,
    is_borg_repo,
    scan_for_repos,
    _is_excluded,
    _parse_remote_inspect,
)


def _make_fake_repo(parent: Path, name: str = "repo", encrypted: bool = False) -> Path:
    """Build a directory that looks like a Borg repo on disk."""
    repo = parent / name
    repo.mkdir()
    (repo / "data").mkdir()
    (repo / "data" / "segment_0").write_bytes(b"BORG_SEG dummy")  # must not be recursed
    cfg = repo / "config"
    parser = configparser.ConfigParser()
    parser["repository"] = {
        "id": f"id-{name}",
        "version": "1",
        "segments_per_dir": "1000",
        "max_segment_size": "524288000",
    }
    if encrypted:
        parser["repository"]["key"] = "REPOKEY_BLOB_BASE64_HERE"
    with cfg.open("w") as fh:
        parser.write(fh)
    return repo


def test_is_borg_repo_positive(tmp_path):
    repo = _make_fake_repo(tmp_path)
    ok, meta = is_borg_repo(repo)
    assert ok is True
    assert meta["id"] == "id-repo"
    assert meta["version"] == 1
    assert meta["encryption_guess"] == "unencrypted"


def test_is_borg_repo_encrypted(tmp_path):
    repo = _make_fake_repo(tmp_path, name="enc", encrypted=True)
    ok, meta = is_borg_repo(repo)
    assert ok is True
    assert meta["encryption_guess"] == "encrypted"


def test_is_borg_repo_missing_data_dir(tmp_path):
    (tmp_path / "almost").mkdir()
    cfg = tmp_path / "almost" / "config"
    cfg.write_text("[repository]\nid=x\nversion=1\n")
    ok, meta = is_borg_repo(tmp_path / "almost")
    assert ok is False
    assert meta is None


def test_is_borg_repo_missing_config(tmp_path):
    (tmp_path / "shell" / "data").mkdir(parents=True)
    ok, meta = is_borg_repo(tmp_path / "shell")
    assert ok is False


def test_is_borg_repo_malformed_config(tmp_path):
    bad = tmp_path / "bad"
    bad.mkdir()
    (bad / "data").mkdir()
    (bad / "config").write_text("this is not ini]")
    ok, meta = is_borg_repo(bad)
    assert ok is False


def test_scan_finds_one_and_skips_data(tmp_path):
    _make_fake_repo(tmp_path, name="a")
    results, partial = scan_for_repos([str(tmp_path)], max_depth=4, excludes=set())
    assert partial is False
    assert len(results) == 1
    assert results[0].repository_id == "id-a"
    # the data/ subtree must NOT have been recursed
    assert all(not r.path.endswith("/data") for r in results)


def test_scan_finds_multiple_repos(tmp_path):
    _make_fake_repo(tmp_path, name="r1")
    _make_fake_repo(tmp_path, name="r2", encrypted=True)
    nested = tmp_path / "nested"
    nested.mkdir()
    _make_fake_repo(nested, name="r3")
    results, _ = scan_for_repos([str(tmp_path)], max_depth=4, excludes=set())
    ids = sorted(r.repository_id for r in results)
    assert ids == ["id-r1", "id-r2", "id-r3"]


def test_scan_respects_max_depth(tmp_path):
    deep = tmp_path
    for i in range(6):
        deep = deep / f"d{i}"
        deep.mkdir()
    _make_fake_repo(deep, name="treasure")
    results_shallow, _ = scan_for_repos([str(tmp_path)], max_depth=2, excludes=set())
    results_deep, _ = scan_for_repos([str(tmp_path)], max_depth=8, excludes=set())
    assert len(results_shallow) == 0
    assert len(results_deep) == 1


def test_scan_empty_when_root_missing(tmp_path):
    results, partial = scan_for_repos(
        [str(tmp_path / "nope")], max_depth=4, excludes=set()
    )
    assert results == []
    assert partial is False


def test_scan_excludes_hard_paths(tmp_path):
    # simulate a repo planted under an excluded path
    excluded_root = tmp_path / "proc"
    excluded_root.mkdir()
    _make_fake_repo(excluded_root, name="trap")
    # use the excluded path as a custom exclude target
    results, _ = scan_for_repos(
        [str(tmp_path)], max_depth=6, excludes={str(excluded_root)}
    )
    assert results == []


def test_scan_deadline_returns_partial(tmp_path):
    _make_fake_repo(tmp_path, name="r1")
    # force budget exhaustion by setting budget to 0
    results, partial = scan_for_repos(
        [str(tmp_path)], max_depth=4, budget_seconds=0.0
    )
    assert partial is True  # at minimum, deadline already passed
    # results may be 0 or 1 depending on race; both acceptable
    assert isinstance(results, list)


def test_is_excluded():
    assert _is_excluded("/proc/1", {"/proc"}) is True
    assert _is_excluded("/proc", {"/proc"}) is True
    assert _is_excluded("/proceedings", {"/proc"}) is False
    assert _is_excluded("/var/lib/docker/overlay", {"/var/lib/docker"}) is True


def test_parse_remote_inspect_extracts_repos():
    blob = (
        "===PATH=== /srv/borg/repo-a\n"
        "[repository]\n"
        "id = abc123\n"
        "version = 1\n"
        "key = somekey\n"
        "===MTIME=== 1700000000\n"
        "===PATH=== /srv/borg/repo-b\n"
        "[repository]\n"
        "id = def456\n"
        "version = 2\n"
        "===MTIME=== 1700000500\n"
    )
    results = _parse_remote_inspect(blob)
    assert len(results) == 2
    assert results[0].repository_id == "abc123"
    assert results[0].encryption_guess == "encrypted"
    assert results[1].repository_id == "def456"
    assert results[1].encryption_guess == "unencrypted"
    assert results[1].borg_version == 2
