"""BorgScale is AGPL-3.0 and gates nothing behind a plan.

These tests pin that contract so a plan restriction cannot be reintroduced by
accident, and so the shape /api/system/info publishes stays stable.
"""

import pytest
from sqlalchemy.orm import Session

from app.core.features import (
    FEATURES,
    USER_LIMITS,
    Plan,
    get_current_plan,
    plan_includes,
)


@pytest.mark.unit
class TestPlanIncludes:
    @pytest.mark.parametrize(
        ("current", "required"),
        [
            (Plan.COMMUNITY, Plan.COMMUNITY),
            (Plan.COMMUNITY, Plan.PRO),
            (Plan.COMMUNITY, Plan.ENTERPRISE),
            (Plan.PRO, Plan.ENTERPRISE),
        ],
    )
    def test_every_plan_includes_every_requirement(self, current, required):
        assert plan_includes(current, required) is True


@pytest.mark.unit
class TestCurrentPlan:
    def test_get_current_plan_is_always_community(self, db_session: Session):
        assert get_current_plan(db_session) == Plan.COMMUNITY

    def test_get_current_plan_does_not_require_a_session(self):
        """Callers outside a request scope must be able to ask without a db."""
        assert get_current_plan() == Plan.COMMUNITY


@pytest.mark.unit
class TestNothingIsGated:
    def test_every_feature_is_available_on_community(self):
        assert FEATURES, "feature map should not be empty; /api/system/info publishes it"
        assert set(FEATURES.values()) == {Plan.COMMUNITY}

    def test_borg_v2_is_not_gated(self):
        """Borg 2 is a headline capability and must never be plan-restricted."""
        assert FEATURES["borg_v2"] is Plan.COMMUNITY

    def test_no_plan_caps_the_number_of_users(self):
        assert set(USER_LIMITS) == set(Plan)
        assert all(limit is None for limit in USER_LIMITS.values())
