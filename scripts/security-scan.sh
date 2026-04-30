#!/usr/bin/env bash
set -euo pipefail

echo "==> 1/4 gitleaks (staged)"
if ! command -v gitleaks >/dev/null; then
  echo "gitleaks not installed; install via: sudo apt install gitleaks" >&2
  exit 1
fi
gitleaks protect --staged --no-banner --redact

echo "==> 2/4 outbound-URL allowlist scan (staged diff)"
ALLOW='github\.com|ghcr\.io|127\.0\.0\.1|localhost|tailscale\.com|docker\.io|pypi\.org|npmjs\.org|npm\.pkg\.github\.com|lucide\.dev|ui\.shadcn\.com|gnu\.org|borgbackup\.readthedocs\.io'
NEW_URLS=$(git diff --cached | grep -E '^\+.*https?://' | grep -oE 'https?://[A-Za-z0-9._~:/?#@!$&'\''()*+,;=%-]+' | sort -u || true)
DISALLOWED=$(echo "$NEW_URLS" | grep -vE "$ALLOW" || true)
if [ -n "$DISALLOWED" ]; then
  echo "newly-introduced URLs not on allowlist:" >&2
  echo "$DISALLOWED" >&2
  exit 1
fi

echo "==> 3/4 pip-audit"
if command -v pip-audit >/dev/null; then
  pip-audit -r requirements.txt
else
  echo "pip-audit missing; skipping"
fi

echo "==> 4/4 npm audit (frontend)"
if [ -f frontend/package-lock.json ]; then
  ( cd frontend && npm audit --audit-level high )
else
  echo "frontend lockfile missing; skipping npm audit"
fi

echo "OK"
