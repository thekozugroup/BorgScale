from dataclasses import dataclass
from typing import Dict, Tuple

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_any_role
from app.database.database import get_db


@dataclass(frozen=True)
class EndpointPolicy:
    roles: Tuple[str, ...]
    detail_key: str


def _normalize_path(path: str) -> str:
    if path != "/" and path.endswith("/"):
        return path.rstrip("/")
    return path


ENDPOINT_POLICIES: Dict[Tuple[str, str], EndpointPolicy] = {
    ("PUT", "/api/settings/system"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/settings/refresh-stats"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("GET", "/api/settings/users"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/settings/users"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("PUT", "/api/settings/users/{user_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("DELETE", "/api/settings/users/{user_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/settings/users/{user_id}/reset-password"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/settings/system/cleanup"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/settings/system/logs/cleanup"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/settings/cache/clear"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("PUT", "/api/settings/cache/settings"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("GET", "/api/packages"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/packages"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/packages/{package_id}/install"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("PUT", "/api/packages/{package_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("DELETE", "/api/packages/{package_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/packages/{package_id}/reinstall"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("GET", "/api/packages/jobs/{job_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("GET", "/api/packages/jobs"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("POST", "/api/repositories"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/repositories/import"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/repositories/guided-setup"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/repositories/{repo_id}/keyfile"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("GET", "/api/repositories/{repo_id}/keyfile"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("PUT", "/api/repositories/{repo_id}"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("DELETE", "/api/repositories/{repo_id}"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/repositories/{repo_id}/compact"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/repositories/{repo_id}/prune"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/ssh-keys"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("POST", "/api/ssh-keys/generate"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("POST", "/api/ssh-keys/import"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("POST", "/api/ssh-keys/quick-setup"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("POST", "/api/ssh-keys/{key_id}/deploy"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("PUT", "/api/ssh-keys/{key_id}"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("DELETE", "/api/ssh-keys/{key_id}"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    (
        "PATCH",
        "/api/ssh-keys/connections/{connection_id}/backup-source",
    ): EndpointPolicy(("admin",), "backend.errors.ssh.adminAccessRequired"),
    ("POST", "/api/ssh-keys/connections/{connection_id}/verify-borg"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("POST", "/api/mounts/borg"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.mounts.operatorAccessRequired"
    ),
    ("POST", "/api/mounts/borg/unmount/{mount_id}"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.mounts.operatorAccessRequired"
    ),
    ("POST", "/api/schedule"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.schedule.operatorAccessRequired"
    ),
    ("PUT", "/api/schedule/{job_id}"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.schedule.operatorAccessRequired"
    ),
    ("DELETE", "/api/schedule/{job_id}"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.schedule.operatorAccessRequired"
    ),
    ("POST", "/api/schedule/{job_id}/toggle"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.schedule.operatorAccessRequired"
    ),
    ("POST", "/api/schedule/{job_id}/duplicate"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.schedule.operatorAccessRequired"
    ),
    ("POST", "/api/schedule/{job_id}/run-now"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.schedule.operatorAccessRequired"
    ),
    # Running a backup is an operator action, matching schedule run-now. Without
    # these a viewer could start arbitrary backup jobs.
    ("POST", "/api/backup/run"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.backup.operatorAccessRequired"
    ),
    ("POST", "/api/backup/start"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.backup.operatorAccessRequired"
    ),
    ("POST", "/api/backup/cancel/{job_id}"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.backup.operatorAccessRequired"
    ),
    # Restores write to the filesystem.
    ("POST", "/api/restore/start"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.restore.operatorAccessRequired"
    ),
    ("POST", "/api/restore/cancel/{job_id}"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.restore.operatorAccessRequired"
    ),
    # Discovery enumerates the host filesystem and probes remote hosts, so it
    # carries the same weight as creating a repository.
    ("POST", "/api/repositories/discover/local"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/repositories/discover/remote"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    ("POST", "/api/repositories/quick-import"): EndpointPolicy(
        ("admin",), "backend.errors.repo.adminAccessRequired"
    ),
    # Pairing generates a keypair and can persist an SSH connection, which is
    # the same privilege as POST /api/ssh-keys/generate.
    ("POST", "/api/ssh-keys/manual-pair/init"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("POST", "/api/ssh-keys/manual-pair/verify"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("PUT", "/api/ssh-keys/connections/{connection_id}"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("DELETE", "/api/ssh-keys/connections/{connection_id}"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    ("POST", "/api/ssh-keys/connections/{connection_id}/redeploy"): EndpointPolicy(
        ("admin",), "backend.errors.ssh.adminAccessRequired"
    ),
    # Script bodies are executed on the host as the application user, so
    # authoring and running them is administrator-only.
    ("POST", "/api/scripts"): EndpointPolicy(
        ("admin",), "backend.errors.scripts.adminAccessRequired"
    ),
    ("PUT", "/api/scripts/{script_id}"): EndpointPolicy(
        ("admin",), "backend.errors.scripts.adminAccessRequired"
    ),
    ("DELETE", "/api/scripts/{script_id}"): EndpointPolicy(
        ("admin",), "backend.errors.scripts.adminAccessRequired"
    ),
    ("POST", "/api/scripts/test"): EndpointPolicy(
        ("admin",), "backend.errors.scripts.adminAccessRequired"
    ),
    ("POST", "/api/scripts/{script_id}/test"): EndpointPolicy(
        ("admin",), "backend.errors.scripts.adminAccessRequired"
    ),
    ("POST", "/api/scripts/cleanup-orphans"): EndpointPolicy(
        ("admin",), "backend.errors.scripts.adminAccessRequired"
    ),
    # The filesystem browser enumerates the host outside any repository, so a
    # viewer scoped to one repository could otherwise map the whole machine.
    ("GET", "/api/filesystem/browse"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.filesystem.operatorAccessRequired"
    ),
    ("POST", "/api/filesystem/validate-path"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.filesystem.operatorAccessRequired"
    ),
    ("POST", "/api/filesystem/create-folder"): EndpointPolicy(
        ("admin", "operator"), "backend.errors.filesystem.operatorAccessRequired"
    ),
    # Granting repository access is a privilege-escalation primitive.
    ("POST", "/api/settings/users/{user_id}/permissions"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("PUT", "/api/settings/users/{user_id}/permissions/{repo_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("DELETE", "/api/settings/users/{user_id}/permissions/{repo_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("PUT", "/api/settings/users/{user_id}/permissions/scope"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    # The /api/auth user-management routes mirror /api/settings/users and need
    # the same gate; only the settings copy had one.
    ("POST", "/api/auth/users"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("PUT", "/api/auth/users/{user_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
    ("DELETE", "/api/auth/users/{user_id}"): EndpointPolicy(
        ("admin",), "backend.errors.settings.adminAccessRequired"
    ),
}


async def authorize_request(
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    route = request.scope.get("route")
    route_path = _normalize_path(getattr(route, "path", request.url.path))
    policy = ENDPOINT_POLICIES.get((request.method.upper(), route_path))
    if policy is None:
        return

    current_user = await get_current_user(request, db)
    require_any_role(current_user, *policy.roles, detail_key=policy.detail_key)
