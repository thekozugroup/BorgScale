"""Licensing stub for BorgScale.

BorgScale is AGPL-3.0 and runs unrestricted. This module preserves the
public function names of the upstream activation client so existing
callers compile, but every call returns the constant "full access"
entitlement. No HTTP, no database writes.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

UNRESTRICTED_ENTITLEMENT: dict[str, Any] = {
    "tier": "full",
    "entitlement_id": "open-source",
    "expires_at": None,
    "status": "active",
    "features": ["all"],
}


def get_entitlement_summary(db: Session) -> dict[str, Any]:
    return dict(UNRESTRICTED_ENTITLEMENT)


async def attempt_auto_full_access_activation(db: Session, app_version: str) -> None:
    return None


async def refresh_entitlement(db: Session, *, app_version: str) -> dict[str, Any]:
    return {"result": "unchanged", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}


async def activate_paid_license(db: Session, *args: Any, **kwargs: Any) -> dict[str, Any]:
    return {"result": "open-source", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}


async def deactivate_paid_license(db: Session, *args: Any, **kwargs: Any) -> dict[str, Any]:
    return {"result": "open-source", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}
