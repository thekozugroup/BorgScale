from fastapi import APIRouter

from app.config import get_runtime_app_version

router = APIRouter()


@router.get("/about")
def about() -> dict:
    """AGPL-3.0 §13 source-disclosure endpoint.

    Hosted instances of BorgScale must offer the source. This endpoint
    returns a machine-readable pointer.
    """
    return {
        "name": "BorgScale",
        "version": get_runtime_app_version(),
        "source": "https://github.com/thekozugroup/BorgScale",
        "upstream": "https://github.com/karanhudia/borg-ui",
        "license": "AGPL-3.0",
        "license_url": "https://www.gnu.org/licenses/agpl-3.0.html",
    }
