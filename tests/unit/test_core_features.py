import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.features import (
    FEATURES,
    Plan,
    get_current_plan,
    plan_includes,
    require_feature,
)


@pytest.mark.unit
class TestPlanIncludes:
    @pytest.mark.parametrize(
        ("current", "required", "expected"),
        [
            (Plan.COMMUNITY, Plan.COMMUNITY, True),
            (Plan.PRO, Plan.COMMUNITY, True),
            (Plan.ENTERPRISE, Plan.PRO, True),
            (Plan.COMMUNITY, Plan.PRO, False),
            (Plan.PRO, Plan.ENTERPRISE, False),
        ],
    )
    def test_plan_includes(self, current, required, expected):
        assert plan_includes(current, required) is expected


@pytest.mark.unit
class TestCurrentPlan:
    def test_get_current_plan_defaults_to_community(self, db_session: Session):
        """Stub always returns community (BorgScale is unrestricted at the stub layer)."""
        assert get_current_plan(db_session) == Plan.COMMUNITY


@pytest.mark.unit
class TestRequireFeature:
    def test_require_feature_rejects_unknown_feature(self, db_session: Session):
        dependency = require_feature("unknown_feature").dependency

        with pytest.raises(ValueError, match="Unknown feature"):
            dependency(db_session)

    def test_require_feature_blocks_community_from_enterprise_feature(
        self, db_session: Session
    ):
        """The stub returns community; enterprise-gated features return 403."""
        dependency = require_feature("rbac").dependency

        with pytest.raises(HTTPException) as exc:
            dependency(db_session)

        assert exc.value.status_code == 403
        assert exc.value.detail == {
            "key": "backend.errors.plan.featureNotAvailable",
            "feature": "rbac",
            "required": FEATURES["rbac"].value,
            "current": Plan.COMMUNITY.value,
        }

    def test_require_feature_allows_community_for_community_feature(
        self, db_session: Session
    ):
        """borg_v2 is community-accessible; should not raise."""
        dependency = require_feature("borg_v2").dependency
        assert dependency(db_session) is None
