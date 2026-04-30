from fastapi import APIRouter

try:
    from app import __version__ as APP_VERSION  # type: ignore[attr-defined]
except Exception:
    APP_VERSION = "0.1.0"


router = APIRouter()


@router.get("/about")
def about() -> dict:
    """AGPL-3.0 §13 source-disclosure endpoint.

    Hosted instances of BorgScale must offer the source. This endpoint
    returns a machine-readable pointer.
    """
    return {
        "name": "BorgScale",
        "version": APP_VERSION,
        "source": "https://github.com/thekozugroup/BorgScale",
        "license": "AGPL-3.0",
        "license_url": "https://www.gnu.org/licenses/agpl-3.0.html",
        "upstream": "https://github.com/karanhudia/borg-ui",
    }
