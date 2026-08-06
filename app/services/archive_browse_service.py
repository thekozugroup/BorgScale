"""Shared archive browsing helpers for v1/v2 and restore/archive routes."""

from __future__ import annotations

import json
from typing import Dict, List


def parse_archive_items(stdout: str) -> List[Dict]:
    """Parse borg --json-lines output into normalized archive items."""
    items: List[Dict] = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            item_data = json.loads(line)
        except json.JSONDecodeError:
            continue

        item_path = (item_data.get("path") or "").strip("/")
        if not item_path:
            continue

        items.append(
            {
                "path": item_path,
                "type": item_data.get("type", ""),
                "size": item_data.get("size"),
                "mtime": item_data.get("mtime"),
            }
        )

    return items


def build_browse_items(
    all_items: List[Dict], path: str, *, hide_directory_sizes: bool = False
) -> List[Dict]:
    """Build immediate children for a browse path from a full/raw item list."""
    normalized_path = path.strip("/")
    search_prefix = f"{normalized_path}/" if normalized_path else ""

    # Accumulate each file's size onto the immediate child it falls under in a
    # single pass — rescanning the full item list per directory is O(dirs * items).
    child_sizes: Dict[str, int] = {}
    if not hide_directory_sizes:
        for item in all_items:
            if item.get("type") == "d" or item.get("size") is None:
                continue

            item_path = (item.get("path") or "").strip("/")
            if not item_path:
                continue

            if search_prefix:
                if not item_path.startswith(search_prefix):
                    continue
                relative_path = item_path[len(search_prefix) :]
            else:
                relative_path = item_path

            if not relative_path:
                continue

            child_name = relative_path.split("/", 1)[0]
            child_sizes[child_name] = child_sizes.get(child_name, 0) + item.get(
                "size", 0
            )

    items: List[Dict] = []
    seen_paths = set()

    for item in all_items:
        item_path = (item.get("path") or "").strip("/")
        item_type = item.get("type", "")
        item_size = item.get("size")
        item_mtime = item.get("mtime")

        if not item_path:
            continue

        if normalized_path:
            if item_path == normalized_path:
                continue
            if not item_path.startswith(normalized_path + "/"):
                continue
            relative_path = item_path[len(normalized_path) + 1 :]
        else:
            relative_path = item_path

        if not relative_path:
            continue

        if "/" in relative_path:
            dir_name = relative_path.split("/")[0]
            if dir_name in seen_paths:
                continue
            seen_paths.add(dir_name)
            full_dir_path = (
                f"{normalized_path}/{dir_name}" if normalized_path else dir_name
            )
            items.append(
                {
                    "name": dir_name,
                    "type": "directory",
                    "size": None
                    if hide_directory_sizes
                    else child_sizes.get(dir_name, 0),
                    "mtime": None,
                    "path": full_dir_path,
                }
            )
            continue

        if relative_path in seen_paths:
            continue
        seen_paths.add(relative_path)
        full_path = (
            f"{normalized_path}/{relative_path}" if normalized_path else relative_path
        )

        if item_type == "d":
            items.append(
                {
                    "name": relative_path,
                    "type": "directory",
                    "size": None
                    if hide_directory_sizes
                    else child_sizes.get(relative_path, 0),
                    "mtime": item_mtime,
                    "path": full_path,
                }
            )
        else:
            items.append(
                {
                    "name": relative_path,
                    "type": "file",
                    "size": item_size,
                    "mtime": item_mtime,
                    "path": full_path,
                }
            )

    items.sort(key=lambda entry: (entry["type"] != "directory", entry["name"].lower()))
    return items


def collect_browse_paths(all_items: List[Dict]) -> List[str]:
    """Collect every directory path that can be browsed, including root."""
    paths = {""}

    for item in all_items:
        item_path = (item.get("path") or "").strip("/")
        if not item_path:
            continue

        parts = item_path.split("/")
        max_depth = len(parts) if item.get("type") == "d" else len(parts) - 1
        for depth in range(1, max_depth + 1):
            paths.add("/".join(parts[:depth]))

    return sorted(paths)
