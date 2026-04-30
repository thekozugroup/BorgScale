"""Licensing stub for BorgScale.

BorgScale is AGPL-3.0 and runs unrestricted. This module preserves the
public function names of the upstream activation client so existing
callers compile, but every call returns the constant "full access"
entitlement. No HTTP, no database writes.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

UNRESTRICTED_ENTITLEMENT: dict[str, Any] = {
    "tier": "full",
    "entitlement_id": "open-source",
    "expires_at": None,
    "status": "active",
    "features": ["all"],
}

_SUMMARY: dict[str, Any] = {
    "status": "active",
    "access_level": "full_access",
    "is_full_access": True,
    "full_access_consumed": True,
    "expires_at": None,
    "starts_at": None,
    "refresh_after": None,
    "instance_id": "open-source",
    "entitlement_id": "open-source",
    "license_id": None,
    "customer_id": None,
    "ui_state": "full",
    "last_refresh_at": None,
    "last_refresh_error": None,
}


def utc_now() -> datetime:
    return datetime.now(tz=timezone.utc)


def get_effective_plan_value(db: Session) -> str:
    return "community"


def get_entitlement_summary(db: Session) -> dict[str, Any]:
    return dict(_SUMMARY)


def get_feature_access(db: Session) -> dict[str, Any]:
    return {}


def get_or_create_licensing_state(db: Session) -> Any:
    """Return a minimal object with instance_id for back-compat."""
    class _State:
        instance_id = "open-source"
    return _State()


def import_offline_entitlement(db: Session, document: dict) -> dict[str, Any]:
    return {"result": "imported", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}


async def attempt_auto_full_access_activation(db: Session, app_version: str) -> None:
    return None


async def refresh_entitlement(db: Session, *, app_version: str) -> dict[str, Any]:
    return {"result": "unchanged", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}


async def activate_paid_license(db: Session, *args: Any, **kwargs: Any) -> dict[str, Any]:
    return {"result": "open-source", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}


async def deactivate_paid_license(db: Session, *args: Any, **kwargs: Any) -> dict[str, Any]:
    return {"result": "open-source", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}
