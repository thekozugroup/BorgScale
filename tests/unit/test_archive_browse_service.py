"""
Unit tests for the shared archive browse helpers.
"""

import json

import pytest

from app.services.archive_browse_service import (
    build_browse_items,
    collect_browse_paths,
    parse_archive_items,
)


class _CountingItem(dict):
    """Dict that counts key lookups so tests can assert algorithmic cost."""

    lookups = 0

    def get(self, *args, **kwargs):
        _CountingItem.lookups += 1
        return super().get(*args, **kwargs)


def _item(path, type_="f", size=1, mtime="2026-01-01T00:00:00"):
    return {"path": path, "type": type_, "size": size, "mtime": mtime}


@pytest.mark.unit
class TestParseArchiveItems:
    def test_parses_json_lines_and_skips_garbage(self):
        stdout = "\n".join(
            [
                json.dumps({"path": "/docs/", "type": "d", "mtime": "t"}),
                "not-json",
                "",
                json.dumps({"path": "docs/a.txt", "type": "f", "size": 4, "mtime": "t"}),
                json.dumps({"path": "", "type": "f", "size": 4, "mtime": "t"}),
            ]
        )

        items = parse_archive_items(stdout)

        assert items == [
            {"path": "docs", "type": "d", "size": None, "mtime": "t"},
            {"path": "docs/a.txt", "type": "f", "size": 4, "mtime": "t"},
        ]


@pytest.mark.unit
class TestBuildBrowseItems:
    def test_root_listing_sums_directory_sizes(self):
        all_items = [
            _item("docs", type_="d", size=None),
            _item("docs/a.txt", size=4),
            _item("docs/sub/b.txt", size=6),
            _item("notes.txt", size=3),
        ]

        items = build_browse_items(all_items, "")

        assert items == [
            {
                "name": "docs",
                "type": "directory",
                "size": 10,
                "mtime": "2026-01-01T00:00:00",
                "path": "docs",
            },
            {
                "name": "notes.txt",
                "type": "file",
                "size": 3,
                "mtime": "2026-01-01T00:00:00",
                "path": "notes.txt",
            },
        ]

    def test_subdirectory_listing_only_counts_descendants(self):
        all_items = [
            _item("home/user", type_="d", size=None),
            _item("home/user/file.txt", size=10),
            _item("home/user/docs", type_="d", size=None),
            _item("home/user/docs/a.txt", size=11),
            _item("home/user/docs/deep/b.txt", size=12),
            _item("home/other/skip.txt", size=99),
        ]

        items = build_browse_items(all_items, "home/user")

        assert [(entry["name"], entry["size"]) for entry in items] == [
            ("docs", 23),
            ("file.txt", 10),
        ]

    def test_implicit_directory_from_nested_path_gets_size(self):
        all_items = [
            _item("docs/sub/notes.txt", size=5),
            _item("docs/sub/deeper/final.txt", size=13),
        ]

        items = build_browse_items(all_items, "docs")

        assert items == [
            {
                "name": "sub",
                "type": "directory",
                "size": 18,
                "mtime": None,
                "path": "docs/sub",
            }
        ]

    def test_hide_directory_sizes_returns_none_sizes(self):
        all_items = [
            _item("docs/sub", type_="d", size=None),
            _item("docs/sub/deeper/final.txt", size=13),
        ]

        items = build_browse_items(all_items, "docs", hide_directory_sizes=True)

        assert [entry["size"] for entry in items] == [None]

    def test_directory_sizes_computed_in_single_pass(self):
        # 200 directories x 5 files each; the old implementation rescanned all
        # items once per directory, so its lookup count grew with dirs * items.
        _CountingItem.lookups = 0
        all_items = []
        for dir_index in range(200):
            all_items.append(
                _CountingItem(_item(f"dir{dir_index}", type_="d", size=None))
            )
            for file_index in range(5):
                all_items.append(
                    _CountingItem(_item(f"dir{dir_index}/file{file_index}.txt", size=2))
                )

        items = build_browse_items(all_items, "")

        assert len(items) == 200
        assert all(entry["size"] == 10 for entry in items)
        # Linear bound: a rescan-per-directory implementation needs at least
        # dirs * items = 240_000 lookups; a single pass stays well under that.
        assert _CountingItem.lookups <= 25 * len(all_items)


@pytest.mark.unit
class TestCollectBrowsePaths:
    def test_collects_root_and_intermediate_directories(self):
        all_items = [
            _item("docs/sub", type_="d", size=None),
            _item("docs/sub/deep/file.txt", size=1),
        ]

        assert collect_browse_paths(all_items) == [
            "",
            "docs",
            "docs/sub",
            "docs/sub/deep",
        ]
