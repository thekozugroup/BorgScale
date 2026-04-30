#!/usr/bin/env bash
set -euo pipefail

# Detect context
STAGED=$(git diff --cached --name-only 2>/dev/null || true)

echo "==> 1/4 gitleaks"
if ! command -v gitleaks >/dev/null; then
  echo "gitleaks not installed; install via: sudo apt install gitleaks" >&2
  exit 1
fi

if [ -n "$STAGED" ]; then
  # Developer pre-push: scan staged tree
  gitleaks protect --staged --no-banner --redact
else
  # CI or fresh checkout: scan full source
  gitleaks detect --source . --no-banner --redact
fi

echo "==> 2/4 outbound-URL allowlist scan"
ALLOW='github\.com|ghcr\.io|127\.0\.0\.1|localhost|tailscale\.com|docker\.io|pypi\.org|npmjs\.org|npm\.pkg\.github\.com|lucide\.dev|ui\.shadcn\.com|gnu\.org|borgbackup\.readthedocs\.io|impeccable\.style|w3\.org|anthropic\.com'

if [ -n "$STAGED" ]; then
  # Developer pre-push: scan staged diff
  DIFF=$(git diff --cached)
else
  # CI or fresh checkout: scan last commit diff (fallback for single-commit repos)
  if git rev-parse HEAD~1 >/dev/null 2>&1; then
    DIFF=$(git diff HEAD~1..HEAD)
  else
    DIFF=$(git diff HEAD^..HEAD 2>/dev/null || true)
  fi
fi

NEW_URLS=$(echo "$DIFF" | grep -E '^\+.*https?://' | grep -oE 'https?://[A-Za-z0-9._~:/?#@!$&'\''()*+,;=%-]+' | sort -u || true)
DISALLOWED=$(echo "$NEW_URLS" | grep -vE "$ALLOW" || true)
if [ -n "$DISALLOWED" ]; then
  echo "newly-introduced URLs not on allowlist:" >&2
  echo "$DISALLOWED" >&2
  exit 1
fi

echo "==> 3/4 pip-audit"
if command -v pip-audit >/dev/null; then
  pip-audit -r requirements.txt
elif [ -n "${CI:-}" ]; then
  echo "pip-audit missing in CI environment — install via 'pip install pip-audit'" >&2
  exit 1
else
  echo "pip-audit missing locally; skipping (install: pip install pip-audit)" >&2
fi

echo "==> 4/4 npm audit (frontend)"
if [ -f frontend/package-lock.json ]; then
  ( cd frontend && npm audit --audit-level high )
else
  echo "frontend lockfile missing; skipping npm audit"
fi

if [ "${BORGSCALE_DOCKER_SMOKE:-0}" = "1" ]; then
  echo "==> 5/5 docker --network none smoke"
  docker build -t borgscale:smoke .
  CID=$(docker run -d --rm --network none borgscale:smoke)
  trap 'docker stop "$CID" >/dev/null 2>&1 || true' EXIT
  for _ in $(seq 1 30); do
    if docker exec "$CID" curl -fsS http://127.0.0.1:8081/api/health >/dev/null 2>&1; then
      echo "  container healthy"
      break
    fi
    sleep 1
  done
  docker exec "$CID" curl -fsS http://127.0.0.1:8081/api/health >/dev/null
  docker stop "$CID" >/dev/null
  trap - EXIT
fi

echo "OK"
