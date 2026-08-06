from __future__ import annotations

from enum import Enum
from typing import Optional


class Plan(str, Enum):
    """Retained so the /api/system/info contract keeps a stable `plan` field.

    BorgScale is AGPL-3.0 and runs unrestricted: every instance is COMMUNITY and
    every feature is available. The other members exist only so older clients
    and stored announcement targeting rules still deserialize.
    """

    COMMUNITY = "community"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# Every feature is available on every plan. Kept as an explicit mapping because
# /api/system/info publishes it and the frontend renders capability hints from it.
FEATURES: dict[str, Plan] = {
    "borg_v2": Plan.COMMUNITY,
    "multi_user": Plan.COMMUNITY,
    "extra_users": Plan.COMMUNITY,
    "rbac": Plan.COMMUNITY,
}

# No plan caps the number of users.
USER_LIMITS: dict[Plan, Optional[int]] = {
    Plan.COMMUNITY: None,
    Plan.PRO: None,
    Plan.ENTERPRISE: None,
}


def plan_includes(current: Plan, required: Plan) -> bool:
    """Always true. BorgScale gates nothing behind a plan."""
    return True


def get_current_plan(db=None) -> Plan:
    return Plan.COMMUNITY
