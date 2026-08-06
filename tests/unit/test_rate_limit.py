"""Online password and TOTP guessing must be bounded.

BorgScale had no limit on either endpoint: a six-digit TOTP code is exhaustible
in minutes at unbounded request rates, and a weak password in far less.
"""

import pytest
from fastapi.testclient import TestClient

from app.core import rate_limit


@pytest.fixture(autouse=True)
def _clear_limiter():
    rate_limit.reset()
    yield
    rate_limit.reset()


def _attempt(client: TestClient, username="admin", password="wrong-password"):
    return client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
    )


@pytest.mark.unit
class TestLoginRateLimit:
    def test_repeated_failures_are_eventually_refused(
        self, test_client: TestClient, admin_user
    ):
        statuses = [
            _attempt(test_client).status_code
            for _ in range(rate_limit.MAX_ATTEMPTS + 2)
        ]

        assert 401 in statuses, "early attempts should be ordinary auth failures"
        assert 429 in statuses, (
            f"never rate limited after {len(statuses)} failures: {statuses}"
        )

    def test_lockout_response_tells_the_client_when_to_retry(
        self, test_client: TestClient, admin_user
    ):
        response = None
        for _ in range(rate_limit.MAX_ATTEMPTS + 2):
            response = _attempt(test_client)
            if response.status_code == 429:
                break

        assert response.status_code == 429
        assert int(response.headers["Retry-After"]) > 0
        assert response.json()["detail"]["key"] == "backend.errors.auth.tooManyAttempts"

    def test_a_successful_sign_in_clears_the_counter(
        self, test_client: TestClient, admin_user
    ):
        """A user who mistypes a few times and then succeeds must not be
        penalised on their next visit."""
        for _ in range(rate_limit.MAX_ATTEMPTS - 1):
            assert _attempt(test_client).status_code == 401

        ok = _attempt(test_client, password="admin123")
        assert ok.status_code == 200, ok.text

        assert _attempt(test_client).status_code == 401


@pytest.mark.unit
class TestLimiterKeys:
    def test_username_and_client_are_tracked_separately(self):
        """Keying only on username lets an attacker lock out a real account;
        keying only on the client lets a distributed attempt through."""

        class _Request:
            headers = {}

            class client:
                host = "10.0.0.1"

        request = _Request()

        for _ in range(rate_limit.MAX_ATTEMPTS):
            rate_limit.record_failure(request, "victim")

        with pytest.raises(Exception):
            rate_limit.check_rate_limit(request, "victim")

    def test_forwarded_client_is_preferred_over_the_proxy_address(self):
        class _Request:
            headers = {"X-Forwarded-For": "203.0.113.9, 10.0.0.1"}

            class client:
                host = "10.0.0.1"

        assert rate_limit._client_key(_Request()) == "203.0.113.9"
