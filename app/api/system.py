from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import structlog

from app.core.borg import BorgInterface
from app.core.borg2 import borg2
from app.config import get_runtime_app_version
from app.database.database import get_db

logger = structlog.get_logger()
router = APIRouter(tags=["system"])

# Initialize Borg interface
borg = BorgInterface()


@router.get("/info")
async def get_system_info(db: Session = Depends(get_db)):
    """Get system information including app and borg versions"""
    try:
        # Get app version from VERSION file (primary) or environment variable (fallback)
        app_version = get_runtime_app_version()

        # Get borg version
        borg_version = None
        try:
            system_info = await borg.get_system_info()
            borg_version = system_info.get("borg_version")
        except Exception as e:
            logger.warning("Failed to get borg version", error=str(e))

        # Get borg2 version
        borg2_version = None
        try:
            borg2_info = await borg2.get_system_info()
            if borg2_info.get("success"):
                borg2_version = borg2_info.get("borg_version")
        except Exception as e:
            logger.warning("Failed to get borg2 version", error=str(e))

        return {
            "app_version": app_version,
            "borg_version": borg_version,
            "borg2_version": borg2_version,
        }
    except Exception as e:
        logger.error("Failed to get system info", error=str(e))
        return {
            "app_version": "unknown",
            "borg_version": None,
            "borg2_version": None,
        }
