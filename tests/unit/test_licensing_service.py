"""Tests for the BorgScale licensing stub.

All functions must return the constant open-source entitlement.
No HTTP, no DB writes, no activation keys.
"""
import pytest
from unittest.mock import MagicMock

from app.services.licensing_service import (
    UNRESTRICTED_ENTITLEMENT,
    activate_paid_license,
    deactivate_paid_license,
    get_effective_plan_value,
    get_entitlement_summary,
    get_feature_access,
    get_or_create_licensing_state,
    import_offline_entitlement,
    refresh_entitlement,
    utc_now,
)


@pytest.fixture
def db():
    return MagicMock()


@pytest.mark.unit
def test_get_effective_plan_value_returns_community(db):
    assert get_effective_plan_value(db) == "community"


@pytest.mark.unit
def test_get_entitlement_summary_is_full_access(db):
    summary = get_entitlement_summary(db)
    assert summary["status"] == "active"
    assert summary["is_full_access"] is True
    assert summary["access_level"] == "full_access"
    assert summary["entitlement_id"] == "open-source"


@pytest.mark.unit
def test_get_feature_access_returns_empty_dict(db):
    assert get_feature_access(db) == {}


@pytest.mark.unit
def test_get_or_create_licensing_state_has_instance_id(db):
    state = get_or_create_licensing_state(db)
    assert state.instance_id == "open-source"


@pytest.mark.unit
def test_import_offline_entitlement_returns_imported(db):
    result = import_offline_entitlement(db, {"payload": {}, "signature": "x"})
    assert result["result"] == "imported"
    assert result["entitlement"]["tier"] == "full"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_activate_paid_license_returns_open_source(db):
    result = await activate_paid_license(db, license_key="ANY", app_version="1.0.0")
    assert result["result"] == "open-source"
    assert result["entitlement"]["entitlement_id"] == "open-source"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_deactivate_paid_license_returns_open_source(db):
    result = await deactivate_paid_license(db)
    assert result["result"] == "open-source"
    assert result["entitlement"]["tier"] == "full"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_refresh_entitlement_returns_unchanged(db):
    result = await refresh_entitlement(db, app_version="1.0.0")
    assert result["result"] == "unchanged"
    assert result["entitlement"]["entitlement_id"] == "open-source"


@pytest.mark.unit
def test_utc_now_returns_aware_datetime():
    from datetime import timezone
    dt = utc_now()
    assert dt.tzinfo is not None
    assert dt.tzinfo == timezone.utc


@pytest.mark.unit
def test_unrestricted_entitlement_constant_has_expected_shape():
    assert UNRESTRICTED_ENTITLEMENT["tier"] == "full"
    assert UNRESTRICTED_ENTITLEMENT["entitlement_id"] == "open-source"
    assert UNRESTRICTED_ENTITLEMENT["status"] == "active"
    assert "all" in UNRESTRICTED_ENTITLEMENT["features"]
