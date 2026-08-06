"""
Unit tests for system API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch


@pytest.mark.unit
class TestSystemEndpoints:
    """Test system API endpoints"""

    def test_system_info(self, test_client: TestClient, admin_headers):
        response = test_client.get("/api/system/info", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert set(data) == {"app_version", "borg_version", "borg2_version"}

    def test_system_info_reports_no_plan_or_entitlement(
        self, test_client: TestClient, admin_headers
    ):
        """Nothing is gated, so the payload must not imply otherwise.

        A `plan` or `features` field here is what a client would build tier
        gating against, so its absence is part of the contract.
        """
        response = test_client.get("/api/system/info", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        for field in ("plan", "features", "feature_access", "entitlement"):
            assert field not in data, f"{field} must not appear in system info"

    def test_system_info_without_auth(self, test_client: TestClient):
        response = test_client.get("/api/system/info")

        assert response.status_code == 200

    def test_system_info_uses_reported_versions(
        self, test_client: TestClient, admin_headers
    ):
        with patch(
            "app.api.system.borg.get_system_info",
            new=AsyncMock(return_value={"borg_version": "1.2.3"}),
        ):
            with patch(
                "app.api.system.borg2.get_system_info",
                new=AsyncMock(return_value={"success": True, "borg_version": "2.0.0"}),
            ):
                response = test_client.get("/api/system/info", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["borg_version"] == "1.2.3"
        assert data["borg2_version"] == "2.0.0"

    def test_system_info_falls_back_when_borg_checks_fail(
        self, test_client: TestClient, admin_headers
    ):
        with patch("app.api.system.get_runtime_app_version", return_value="dev"):
            with patch(
                "app.api.system.borg.get_system_info",
                new=AsyncMock(side_effect=RuntimeError("boom")),
            ):
                with patch(
                    "app.api.system.borg2.get_system_info",
                    new=AsyncMock(side_effect=RuntimeError("boom")),
                ):
                    response = test_client.get(
                        "/api/system/info", headers=admin_headers
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["app_version"] == "dev"
        assert data["borg_version"] is None
        assert data["borg2_version"] is None

    def test_system_info_reads_version_file(
        self, test_client: TestClient, admin_headers
    ):
        with patch("app.api.system.get_runtime_app_version", return_value="7.8.9"):
            with patch(
                "app.api.system.borg.get_system_info",
                new=AsyncMock(return_value={"borg_version": "1.4.3"}),
            ):
                with patch(
                    "app.api.system.borg2.get_system_info",
                    new=AsyncMock(return_value={"success": False}),
                ):
                    response = test_client.get(
                        "/api/system/info", headers=admin_headers
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["app_version"] == "7.8.9"
        assert data["borg_version"] == "1.4.3"
        assert data["borg2_version"] is None

    def test_system_info_returns_safe_fallback_on_unexpected_error(
        self, test_client: TestClient, admin_headers
    ):
        with patch(
            "app.api.system.get_runtime_app_version",
            side_effect=RuntimeError("version unreadable"),
        ):
            response = test_client.get("/api/system/info", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["app_version"] == "unknown"
        assert data["borg_version"] is None
        assert data["borg2_version"] is None


@pytest.mark.unit
class TestLicensingEndpointsAreGone:
    """The licensing surface is removed, not merely inert.

    A stub that answers 200 invites a client to build a tier check against it.
    """

    @pytest.mark.parametrize(
        ("method", "path"),
        [
            ("get", "/api/system/licensing/status"),
            ("post", "/api/system/licensing/import"),
        ],
    )
    def test_licensing_routes_are_not_served(
        self, test_client: TestClient, admin_headers, method, path
    ):
        response = getattr(test_client, method)(path, headers=admin_headers)
        # 404 when nothing matches the path; 405 when only the SPA catch-all
        # does, which serves GET alone. Either proves the route is gone.
        assert response.status_code in (404, 405)
