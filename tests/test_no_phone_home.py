"""BorgScale: assert no phone-home traffic at startup or in the hot path.

Uses respx to default-deny every outbound httpx call. Any unmocked
httpx request fails the test with the offending URL captured.
"""
from __future__ import annotations

import importlib
import pkgutil

import pytest
import respx
from fastapi.testclient import TestClient

DENY_HOSTS = {
    "borgui.com",
    "license.borgui.com",
    "updates.borgui.com",
    "umami.is",
    "umami.cloud",
    "posthog.com",
    "sentry.io",
    "segment.io",
    "mixpanel.com",
    "amplitude.com",
    "google-analytics.com",
    "googletagmanager.com",
}


@respx.mock(assert_all_called=False)
def test_no_phone_home_during_full_lifecycle(respx_mock):
    respx_mock.route().respond(status_code=599)

    from app.main import app

    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200, r.text

    r = client.get("/api/system/licensing/status")
    assert r.status_code == 200
    body = r.json()
    assert body["tier"] == "full"
    assert body["entitlement_id"] == "open-source"

    for call in respx_mock.calls:
        host = (call.request.url.host or "").lower()
        for denied in DENY_HOSTS:
            assert denied not in host, f"phone-home detected: {call.request.url}"


def test_no_module_constructs_live_http_client_on_import():
    import app

    pkg = app
    for _, modname, _ in pkgutil.walk_packages(pkg.__path__, prefix=f"{pkg.__name__}."):
        importlib.import_module(modname)
