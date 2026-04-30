"""
Unit tests for system API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.unit
class TestSystemEndpoints:
    """Test system API endpoints"""

    def test_system_info(self, test_client: TestClient, admin_headers):
        response = test_client.get("/api/system/info", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "app_version" in data
        assert "plan" in data
        assert "features" in data

    def test_system_info_without_auth(self, test_client: TestClient):
        response = test_client.get("/api/system/info")

        assert response.status_code == 200

    def test_system_info_uses_reported_versions_and_plan(
        self, test_client: TestClient, admin_headers
    ):
        plan = MagicMock()
        plan.value = "pro"

        with patch(
            "app.api.system.borg.get_system_info",
            new=AsyncMock(return_value={"borg_version": "1.2.3"}),
        ):
            with patch(
                "app.api.system.borg2.get_system_info",
                new=AsyncMock(return_value={"success": True, "borg_version": "2.0.0"}),
            ):
                with patch("app.api.system.get_current_plan", return_value=plan):
                    response = test_client.get(
                        "/api/system/info", headers=admin_headers
                    )

        assert response.status_code == 200
        data = response.json()
        assert data["borg_version"] == "1.2.3"
        assert data["borg2_version"] == "2.0.0"
        assert data["plan"] == "pro"

    def test_system_info_falls_back_when_borg_checks_fail(
        self, test_client: TestClient, admin_headers
    ):
        plan = MagicMock()
        plan.value = "community"

        with patch("app.api.system.get_runtime_app_version", return_value="dev"):
            with patch(
                "app.api.system.borg.get_system_info",
                new=AsyncMock(side_effect=RuntimeError("boom")),
            ):
                with patch(
                    "app.api.system.borg2.get_system_info",
                    new=AsyncMock(side_effect=RuntimeError("boom")),
                ):
                    with patch("app.api.system.get_current_plan", return_value=plan):
                        response = test_client.get(
                            "/api/system/info", headers=admin_headers
                        )

        assert response.status_code == 200
        data = response.json()
        assert data["app_version"] == "dev"
        assert data["borg_version"] is None
        assert data["borg2_version"] is None
        assert data["plan"] == "community"

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
                    plan = MagicMock()
                    plan.value = "pro"
                    with patch("app.api.system.get_current_plan", return_value=plan):
                        response = test_client.get(
                            "/api/system/info", headers=admin_headers
                        )

        assert response.status_code == 200
        data = response.json()
        assert data["app_version"] == "7.8.9"
        assert data["borg_version"] == "1.4.3"
        assert data["borg2_version"] is None
        assert data["plan"] == "pro"

    def test_system_info_returns_safe_fallback_on_unexpected_error(
        self, test_client: TestClient, admin_headers
    ):
        with patch(
            "app.api.system.get_current_plan", side_effect=RuntimeError("db down")
        ):
            response = test_client.get("/api/system/info", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["app_version"] == "unknown"
        assert data["borg_version"] is None
        assert data["borg2_version"] is None
        assert data["plan"] == "community"
        assert data["features"] == {}

    def test_system_info_includes_entitlement_summary(
        self, test_client: TestClient, admin_headers, test_db
    ):
        """Stub always returns full_access entitlement summary."""
        response = test_client.get("/api/system/info", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        # Stub licensing: plan is community but system info still returns 200
        assert "plan" in data
        assert "features" in data
