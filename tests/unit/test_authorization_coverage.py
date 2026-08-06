"""Behavioural authorization coverage for every state-changing API route.

BorgScale enforces authorization two different ways: declaratively through
``ENDPOINT_POLICIES`` in ``app.core.authorization``, and imperatively through
inline ``if not current_user.is_admin`` checks inside handlers. Because there is
no single place to read, a route can be added with neither and nothing will say
so.

These tests call every state-changing route as a signed-out client and as a
low-privilege ``viewer``, and assert the response. That covers both mechanisms
at once, and it fails when a *new* route lands unguarded — a static scan of the
policy table cannot do that.

Path parameters are filled with ids that do not exist, so a route which does
reach its handler exits on a lookup rather than performing real work.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.authorization import _normalize_path

STATE_CHANGING = {"POST", "PUT", "PATCH", "DELETE"}

# Routes a viewer is *meant* to reach. Everything else must be refused.
#
# Adding an entry here is a security decision: it asserts that the lowest
# privilege level in the product may perform this operation. Explain any new
# entry in a comment.
VIEWER_ALLOWED: set[tuple[str, str]] = {
    # Authentication and session management: reachable before a role exists.
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/login/totp"),
    ("POST", "/api/auth/logout"),
    ("POST", "/api/auth/refresh"),
    ("POST", "/api/auth/passkeys/authenticate/options"),
    ("POST", "/api/auth/passkeys/authenticate/verify"),
    # Self-service account management: a user manages their own credentials.
    ("POST", "/api/auth/change-password"),
    ("POST", "/api/auth/password-setup/skip"),
    ("POST", "/api/auth/passkeys/register/options"),
    ("POST", "/api/auth/passkeys/register/verify"),
    ("DELETE", "/api/auth/passkeys/{passkey_id}"),
    ("POST", "/api/auth/totp/setup"),
    ("POST", "/api/auth/totp/enable"),
    ("POST", "/api/auth/totp/disable"),
    ("POST", "/api/settings/change-password"),
    ("PUT", "/api/settings/profile"),
    ("PUT", "/api/settings/preferences"),
    ("POST", "/api/settings/tokens"),
    ("DELETE", "/api/settings/tokens/{token_id}"),
    # Pure computation with no side effects and no data access.
    ("POST", "/api/schedule/validate-cron"),
}

# Routes excluded from the signed-out check because they are the sign-in
# surface itself.
UNAUTHENTICATED_ALLOWED: set[tuple[str, str]] = {
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/login/totp"),
    ("POST", "/api/auth/logout"),
    ("POST", "/api/auth/refresh"),
    ("POST", "/api/auth/passkeys/authenticate/options"),
    ("POST", "/api/auth/passkeys/authenticate/verify"),
}

# Filled into path parameters. Ids are deliberately absent from the database.
PARAM_VALUES = {
    "job_type": "backup",
    "archive_name": "does-not-exist",
    "path": "does/not/exist",
    "tab": "account",
    "full_path": "does/not/exist",
}
MISSING_ID = "999999"


def _fill(path: str) -> str:
    filled = path
    while "{" in filled:
        start = filled.index("{")
        end = filled.index("}", start)
        name = filled[start + 1 : end].split(":")[0]
        filled = (
            filled[:start] + str(PARAM_VALUES.get(name, MISSING_ID)) + filled[end + 1 :]
        )
    return filled


def _state_changing_routes() -> list[tuple[str, str]]:
    from app.main import app

    routes: set[tuple[str, str]] = set()
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None) or set()
        if not path or not path.startswith("/api"):
            continue
        for method in methods:
            if method in STATE_CHANGING:
                routes.add((method, _normalize_path(path)))
    return sorted(routes)


def _call(client: TestClient, method: str, path: str, headers: dict) -> int:
    return client.request(method, _fill(path), json={}, headers=headers).status_code


@pytest.mark.unit
class TestAuthorizationCoverage:
    def test_there_are_state_changing_routes_to_check(self):
        """Guard against the enumeration silently returning nothing."""
        assert len(_state_changing_routes()) > 50

    def test_no_state_changing_route_succeeds_without_authentication(
        self, test_client: TestClient
    ):
        reachable = []
        for method, path in _state_changing_routes():
            if (method, path) in UNAUTHENTICATED_ALLOWED:
                continue
            status = _call(test_client, method, path, headers={})
            if status < 400:
                reachable.append(f"{method} {path} -> {status}")

        assert reachable == [], (
            "state-changing routes reachable with no credentials:\n  "
            + "\n  ".join(reachable)
        )

    def test_viewers_cannot_reach_privileged_state_changing_routes(
        self, test_client: TestClient, auth_headers, test_user
    ):
        """A viewer must not be able to mutate anything outside VIEWER_ALLOWED.

        A 2xx here means the lowest-privilege role performed a privileged
        operation — for routes like POST /api/scripts/test that is remote code
        execution on the host.
        """
        assert test_user.role == "viewer"

        reachable = []
        for method, path in _state_changing_routes():
            if (method, path) in VIEWER_ALLOWED:
                continue
            status = _call(test_client, method, path, headers=auth_headers)
            if status < 400:
                reachable.append(f"{method} {path} -> {status}")

        assert reachable == [], (
            "routes a viewer can successfully invoke:\n  " + "\n  ".join(reachable)
        )

    def test_viewer_allowlist_has_no_stale_entries(self):
        """Every allowlisted route must still exist.

        A stale entry is a silent permission grant waiting for a future route to
        reuse the path.
        """
        existing = set(_state_changing_routes())
        stale = sorted(VIEWER_ALLOWED - existing)
        assert stale == [], f"VIEWER_ALLOWED lists routes that no longer exist: {stale}"

    def test_no_two_handlers_answer_the_same_route_shape(self):
        """Two *different* handlers on the same route shape shadow each other.

        FastAPI matches the first registration, so the second becomes dead code
        that still reads as authoritative — and the two copies drift apart on
        exactly the checks that matter, such as a permission test present in one
        and missing from the other.

        Registering one handler under both "" and "/" is a deliberate
        trailing-slash alias and is not shadowing, so this compares endpoint
        functions rather than paths.
        """
        import re

        from app.main import app

        shapes: dict[tuple[str, str], set] = {}
        for route in app.routes:
            path = getattr(route, "path", None)
            endpoint = getattr(route, "endpoint", None)
            methods = getattr(route, "methods", None) or set()
            if not path or not path.startswith("/api") or endpoint is None:
                continue
            shape = re.sub(r"\{[^}]+\}", "{}", _normalize_path(path))
            for method in methods:
                if method in ("HEAD", "OPTIONS"):
                    continue
                shapes.setdefault((method, shape), set()).add(endpoint)

        duplicates = {
            f"{method} {shape}": sorted(
                f"{fn.__module__}.{fn.__qualname__}" for fn in endpoints
            )
            for (method, shape), endpoints in shapes.items()
            if len(endpoints) > 1
        }
        assert duplicates == {}, f"distinct handlers shadowing each other: {duplicates}"
