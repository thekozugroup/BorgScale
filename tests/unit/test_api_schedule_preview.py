"""Tests for the schedule preview endpoint (Wave 6).

Validates the new GET /api/schedule/preview endpoint that powers the
schedule wizard's live "next runs" preview.
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
class TestSchedulePreview:
    def test_preview_invalid_cron(self, test_client: TestClient, admin_headers):
        resp = test_client.get(
            "/api/schedule/preview?expr=not-a-cron",
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert resp.json()["detail"]["key"] == "backend.errors.schedule.invalidCron"

    def test_preview_daily_returns_3_runs_24h_apart(
        self, test_client: TestClient, admin_headers
    ):
        resp = test_client.get(
            "/api/schedule/preview?expr=0 3 * * *",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert len(body["next_runs"]) == 3
        t0 = datetime.fromisoformat(body["next_runs"][0])
        t1 = datetime.fromisoformat(body["next_runs"][1])
        assert (t1 - t0).total_seconds() == 86400

    def test_preview_count_param(self, test_client: TestClient, admin_headers):
        resp = test_client.get(
            "/api/schedule/preview?expr=0 3 * * *&count=5",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        assert len(resp.json()["next_runs"]) == 5

    def test_preview_count_out_of_range(self, test_client: TestClient, admin_headers):
        resp = test_client.get(
            "/api/schedule/preview?expr=0 3 * * *&count=99",
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert (
            resp.json()["detail"]["key"]
            == "backend.errors.schedule.previewCountOutOfRange"
        )

    def test_preview_unauthorized(self, test_client: TestClient):
        resp = test_client.get("/api/schedule/preview?expr=0 3 * * *")
        # No auth → 401/403 depending on middleware setup
        assert resp.status_code in (401, 403)
