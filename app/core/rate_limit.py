"""In-process rate limiting for authentication endpoints.

BorgScale runs as a single process, so an in-memory limiter is sufficient and
avoids making Redis a hard dependency of being able to sign in. If the
deployment ever grows to multiple workers this becomes per-worker, which is a
weaker guarantee but still bounds an attacker's rate.

The window is per (endpoint, client) rather than per username: keying on the
username alone lets an attacker lock a legitimate user out by spraying their
account, and keying on the client alone lets a distributed attempt through.
Both keys are tracked, and either one tripping is enough to refuse.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

import structlog
from fastapi import HTTPException, Request, status

logger = structlog.get_logger()

# Generous enough that a person fat-fingering a password never notices, tight
# enough that online guessing is impractical.
MAX_ATTEMPTS = 10
WINDOW_SECONDS = 300
LOCKOUT_SECONDS = 300

_attempts: Dict[str, Deque[float]] = defaultdict(deque)
_locked_until: Dict[str, float] = {}


def _prune(key: str, now: float) -> None:
    window = _attempts[key]
    while window and now - window[0] > WINDOW_SECONDS:
        window.popleft()
    if not window:
        _attempts.pop(key, None)


def _client_key(request: Request) -> str:
    """Identify the caller.

    Behind a reverse proxy every request carries the proxy's address, so the
    forwarded client is preferred when present. This is spoofable by anyone
    talking to BorgScale directly, which is why the username key exists too.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request, username: str | None = None) -> None:
    """Raise 429 when this caller has failed too often recently."""
    now = time.monotonic()
    keys = [f"ip:{_client_key(request)}"]
    if username:
        keys.append(f"user:{username.lower()}")

    for key in keys:
        locked_until = _locked_until.get(key)
        if locked_until and locked_until > now:
            retry_after = int(locked_until - now) + 1
            logger.warning(
                "Rejected authentication attempt from a rate-limited caller",
                key=key,
                retry_after=retry_after,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={"key": "backend.errors.auth.tooManyAttempts"},
                headers={"Retry-After": str(retry_after)},
            )
        if locked_until:
            _locked_until.pop(key, None)


def record_failure(request: Request, username: str | None = None) -> None:
    """Count a failed attempt and start a lockout once the limit is crossed."""
    now = time.monotonic()
    keys = [f"ip:{_client_key(request)}"]
    if username:
        keys.append(f"user:{username.lower()}")

    for key in keys:
        _prune(key, now)
        _attempts[key].append(now)
        if len(_attempts[key]) >= MAX_ATTEMPTS:
            _locked_until[key] = now + LOCKOUT_SECONDS
            _attempts.pop(key, None)
            logger.warning(
                "Authentication rate limit tripped",
                key=key,
                lockout_seconds=LOCKOUT_SECONDS,
            )


def record_success(request: Request, username: str | None = None) -> None:
    """Clear the counters so a legitimate sign-in resets the window."""
    keys = [f"ip:{_client_key(request)}"]
    if username:
        keys.append(f"user:{username.lower()}")

    for key in keys:
        _attempts.pop(key, None)
        _locked_until.pop(key, None)


def reset() -> None:
    """Drop all state. For tests."""
    _attempts.clear()
    _locked_until.clear()
