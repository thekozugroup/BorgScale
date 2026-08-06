"""One user must not be able to read another user's repositories.

BorgScale grants repository access per user through UserRepositoryPermission.
The v1 archive endpoints enforce that on every route; the v2 endpoints resolved
a repository by id with no user in scope at all, so any authenticated account
could list, inspect and download files from every Borg 2 repository.

These tests pin the invariant on both API generations, because the failure mode
is silent: nothing errors, the caller simply receives someone else's data.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.core.security import create_access_token, get_password_hash
from app.database.models import Repository, User, UserRepositoryPermission


def _make_user(db, username: str, role: str = "viewer") -> User:
    user = User(
        username=username,
        password_hash=get_password_hash("x"),
        is_active=True,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_repo(db, name: str, borg_version: int = 1) -> Repository:
    repo = Repository(
        name=name,
        path=f"/backup/{name}",
        encryption="none",
        borg_version=borg_version,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo


def _grant(db, user: User, repo: Repository, role: str = "viewer") -> None:
    db.add(
        UserRepositoryPermission(
            user_id=user.id,
            repository_id=repo.id,
            role=role,
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()


def _headers(user: User) -> dict:
    return {"X-Borg-Authorization": f"Bearer {create_access_token(data={'sub': user.username})}"}


@pytest.fixture
def two_tenants(test_db):
    """Two viewers, each permitted on exactly one repository."""
    alice = _make_user(test_db, "alice_iso")
    bob = _make_user(test_db, "bob_iso")

    alice_repo_v1 = _make_repo(test_db, "alice-v1", borg_version=1)
    bob_repo_v1 = _make_repo(test_db, "bob-v1", borg_version=1)
    alice_repo_v2 = _make_repo(test_db, "alice-v2", borg_version=2)
    bob_repo_v2 = _make_repo(test_db, "bob-v2", borg_version=2)

    _grant(test_db, alice, alice_repo_v1)
    _grant(test_db, alice, alice_repo_v2)
    _grant(test_db, bob, bob_repo_v1)
    _grant(test_db, bob, bob_repo_v2)

    return {
        "alice": alice,
        "bob": bob,
        "alice_v1": alice_repo_v1,
        "bob_v1": bob_repo_v1,
        "alice_v2": alice_repo_v2,
        "bob_v2": bob_repo_v2,
    }


@pytest.mark.unit
class TestBorgV2ArchiveIsolation:
    """The v2 archive API resolves repositories through _get_v2_repo."""

    def test_viewer_cannot_list_another_users_v2_archives(
        self, test_client, two_tenants
    ):
        response = test_client.get(
            "/api/v2/archives/list",
            params={"repository": str(two_tenants["bob_v2"].id)},
            headers=_headers(two_tenants["alice"]),
        )
        assert response.status_code == 403, response.text

    def test_viewer_cannot_read_another_users_v2_archive_contents(
        self, test_client, two_tenants
    ):
        response = test_client.get(
            "/api/v2/archives/some-archive/contents",
            params={"repository": str(two_tenants["bob_v2"].id)},
            headers=_headers(two_tenants["alice"]),
        )
        assert response.status_code == 403, response.text

    def test_viewer_cannot_read_another_users_v2_archive_info(
        self, test_client, two_tenants
    ):
        response = test_client.get(
            "/api/v2/archives/some-archive/info",
            params={"repository": str(two_tenants["bob_v2"].id)},
            headers=_headers(two_tenants["alice"]),
        )
        assert response.status_code == 403, response.text

    def test_viewer_can_still_reach_their_own_v2_repository(
        self, test_client, two_tenants
    ):
        """The check must not lock users out of what they are entitled to.

        Borg is not going to find a real repository at this path, so anything
        other than 403 means authorization allowed the request through.
        """
        response = test_client.get(
            "/api/v2/archives/list",
            params={"repository": str(two_tenants["alice_v2"].id)},
            headers=_headers(two_tenants["alice"]),
        )
        assert response.status_code != 403, response.text


@pytest.mark.unit
class TestBorgV1ArchiveIsolation:
    """v1 is the reference behaviour the v2 routes were missing."""

    def test_viewer_cannot_list_another_users_v1_archives(
        self, test_client, two_tenants
    ):
        response = test_client.get(
            "/api/archives/list",
            params={"repository": two_tenants["bob_v1"].path},
            headers=_headers(two_tenants["alice"]),
        )
        assert response.status_code == 403, response.text


@pytest.mark.unit
class TestAdminRetainsAccess:
    def test_admin_reaches_any_repository(self, test_client, two_tenants, test_db):
        admin = _make_user(test_db, "admin_iso", role="admin")

        response = test_client.get(
            "/api/v2/archives/list",
            params={"repository": str(two_tenants["bob_v2"].id)},
            headers=_headers(admin),
        )
        assert response.status_code != 403, response.text
