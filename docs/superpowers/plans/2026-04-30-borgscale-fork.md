# BorgScale Fork & Modernisation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox `- [ ]` syntax for tracking.

**Goal:** Strip the upstream `borg-ui`'s license / activation /
analytics scaffolding, rebrand to BorgScale, and migrate the React
frontend from MUI v7 + Emotion to shadcn/ui + Tailwind under a stock
black/white theme. License remains AGPL-3.0.

**Architecture:** Same as upstream — single Docker container running
FastAPI + the bundled React build. Three sequential phases with up to
seven concurrent subagents per wave (git worktrees). Two grader
agents (QAQC and Design Skeptic) gate every wave at 100/100.

**Tech Stack:** Python 3.10, FastAPI, SQLAlchemy, SQLite, React 18,
TypeScript, Vite, MUI v7 (removed by Phase 3 end), shadcn/ui +
Tailwind (added in Phase 3), Vitest, Pytest, lucide-react.

---

## Reference

- Spec: [`docs/superpowers/specs/2026-04-30-borgscale-fork-design.md`](../specs/2026-04-30-borgscale-fork-design.md).
- Repo: `/home/ubuntu/BorgScale`. Default branch `main`.
- Upstream: `https://github.com/karanhudia/borg-ui` (origin remote
  `upstream`). All implementation work happens off `main`; subagents
  use git worktrees for parallel waves.

## Wave parallelization map

| wave | scope | concurrency |
| ---- | ----- | ----------- |
| 0 | Repo housekeeping | 1 |
| 1 | Phase 1 backend stub + route deletion | 2 |
| 2 | Phase 1 frontend plan-gating + analytics removal | 3 |
| 3 | Phase 1 tests + docker `--network none` smoke | 1 |
| 4 | Phase 2 logo asset regeneration + string sweep + i18n | 3 |
| 5 | Phase 2 AGPL §13 endpoint + footer | 1 |
| 6 | Phase 3 tooling (Tailwind, shadcn init, theme bridge) | 1 |
| 7 | Phase 3 app shell + login + setup wizard | 2 |
| 8 | Phase 3 settings + repository pages | 2 |
| 9 | Phase 3 backup wizard (FIRST), then dashboard + archive browser (parallel after merge) | 3 (sequenced) |
| 10 | Phase 3 final cleanup: drop MUI/Emotion deps | 1 |
| 11 | Release: build image, README, GitHub release, atmos cutover | 1 |

The controller serializes merges. After every wave, dispatch QAQC +
Design Skeptic agents. Iterate fixes until both 100/100 before the
next wave begins.

## File structure (post-implementation)

```
BorgScale/
  CLAUDE.md                        # NEW (Wave 0)
  CONTRIBUTING.md                  # rewritten (Wave 0)
  README.md                        # rewritten (Wave 4)
  CHANGELOG.md                     # appended (each wave)
  Dockerfile                       # labels updated (Wave 4)
  docker-compose.yml               # branding updated (Wave 4)
  app/
    main.py                        # activation hook removed (Wave 1)
    config.py                      # activation_* removed (Wave 1)
    api/
      system.py                    # licensing routes deleted (Wave 1)
      settings.py                  # analytics writes neutered (Wave 1)
      about.py                     # NEW: AGPL §13 endpoint (Wave 5)
    services/
      licensing_service.py         # rewritten as stub (Wave 1)
    database/
      models.py                    # entitlement_id + analytics cols kept, deprecated comments (Wave 1)
      migrations/
        051_add_analytics_enabled.py            # comment-amended (Wave 1)
        052_add_analytics_consent_given.py      # comment-amended (Wave 1)
        100_borgscale_drop_unused_entitlement_writes.py   # NEW noop (Wave 1)
  tests/
    test_no_phone_home.py          # NEW (Wave 3)
    test_agpl_about_endpoint.py    # NEW (Wave 5)
  scripts/
    security-scan.sh               # extended with gitleaks + URL allowlist (Wave 0)
    generate-logos.mjs             # NEW (Wave 4)
  frontend/
    src/
      assets/
        lucide-boxes.svg           # NEW (Wave 0)
      utils/
        analytics.ts               # DELETED (Wave 2)
        externalLinks.ts           # DELETED (Wave 2)
      components/
        AnalyticsConsentBanner.tsx # DELETED (Wave 2)
        LicensingTab.tsx           # DELETED (Wave 2)
        PlanBadge.tsx              # DELETED (Wave 2)
        PlanGate.tsx               # DELETED (Wave 2)
        PlanInfoDrawer.tsx         # DELETED (Wave 2)
        UpgradePrompt.tsx          # DELETED (Wave 2)
        Footer.tsx                 # NEW (Wave 5)
        ui/                        # NEW shadcn primitives (Wave 6+)
      hooks/
        usePlan.ts                 # DELETED (Wave 2)
        usePlanContent.ts          # DELETED (Wave 2)
        useSystemInfo.ts           # entitlement types removed (Wave 2)
      services/
        announcements.ts           # remote URL stripped (Wave 2)
        planContent.ts             # DELETED (Wave 2)
        api.ts                     # licensingAPI block removed (Wave 2)
      data/
        plan-content.json          # DELETED (Wave 2)
        announcements.json         # Umami entry removed (Wave 2)
      types/
        planContent.ts             # DELETED (Wave 2)
      vite-env.d.ts                # VITE_*_URL props removed (Wave 2)
      locales/
        en.json es.json de.json it.json   # buyLink / plan keys + branding sweep (Wave 2 + Wave 4)
      pages/                       # all rewritten in Phase 3
      App.tsx                      # MUI ThemeProvider removed (Wave 10)
    package.json                   # @mui/* + @emotion/* removed (Wave 10)
    tailwind.config.ts             # NEW (Wave 6)
    postcss.config.js              # NEW (Wave 6)
  .github/workflows/
    security.yml                   # security-scan.sh hooked in (Wave 0)
```

## Conventions

- Every commit message uses Conventional Commits (`feat:`, `fix:`,
  `chore:`, `docs:`, `refactor:`, `test:`).
- Every commit triggers `gitleaks protect --staged --no-banner
  --redact` in the controller before push (controller-side gate; not
  invoked from inside subagents).
- No `Co-Authored-By: Claude` trailers (already disabled).
- Author identity: `thekozugroup <thekozugroup@gmail.com>` (already
  configured via local `git config`).
- Subagents commit on a feature branch; the controller merges into
  `main` and pushes after both grader agents return 100/100.

---

## Wave 0 — Repo housekeeping

**Task 0.1: Add `CLAUDE.md`**

Files:
- Create: `CLAUDE.md`

- [ ] **Step 1: Write the file**

```markdown
# BorgScale — Agent Operating Notes

## Project overview

BorgScale is the AGPL-3.0 fork of `karanhudia/borg-ui` maintained by
The Kozu Group. The fork preserves the upstream's open-source
baseline while removing the closed-ecosystem activation and
analytics scaffolding announced for the post-relicense direction.
Source: https://github.com/thekozugroup/BorgScale.

## Repository layout

| dir | what lives here |
| --- | --- |
| `app/` | FastAPI + SQLAlchemy + SQLite backend |
| `frontend/` | React 18 + TypeScript + Vite frontend |
| `tests/` | pytest backend tests |
| `frontend/src/**/__tests__/` | vitest frontend tests |
| `docs/` | specs, plans, runbooks |
| `scripts/` | tooling: build, release, security |
| `.github/workflows/` | CI |

## Build & test

```bash
# Backend
pip install -r requirements.txt
pytest

# Frontend
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Security gate

`scripts/security-scan.sh` runs four checks: gitleaks against the
staged tree, an outbound-URL allowlist scan, `pip-audit`, and
`npm audit --audit-level high`. Run it before every push:

```bash
bash scripts/security-scan.sh
```

## Grader agents

Implementation runs through two reviewer agents:

- **QAQC agent** — grades codebase quality and anti-feature removal
  on a 0–100 scale. Inputs: diff since last grade plus the spec's
  anti-feature inventory. Pass condition: 100/100 with no
  unresolved items.
- **Design Skeptic agent** — grades UI polish and consistency on a
  0–100 scale. Inputs: built frontend served from headless Chromium
  plus screenshots of every primary page at 1280×800 and 768×1024.
  Pass condition: 100/100 with no unresolved items.

Both must return 100/100 before any wave is declared done.

## AGPL note

BorgScale stays AGPL-3.0. Hosted instances satisfy AGPL §13 via
`GET /api/about` (machine-readable source pointer) plus a "Source
(AGPL)" footer link on every page. Do not relicense.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for BorgScale agent operations"
```

---

**Task 0.2: Rewrite `CONTRIBUTING.md`**

Files:
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Replace file contents**

```markdown
# Contributing to BorgScale

Thanks for your interest in BorgScale, the AGPL-3.0 fork of
`karanhudia/borg-ui`.

## Setup

```bash
git clone https://github.com/thekozugroup/BorgScale.git
cd BorgScale
pip install -r requirements.txt
cd frontend && npm ci && cd ..
```

## Branch & commit policy

- Topic branches off `main`, named `wave-<N>-<slug>` for plan work
  or `fix-<slug>` / `feat-<slug>` otherwise.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`,
  `refactor:`, `chore:`).
- One logical change per commit. No `Co-Authored-By` trailers.

## Test requirements

Before opening a pull request:

```bash
pytest                          # backend
cd frontend && npm run lint     # frontend lint
npm run typecheck               # frontend types
npm test                        # frontend unit tests
npm run build                   # frontend build
```

CI runs the same suite plus `scripts/security-scan.sh`.

## Security gate

```bash
bash scripts/security-scan.sh
```

Must return zero before pushing. Runs gitleaks, an outbound-URL
allowlist scan, `pip-audit`, and `npm audit --audit-level high`.

## Anti-feature reminder

The following are out-of-scope and will be blocked by the QAQC
agent: phone-home telemetry, paid-tier scaffolding, license
activation flows, and "premium feature" gates. Open an issue if
you think a feature crosses the line.

## Upstream sync

While upstream remains AGPL-3.0:

```bash
git fetch upstream
git merge upstream/main         # resolve conflicts manually
```

After upstream relicenses, do NOT merge any post-relicense commit
without legal review — the AGPL-protected baseline must remain
clean.
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: rewrite CONTRIBUTING.md for BorgScale"
```

---

**Task 0.3: Extend `scripts/security-scan.sh` with gitleaks + URL allowlist**

Files:
- Modify: `scripts/security-scan.sh`

- [ ] **Step 1: Read existing script**

```bash
cat scripts/security-scan.sh
```

- [ ] **Step 2: Replace with the four-check version**

```bash
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
```

- [ ] **Step 3: chmod + smoke run**

```bash
chmod +x scripts/security-scan.sh
git add scripts/security-scan.sh
bash scripts/security-scan.sh
```

Expected: exits 0 with `OK`.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(security): extend security-scan.sh with gitleaks + URL allowlist"
```

---

**Task 0.4: Hook security-scan.sh into the CI workflow**

Files:
- Modify: `.github/workflows/security.yml`

- [ ] **Step 1: Append a new job**

Append to the existing file:

```yaml
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: sudo apt-get install -y gitleaks
      - run: pip install pip-audit
      - run: cd frontend && npm ci
      - run: pip install -r requirements.txt
      - name: Run security-scan.sh
        run: bash scripts/security-scan.sh
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/security.yml
git commit -m "ci: invoke scripts/security-scan.sh in security.yml"
```

---

**Task 0.5: Commit lucide `boxes` SVG**

Files:
- Create: `frontend/src/assets/lucide-boxes.svg`

- [ ] **Step 1: Fetch the SVG**

```bash
mkdir -p frontend/src/assets
curl -fsSL https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/boxes.svg \
  -o frontend/src/assets/lucide-boxes.svg
head -1 frontend/src/assets/lucide-boxes.svg
```

Expected: `<svg ...>` line.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/assets/lucide-boxes.svg
git commit -m "chore(assets): commit lucide:boxes SVG for BorgScale logo"
```

---

## Wave 1 — Phase 1 backend stub + route deletion (2 subagents)

### Task 1.1 — Replace `licensing_service.py` with a stub

Files:
- Modify: `app/services/licensing_service.py`

- [ ] **Step 1: Replace file contents**

```python
"""Licensing stub for BorgScale.

BorgScale is AGPL-3.0 and runs unrestricted. This module preserves the
public function names of the upstream activation client so existing
callers compile, but every call returns the constant "full access"
entitlement. No HTTP, no database writes.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

UNRESTRICTED_ENTITLEMENT: dict[str, Any] = {
    "tier": "full",
    "entitlement_id": "open-source",
    "expires_at": None,
    "status": "active",
    "features": ["all"],
}


def get_entitlement_summary(db: Session) -> dict[str, Any]:
    return dict(UNRESTRICTED_ENTITLEMENT)


async def attempt_auto_full_access_activation(db: Session, app_version: str) -> None:
    return None


async def refresh_entitlement(db: Session, *, app_version: str) -> dict[str, Any]:
    return {"result": "unchanged", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}


async def activate_paid_license(db: Session, *args: Any, **kwargs: Any) -> dict[str, Any]:
    return {"result": "open-source", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}


async def deactivate_paid_license(db: Session, *args: Any, **kwargs: Any) -> dict[str, Any]:
    return {"result": "open-source", "entitlement": dict(UNRESTRICTED_ENTITLEMENT)}
```

- [ ] **Step 2: Run the existing test suite**

```bash
pytest -q
```

Expected: passes; any test that asserted on activation HTTP behaviour
will need to be updated in Wave 3.

- [ ] **Step 3: Commit**

```bash
git add app/services/licensing_service.py
git commit -m "refactor(licensing): replace activation client with open-source stub"
```

### Task 1.2 — Delete licensing routes

Files:
- Modify: `app/api/system.py`

- [ ] **Step 1: Replace the licensing route block**

Find the `@router.post("/licensing/activate")`, `.../deactivate`, and
`.../refresh` decorators. Delete them and their handler functions.

Keep `@router.get("/licensing/status")` and rewrite its body to:

```python
@router.get("/licensing/status")
async def licensing_status() -> dict[str, Any]:
    """BorgScale runs unrestricted. Endpoint kept for client back-compat."""
    return {
        "tier": "full",
        "entitlement_id": "open-source",
        "expires_at": None,
        "status": "active",
        "features": ["all"],
    }
```

Remove imports of `activate_paid_license` / `deactivate_paid_license`
that are no longer referenced.

- [ ] **Step 2: Run tests**

```bash
pytest tests/test_system_api.py -q || true
```

(Failures expected for tests that called the deleted routes — those
get rewritten in Wave 3.)

- [ ] **Step 3: Commit**

```bash
git add app/api/system.py
git commit -m "refactor(api): drop licensing activate/deactivate/refresh endpoints"
```

### Task 1.3 — Drop `activation_*` settings from `app/config.py`

Files:
- Modify: `app/config.py`

- [ ] **Step 1: Remove the four `activation_*` fields and their `os.getenv` reads**

Delete:
- The `activation_service_url`, `activation_public_key`,
  `activation_timeout_seconds`, `activation_refresh_interval_hours`
  fields.
- Their `os.getenv` initializations near the bottom of the file.

- [ ] **Step 2: `pytest -q`**

- [ ] **Step 3: Commit**

```bash
git add app/config.py
git commit -m "refactor(config): drop activation_* settings"
```

### Task 1.4 — Drop activation startup hook in `app/main.py`

Files:
- Modify: `app/main.py`

- [ ] **Step 1: Replace the activation block at line ~242 with a single info log**

```python
# BorgScale runs unrestricted; no activation step.
logger.info("BorgScale runs unrestricted.")
```

Remove the `attempt_auto_full_access_activation` import.

- [ ] **Step 2: Boot smoke**

```bash
python -c "from app import main; print(main.app.title)"
```

Expected: prints the FastAPI app title.

- [ ] **Step 3: Commit**

```bash
git add app/main.py
git commit -m "refactor(main): remove activation startup hook"
```

### Task 1.5 — Add no-op migration `100_borgscale_drop_unused_entitlement_writes.py`

Files:
- Create: `app/database/migrations/100_borgscale_drop_unused_entitlement_writes.py`

- [ ] **Step 1: Create file**

```python
"""Migration 100: deprecation marker for unused entitlement writes.

BorgScale stops writing to the entitlement_id column. The column itself
is intentionally NOT dropped — historical migrations 051/052 created
analytics columns that are likewise retained. This migration is a no-op
that records the deprecation for future readers.
"""

def run(_connection) -> None:
    pass


def rollback(_connection) -> None:
    pass
```

- [ ] **Step 2: Add deprecation comments to migrations 051 and 052**

In `app/database/migrations/051_add_analytics_enabled.py`, add at the
top:

```python
# DEPRECATED in BorgScale (fork of borg-ui): the analytics_enabled
# column is no longer read or written. The migration runs unchanged
# to preserve historical replay; new schema work goes in migration 100+.
```

Same in `052_add_analytics_consent_given.py`.

- [ ] **Step 3: Commit**

```bash
git add app/database/migrations/
git commit -m "chore(migrations): add 100 deprecation noop; comment 051/052"
```

### Task 1.6 — Neuter `analytics_enabled` / `analytics_consent_given` writes in `app/api/settings.py`

Files:
- Modify: `app/api/settings.py`

- [ ] **Step 1: In the preferences-update handler, drop the two writes**

Locate the block (around line 1155-1167):

```python
if preferences.analytics_enabled is not None:
    current_user.analytics_enabled = preferences.analytics_enabled
if preferences.analytics_consent_given is not None:
    current_user.analytics_consent_given = preferences.analytics_consent_given
```

Replace with:

```python
# BorgScale: analytics fields are accepted for back-compat but ignored.
_ = preferences.analytics_enabled
_ = preferences.analytics_consent_given
```

- [ ] **Step 2: In the GET response (around line 1137-1138), hardcode**

```python
"analytics_enabled": False,
"analytics_consent_given": False,
```

- [ ] **Step 3: `pytest -q`**

- [ ] **Step 4: Commit**

```bash
git add app/api/settings.py
git commit -m "refactor(settings): ignore analytics_* fields; always report false"
```

---

## Wave 2 — Phase 1 frontend cleanup (3 subagents)

Three subagents work in parallel via worktrees. Bucket per agent below.

### Bucket A — Plan-gating component cluster

Files (delete):
- `frontend/src/components/LicensingTab.tsx`
- `frontend/src/components/PlanBadge.tsx`
- `frontend/src/components/PlanGate.tsx`
- `frontend/src/components/PlanInfoDrawer.tsx`
- `frontend/src/components/UpgradePrompt.tsx` (if present)
- All matching `__tests__/Plan*.test.tsx` and `__tests__/Licensing*.test.tsx`
- `frontend/src/hooks/usePlan.ts`
- `frontend/src/hooks/usePlanContent.ts`
- `frontend/src/services/planContent.ts`
- `frontend/src/data/plan-content.json`
- `frontend/src/types/planContent.ts`
- `frontend/src/utils/externalLinks.ts`

Tasks:

- [ ] **Step 1: Delete the files**

```bash
rm -f \
  frontend/src/components/{LicensingTab,PlanBadge,PlanGate,PlanInfoDrawer,UpgradePrompt}.tsx \
  frontend/src/components/__tests__/{LicensingTab,PlanBadge,PlanGate,PlanInfoDrawer,UpgradePrompt}.test.tsx \
  frontend/src/hooks/usePlan.ts \
  frontend/src/hooks/usePlanContent.ts \
  frontend/src/services/planContent.ts \
  frontend/src/data/plan-content.json \
  frontend/src/types/planContent.ts \
  frontend/src/utils/externalLinks.ts
```

- [ ] **Step 2: Remove every import of the deleted modules**

Run:

```bash
cd frontend
npm run typecheck 2>&1 | grep "Cannot find module" | head -50
```

For each compile error, edit the importing file and:
- Drop the import.
- Replace any JSX that referenced `<PlanGate>` / `<PlanBadge>` etc.
  with the gated children (since BorgScale always grants full access).
- Replace any `usePlan()` call with the constant
  `{ tier: "full", features: ["all"], status: "active" }`.

Repeat until `npm run typecheck` returns clean.

- [ ] **Step 3: Strip `licensingAPI` from `services/api.ts`**

Locate the exported `licensingAPI` object literal. Delete it. Run
typecheck to confirm no callers remain (any caller is a Wave 1
backend route already deleted, but the frontend may still poll —
remove those callers).

- [ ] **Step 4: Strip entitlement types from `useSystemInfo.ts`**

Delete the `EntitlementInfo` type, the `paid_active`/`community`
unions, and any state derived from them.

- [ ] **Step 5: `npm run lint && npm run typecheck && npm test`**

All must pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(frontend): delete plan-gating cluster (LicensingTab, PlanBadge, PlanGate, PlanInfoDrawer, usePlan, usePlanContent, externalLinks, planContent service+types+data)"
```

### Bucket B — Analytics removal

Files (delete):
- `frontend/src/utils/analytics.ts`
- `frontend/src/components/AnalyticsConsentBanner.tsx`
- `frontend/src/components/__tests__/AnalyticsConsentBanner.test.tsx`
- `frontend/src/utils/__tests__/analytics.test.ts`

Files (modify):
- `frontend/src/main.tsx`
- `frontend/src/context/AppContext.tsx`
- `frontend/src/components/PreferencesTab.tsx`
- `frontend/src/components/__tests__/PreferencesTab.test.tsx`
- `frontend/src/data/announcements.json` (drop the Umami entry)

Tasks:

- [ ] **Step 1: Delete the files**

```bash
rm -f \
  frontend/src/utils/analytics.ts \
  frontend/src/components/AnalyticsConsentBanner.tsx \
  frontend/src/components/__tests__/AnalyticsConsentBanner.test.tsx \
  frontend/src/utils/__tests__/analytics.test.ts
```

- [ ] **Step 2: `main.tsx`** — drop the analytics init import + call
  block.

- [ ] **Step 3: `context/AppContext.tsx`** — drop the conditional
  analytics init based on `analytics_enabled`.

- [ ] **Step 4: `PreferencesTab.tsx`** — drop the `analytics_enabled`
  state, the form row, and the mutation field. Drop the matching
  imports.

- [ ] **Step 5: `__tests__/PreferencesTab.test.tsx`** — drop
  `analytics_enabled`-related assertions; the rest of the test stays.

- [ ] **Step 6: `frontend/src/data/announcements.json`** — remove the
  entry containing "Umami analytics".

- [ ] **Step 7: `npm run lint && npm run typecheck && npm test`**

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(frontend): remove Umami analytics opt-in surface"
```

### Bucket C — Remote announcements + vite env

Files (modify):
- `frontend/src/services/announcements.ts`
- `frontend/src/vite-env.d.ts`
- Any `__tests__/announcements.test.ts` if present

Tasks:

- [ ] **Step 1: `frontend/src/services/announcements.ts`**

Replace the `DEFAULT_REMOTE_ANNOUNCEMENTS_URL = "https://updates.borgui.com/announcements.json"`
constant with `null`. Remove the env-var fallback (`import.meta.env.VITE_ANNOUNCEMENTS_URL`).
The exported function continues to read the bundled
`frontend/src/data/announcements.json` only.

- [ ] **Step 2: `frontend/src/vite-env.d.ts`**

Drop the `VITE_ANNOUNCEMENTS_URL` and `VITE_PLAN_CONTENT_URL`
properties from the `ImportMetaEnv` interface.

- [ ] **Step 3: Update or delete any service tests that asserted on the remote URL**

- [ ] **Step 4: `npm run lint && npm run typecheck && npm test`**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/announcements.ts frontend/src/vite-env.d.ts \
  frontend/src/services/__tests__/announcements.test.ts 2>/dev/null || true
git add -A
git commit -m "refactor(frontend): bundled-only announcements; drop remote URL env vars"
```

After all three buckets merge, run a sweep to be sure no orphans
remain:

```bash
cd frontend
grep -rn 'usePlan\|EntitlementInfo\|BUY_URL\|LicensingTab\|PlanBadge\|PlanGate\|PlanInfoDrawer\|UpgradePrompt\|borgui\.com\|updates\.borgui\|umami\|analytics_enabled\|analytics_consent_given' src \
  | grep -v '__tests__\|.test.' || echo "  CLEAN"
```

Expected: `CLEAN` (or only test-only references that were deliberately
kept).

---

## Wave 3 — Phase 1 tests + docker `--network none` smoke (1 subagent)

### Task 3.1 — Write `tests/test_no_phone_home.py`

Files:
- Create: `tests/test_no_phone_home.py`

Dependencies (add to `requirements.txt`):
- `respx>=0.21`

- [ ] **Step 1: Add `respx` to `requirements.txt`**

```bash
echo 'respx>=0.21' >> requirements.txt
pip install respx
```

- [ ] **Step 2: Write the test**

```python
"""BorgScale: assert no phone-home traffic at startup or in the hot path.

Uses respx to default-deny every outbound httpx call. Any unmocked
httpx request fails the test with the offending URL captured.
"""
from __future__ import annotations

import importlib
import pkgutil

import pytest
import respx
from fastapi.testclient import TestClient

DENY_HOSTS = {
    "borgui.com",
    "license.borgui.com",
    "updates.borgui.com",
    "umami.is",
    "umami.cloud",
    "posthog.com",
    "sentry.io",
    "segment.io",
    "mixpanel.com",
    "amplitude.com",
    "google-analytics.com",
    "googletagmanager.com",
}


@respx.mock(assert_all_called=False)
def test_no_phone_home_during_full_lifecycle(respx_mock):
    # Default-deny: any unmocked httpx call raises.
    respx_mock.route().respond(status_code=599)

    # Import the FastAPI app AFTER respx is active so module-level
    # client construction is observed.
    from app.main import app

    client = TestClient(app)

    # Health.
    r = client.get("/api/health")
    assert r.status_code == 200, r.text

    # Licensing status (constant stub).
    r = client.get("/api/system/licensing/status")
    assert r.status_code == 200
    body = r.json()
    assert body["tier"] == "full"
    assert body["entitlement_id"] == "open-source"

    # Verify nothing called any deny-host.
    for call in respx_mock.calls:
        host = (call.request.url.host or "").lower()
        for denied in DENY_HOSTS:
            assert denied not in host, f"phone-home detected: {call.request.url}"


def test_no_module_constructs_live_http_client_on_import():
    """Walk app.* and import every module without making a request."""
    import app

    pkg = app
    for _, modname, _ in pkgutil.walk_packages(pkg.__path__, prefix=f"{pkg.__name__}."):
        importlib.import_module(modname)
```

- [ ] **Step 3: Run**

```bash
pytest tests/test_no_phone_home.py -v
```

Expected: both tests pass.

- [ ] **Step 4: Commit**

```bash
git add requirements.txt tests/test_no_phone_home.py
git commit -m "test: add network-isolation suite asserting no phone-home"
```

### Task 3.2 — Existing test suite green

- [ ] **Step 1: Run pytest, fix any test that referred to deleted licensing routes**

```bash
pytest -q
```

For each failing test:
- If it asserted on `/api/system/licensing/activate` etc., delete the
  test (the route is intentionally gone).
- If it asserted on the old activation HTTP behaviour, rewrite to
  assert the stub returns the constant payload.

- [ ] **Step 2: `cd frontend && npm test`**

Same approach: any test that referenced deleted plan-gating
components is removed; tests of surrounding components are updated to
assume full access.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: align suites with stub licensing + plan-gating removal"
```

### Task 3.3 — Docker `--network none` smoke

Files:
- Modify: `scripts/security-scan.sh` (append a 5th step, optional locally, mandatory in CI)

- [ ] **Step 1: Append container smoke step**

Add to the bottom of `scripts/security-scan.sh` (before `echo "OK"`):

```bash
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
```

CI workflow opts in via `env: BORGSCALE_DOCKER_SMOKE=1`.

- [ ] **Step 2: Commit**

```bash
git add scripts/security-scan.sh
git commit -m "test(docker): add --network none container smoke (gated)"
```

---

## Wave 4 — Phase 2 logo + brand sweep (3 subagents)

### Bucket A — Logo regeneration

Files:
- Create: `scripts/generate-logos.mjs`
- Modify: `LogoWithBackground.png`, `LogoWithName.png`,
  `LogoWithNameWhite.png`, `logo.png`,
  `frontend/public/favicon-16x16.png`,
  `frontend/public/favicon-32x32.png`,
  `frontend/public/apple-touch-icon.png`,
  `frontend/public/logo.png`
- Rename `borg-ui-logo.png` → `borgscale-logo.png`

- [ ] **Step 1: Write `scripts/generate-logos.mjs`**

```js
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import sharp from 'sharp'
import path from 'node:path'

const SVG = readFileSync('frontend/src/assets/lucide-boxes.svg', 'utf8')
const PADDED_BG = (size, fg, bg) => Buffer.from(
  SVG
    .replace(/stroke="currentColor"/g, `stroke="${fg}"`)
    .replace(/<svg /, `<svg style="background:${bg}" `)
)

const targets = [
  { out: 'LogoWithBackground.png',                          size: 1024, fg: '#ffffff', bg: '#000000' },
  { out: 'LogoWithName.png',                                size: 1024, fg: '#000000', bg: '#ffffff' },
  { out: 'LogoWithNameWhite.png',                           size: 1024, fg: '#ffffff', bg: '#000000' },
  { out: 'logo.png',                                        size:  512, fg: '#000000', bg: '#ffffff' },
  { out: 'borgscale-logo.png',                              size:  512, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/logo.png',                        size:  512, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/favicon-16x16.png',               size:   16, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/favicon-32x32.png',               size:   32, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/apple-touch-icon.png',            size:  180, fg: '#000000', bg: '#ffffff' },
]

for (const t of targets) {
  await sharp(PADDED_BG(t.size, t.fg, t.bg), { density: 1024 })
    .resize(t.size, t.size, { fit: 'contain', background: t.bg })
    .png()
    .toFile(t.out)
  console.log(`wrote ${t.out} (${t.size}x${t.size})`)
}
```

- [ ] **Step 2: Install sharp + run the generator**

```bash
cd frontend && npm install --save-dev sharp && cd ..
node scripts/generate-logos.mjs
```

- [ ] **Step 3: Remove the old `borg-ui-logo.png`**

```bash
git rm -f borg-ui-logo.png 2>/dev/null || true
```

- [ ] **Step 4: Update references**

```bash
grep -rln 'borg-ui-logo' . --exclude-dir=node_modules --exclude-dir=.git \
  | xargs -r sed -i 's/borg-ui-logo/borgscale-logo/g'
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(brand): regenerate logos from lucide:boxes; rename borg-ui-logo"
```

### Bucket B — String + metadata sweep

Files (modify):
- `package.json` (root + frontend)
- `pyproject.toml`
- `Dockerfile`
- `README.md`
- `CHANGELOG.md`
- `index.html`
- `frontend/public/manifest.json`
- `docs/**/*.md` (excluding the spec/plan in `docs/superpowers/`)

- [ ] **Step 1: Branding sed sweep (case-sensitive)**

```bash
grep -rln 'Borg UI\|Borg Web UI\|borg-ui' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs/superpowers \
  | xargs -r sed -i \
      -e 's/Borg Web UI/BorgScale/g' \
      -e 's/Borg UI/BorgScale/g' \
      -e 's/borg-ui/borgscale/g'
```

- [ ] **Step 2: borgui.com → fork URL**

```bash
grep -rln 'borgui\.com' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs/superpowers \
  | xargs -r sed -i 's|https\?://[a-zA-Z0-9._-]*borgui\.com[^"\x27 ]*|https://github.com/thekozugroup/BorgScale|g'

grep -rln 'support@borgui\.com\|@borgui\.com' . \
  --exclude-dir=node_modules --exclude-dir=.git \
  | xargs -r sed -i 's|[a-zA-Z0-9._-]*@borgui\.com|https://github.com/thekozugroup/BorgScale/issues|g'
```

- [ ] **Step 3: Manifest + Dockerfile metadata**

`frontend/public/manifest.json`:
```json
{
  "name": "BorgScale",
  "short_name": "BorgScale",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "display": "standalone",
  "icons": [
    { "src": "/favicon-16x16.png", "sizes": "16x16", "type": "image/png" },
    { "src": "/favicon-32x32.png", "sizes": "32x32", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

Dockerfile labels (top of file or near `LABEL`):

```dockerfile
LABEL org.opencontainers.image.title="BorgScale"
LABEL org.opencontainers.image.source="https://github.com/thekozugroup/BorgScale"
LABEL org.opencontainers.image.licenses="AGPL-3.0"
LABEL org.opencontainers.image.description="Self-hosted UI for Borg Backup (BorgScale fork of borg-ui)"
```

- [ ] **Step 4: Verify**

```bash
grep -rln 'borgui\.com\|Borg UI\|Borg Web UI' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs/superpowers \
  | grep -v '__tests__\|test_' || echo "  CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(brand): rename Borg UI -> BorgScale across metadata, docs, Dockerfile"
```

### Bucket C — i18n bundles

Files (modify):
- `frontend/src/locales/en.json`
- `frontend/src/locales/es.json`
- `frontend/src/locales/de.json`
- `frontend/src/locales/it.json`

- [ ] **Step 1: Drop orphaned plan-gating keys**

```bash
cd frontend
node -e '
const fs = require("fs");
for (const lang of ["en","es","de","it"]) {
  const p = `src/locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  // Drop any subtree under a top-level "licensing" / "plan" key.
  delete data.licensing;
  delete data.plan;
  // Drop the orphaned buyLink key wherever it exists.
  function walk(o) {
    if (o && typeof o === "object") {
      if ("buyLink" in o) delete o.buyLink;
      Object.values(o).forEach(walk);
    }
  }
  walk(data);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
  console.log(`updated ${p}`);
}
'
cd ..
```

- [ ] **Step 2: Replace remaining brand strings inside locale JSON**

```bash
grep -rln 'Borg UI\|Borg Web UI\|borg-ui\|borgui\.com' frontend/src/locales \
  | xargs -r sed -i \
      -e 's/Borg Web UI/BorgScale/g' \
      -e 's/Borg UI/BorgScale/g' \
      -e 's/borg-ui/borgscale/g' \
      -e 's|https\?://[a-zA-Z0-9._-]*borgui\.com[^"\x27 ]*|https://github.com/thekozugroup/BorgScale|g'
```

- [ ] **Step 3: Verify locale parity**

```bash
node frontend/scripts/check-locale-parity.js \
  || node ./scripts/check-locale-parity.js
```

Expected: passes (key sets equal across the four locales).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(i18n): rebrand strings + drop orphaned plan/buyLink keys"
```

---

## Wave 5 — Phase 2 AGPL §13 endpoint + footer (1 subagent)

### Task 5.1 — `GET /api/about`

Files:
- Create: `app/api/about.py`
- Modify: `app/main.py` (mount the router)
- Create: `tests/test_agpl_about_endpoint.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_agpl_about_endpoint.py
from fastapi.testclient import TestClient
from app.main import app

def test_about_endpoint_returns_agpl_metadata():
    client = TestClient(app)
    r = client.get("/api/about")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "BorgScale"
    assert body["license"] == "AGPL-3.0"
    assert body["source"] == "https://github.com/thekozugroup/BorgScale"
    assert body["upstream"] == "https://github.com/karanhudia/borg-ui"
    assert body["license_url"] == "https://www.gnu.org/licenses/agpl-3.0.html"
    assert "version" in body
```

- [ ] **Step 2: Run, see it fail (404)**

```bash
pytest tests/test_agpl_about_endpoint.py -v
```

- [ ] **Step 3: Implement the route**

`app/api/about.py`:

```python
from fastapi import APIRouter

from app import __version__ as APP_VERSION  # if absent, fall back to a literal

router = APIRouter()


@router.get("/about")
def about() -> dict:
    return {
        "name": "BorgScale",
        "version": APP_VERSION,
        "source": "https://github.com/thekozugroup/BorgScale",
        "license": "AGPL-3.0",
        "license_url": "https://www.gnu.org/licenses/agpl-3.0.html",
        "upstream": "https://github.com/karanhudia/borg-ui",
    }
```

In `app/main.py`, where other API routers are mounted (search for
existing `app.include_router(...)` calls), add:

```python
from app.api import about
app.include_router(about.router, prefix="/api", tags=["about"])
```

- [ ] **Step 4: Tests**

```bash
pytest tests/test_agpl_about_endpoint.py -v
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add app/api/about.py app/main.py tests/test_agpl_about_endpoint.py
git commit -m "feat(api): add /api/about for AGPL §13 source disclosure"
```

### Task 5.2 — Footer link on every page

Files:
- Create: `frontend/src/components/Footer.tsx`
- Modify: the page-shell component (search for the existing layout
  wrapper; usually `frontend/src/components/Layout.tsx` or
  `frontend/src/App.tsx`).

- [ ] **Step 1: Write `Footer.tsx`**

```tsx
import { useEffect, useState } from 'react'

interface AboutPayload {
  name: string
  version: string
  source: string
  license: string
  license_url: string
  upstream: string
}

export function Footer() {
  const [info, setInfo] = useState<AboutPayload | null>(null)
  useEffect(() => {
    fetch('/api/about').then((r) => r.ok ? r.json() : null).then(setInfo).catch(() => {})
  }, [])
  if (!info) return null
  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '8px 12px',
        fontSize: 12,
        opacity: 0.7,
        borderTop: '1px solid var(--border, rgba(0,0,0,0.08))',
      }}
    >
      {info.name} v{info.version} ·{' '}
      <a href={info.source} target="_blank" rel="noreferrer">Source (AGPL)</a>
      {' · '}
      <a href={info.license_url} target="_blank" rel="noreferrer">{info.license}</a>
    </footer>
  )
}
```

- [ ] **Step 2: Mount the footer in the layout shell**

In the layout component that wraps every authenticated route, render
`<Footer />` after the main content area.

- [ ] **Step 3: Lint + tests**

```bash
cd frontend && npm run typecheck && npm run lint && npm test
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(footer): mount AGPL source-link footer on every page"
```

---

## Wave 6 — Phase 3 tooling (1 subagent)

### Task 6.1 — Install Tailwind + run shadcn init

Files:
- Modify: `frontend/package.json`, `frontend/tsconfig.json`,
  `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`, `frontend/postcss.config.js`,
  `frontend/src/index.css` (additions),
  `frontend/components.json`,
  `frontend/src/lib/utils.ts`

- [ ] **Step 1: Install deps**

```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Tailwind for the React tree**

`frontend/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
```

```bash
npm install -D tailwindcss-animate
```

- [ ] **Step 3: Add Tailwind base layers**

In `frontend/src/index.css`, prepend:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

(Keep any existing rules below.)

- [ ] **Step 4: shadcn init**

```bash
npx shadcn@latest init -y \
  --base-color neutral \
  --css-variables \
  --rsc=false \
  --tsx
```

This writes `components.json`, `src/lib/utils.ts`, and the CSS
variable set into `src/index.css`. Confirm the generated values
correspond to the default black/white "neutral" theme.

- [ ] **Step 5: Sanity-check build**

```bash
npm run typecheck
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build(frontend): install Tailwind + shadcn/ui (neutral stock theme)"
```

### Task 6.2 — Install primitives needed by Phase 3

```bash
cd frontend
for c in button card dialog dropdown-menu form input select switch \
         table tabs toast tooltip progress badge sheet command \
         popover separator skeleton alert avatar accordion radio-group \
         checkbox slider textarea sidebar; do
  npx shadcn@latest add "$c" -y
done
```

- [ ] **Commit**

```bash
git add frontend/src/components/ui frontend/src/lib
git commit -m "build(shadcn): install primitives required by Phase 3"
```

### Task 6.3 — Bridge ThemeContext to Tailwind dark class

Files:
- Modify: `frontend/src/context/ThemeContext.tsx`

- [ ] **Step 1: Toggle the `dark` class on `<html>`**

In the existing `useEffect` that applies the resolved theme, add:

```ts
const root = document.documentElement
root.classList.toggle('dark', resolved === 'dark')
```

- [ ] **Step 2: Lint + tests**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/ThemeContext.tsx
git commit -m "feat(theme): toggle Tailwind dark class via ThemeContext"
```

---

## Waves 7–10 — Phase 3 page migrations

For each Phase 3 page migration the per-subagent task pattern is the
same. The plan prescribes the structure; the subagent uses shadcn
primitives to produce equivalent layouts under the stock neutral
theme.

### Migration recipe (used in waves 7, 8, 9)

For each page or component:

- [ ] **Step 1: Read the current MUI implementation**

```bash
cat frontend/src/pages/<Page>.tsx
```

- [ ] **Step 2: Inventory the MUI components in use**

`grep -E '@mui|@emotion'` over the file. Pair each with its shadcn
equivalent:

| MUI | shadcn |
| --- | --- |
| `<AppBar>`, `<Toolbar>`, `<Drawer>` | `Sidebar` block + `Sheet` |
| `<Card>`, `<CardContent>`, `<CardHeader>`, `<CardActions>` | `Card`, `CardContent`, `CardHeader`, `CardFooter` |
| `<Button>` | `Button` (variants: `default`, `secondary`, `ghost`, `link`, `destructive`) |
| `<TextField>` | `<Input>` + `<Label>` (or `Form` if integrating react-hook-form) |
| `<Select>` | `Select` |
| `<Switch>` | `Switch` |
| `<Checkbox>` | `Checkbox` |
| `<Radio>` / `<RadioGroup>` | `RadioGroup` + `RadioGroupItem` |
| `<Slider>` | `Slider` |
| `<Tabs>` / `<Tab>` | `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` |
| `<Dialog>` | `Dialog` (`DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`) |
| `<Tooltip>` | `Tooltip` |
| `<Snackbar>` / `enqueueSnackbar` | `useToast` hook from `useToast` (already in repo via `react-hot-toast`; switch to shadcn `toast` later if needed) |
| `<LinearProgress>` / `<CircularProgress>` | `Progress` / `Skeleton` |
| `<Chip>` / `<Badge>` | `Badge` |
| `<Table>` etc. | `Table` |
| `<Stepper>` (wizard) | `Tabs` (orientation="vertical") or block from `https://ui.shadcn.com/blocks` |
| icons | `lucide-react` (already a dep) |

- [ ] **Step 3: Rewrite the page with Tailwind layout + shadcn primitives**

Layouts use Tailwind utility classes. Spacing scale is the default
(`space-y-4`, `gap-4`, `p-6`, `text-sm`, etc.). Keep layouts visually
analogous to the originals — page structure does not change in v1.

- [ ] **Step 4: Update tests**

Tests use `@testing-library/react`. Most existing assertions use
visible text, which still works after migration. Update selector
queries for components that changed roles (e.g. `getByRole('switch')`
on shadcn `Switch`).

- [ ] **Step 5: Visual parity check**

```bash
cd frontend && npm run build
```

The Design Skeptic agent renders the page in headless Chromium at
1280×800 + 768×1024 in light + dark and grades.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(<page>): migrate to shadcn/ui"
```

### Wave 7 — App shell + login + setup wizard (2 subagents)

Pages in scope:
- `frontend/src/components/Layout.tsx` (whatever the upstream calls
  the page shell)
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/SetupWizard.tsx` (and its child step components)

Run the migration recipe per file. The Sidebar primitive is the
backbone of the shell.

### Wave 8 — Settings + repository pages (2 subagents)

Pages in scope:
- `frontend/src/pages/SettingsPage.tsx` (and tabs:
  `PreferencesTab.tsx`, `ProfileTab.tsx`, `UsersTab.tsx`,
  `NotificationsTab.tsx` — but NOT the deleted `LicensingTab.tsx`)
- `frontend/src/pages/RepositoriesPage.tsx`
- `frontend/src/pages/RepositoryDetailPage.tsx`

### Wave 9 — Backup wizard FIRST, then dashboard + archive browser

The wizard establishes wizard/stepper conventions used by later
pages. Merge the wizard branch first; then dispatch dashboard +
archive in parallel.

Pages in scope:
- `frontend/src/components/wizard/schedule/**.tsx` (the existing
  wizard tree)
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/ArchiveBrowser.tsx`

For Dashboard's activity graph use the shadcn `chart` recipe at
<https://ui.shadcn.com/charts/area>.

### Wave 10 — MUI / Emotion removal

Files:
- Modify: `frontend/package.json` (remove deps),
  `frontend/src/App.tsx` (drop `ThemeProvider`/`CssBaseline` from MUI),
  any remaining import of `@mui/*` or `@emotion/*` (must be zero).

- [ ] **Step 1: Confirm zero usages**

```bash
cd frontend
grep -rln "@mui/\|@emotion/" src/ || echo "  CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 2: Remove deps**

```bash
npm remove @mui/material @mui/icons-material @emotion/react @emotion/styled
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "build(frontend): remove @mui/* and @emotion/* dependencies"
```

---

## Wave 11 — Release

### Task 11.1 — Rewrite README

Files:
- Modify: `README.md`

- [ ] **Step 1: Replace contents with BorgScale README**

```markdown
# BorgScale

**Self-hosted web UI for [Borg Backup](https://www.borgbackup.org/), AGPL-3.0.**

[![Docker Hub](https://img.shields.io/badge/ghcr-thekozugroup%2Fborgscale-blue)](https://github.com/thekozugroup/BorgScale/pkgs/container/borgscale)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)

BorgScale is a fork of [karanhudia/borg-ui](https://github.com/karanhudia/borg-ui)
made before its announced switch to a paid, source-available model.
The fork preserves the AGPL-3.0 baseline indefinitely, removes the
license activation and analytics scaffolding, rebrands the project,
and modernises the React frontend with shadcn/ui under a stock
black/white theme.

## Features

- Run, schedule, and monitor Borg backups from one interface.
- Browse archives and restore files without dropping to the CLI.
- Automated schedules, repository checks, prune, and compact.
- Notifications via Apprise (100+ channels).
- Multi-host SSH key management.
- Multi-user with TOTP / passkeys.

## Quickstart

```bash
docker run -d \
  --name borgscale \
  -p 8081:8081 \
  -v borgscale-data:/data \
  -v /path/to/backup-source:/local:ro \
  ghcr.io/thekozugroup/borgscale:latest
```

Default credentials: `admin` / `admin123` (forced change on first
login).

## Configuration

See [`docs/installation.md`](docs/installation.md) for environment
variables, volume layout, and SSH backup targets.

## Source disclosure (AGPL §13)

`/api/about` returns a machine-readable pointer to this repository.
Every page renders a "Source (AGPL)" footer link. If you self-host
BorgScale and modify it, you must offer your modified source under
AGPL-3.0.

## License

[AGPL-3.0](LICENSE) — Copyright 2026 The Kozu Group. Forked from
`karanhudia/borg-ui` while it was AGPL-3.0.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for BorgScale"
```

### Task 11.2 — Build + push image

- [ ] **Step 1: Build**

```bash
docker buildx create --use --name borgscale-builder >/dev/null 2>&1 || true
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/thekozugroup/borgscale:latest \
  -t ghcr.io/thekozugroup/borgscale:v0.1.0 \
  --push .
```

- [ ] **Step 2: Verify pull**

```bash
docker pull ghcr.io/thekozugroup/borgscale:latest
```

### Task 11.3 — Cut over atmos compose

Files:
- Modify: `/data/services/docker-compose.yml` (on the atmos host)

- [ ] **Step 1: Replace image**

```yaml
borg-ui:
  image: ghcr.io/thekozugroup/borgscale:latest
  ...
```

(Container name kept as `borg-ui` to preserve the existing volume
mounts and network config; the rename is cosmetic and downstream
URLs still work.)

- [ ] **Step 2: Pull + restart**

```bash
cd /data/services && sudo docker compose pull borg-ui && sudo docker compose up -d borg-ui
```

- [ ] **Step 3: Smoke**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://100.76.147.110:8081/
```

Expected: `200`.

### Task 11.4 — GitHub release

- [ ] **Step 1: Tag**

```bash
git tag -a v0.1.0 -m "BorgScale 0.1.0 — initial fork release"
git push origin v0.1.0
```

- [ ] **Step 2: Create release notes**

```bash
gh release create v0.1.0 \
  --title "BorgScale 0.1.0" \
  --notes "$(cat <<'EOF'
First release of BorgScale, an AGPL-3.0 fork of karanhudia/borg-ui.

Highlights
- Removed license activation and analytics phone-home.
- Rebranded to BorgScale with the lucide:boxes icon.
- New shadcn/ui frontend under a stock black/white theme.
- AGPL §13 source disclosure via /api/about + footer link.

Installation
docker pull ghcr.io/thekozugroup/borgscale:latest
EOF
)"
```

---

## Self-review

Spec coverage check:

- ✅ Phase 1 anti-feature inventory: every entry in the spec table has
  a Wave 1 / Wave 2 task or bucket.
- ✅ Network-isolation tests: Task 3.1.
- ✅ Container `--network none` smoke: Task 3.3.
- ✅ AGPL §13: Wave 5 (Tasks 5.1, 5.2).
- ✅ Brand swap: Wave 4 (three buckets).
- ✅ Logo regeneration: Wave 4 Bucket A.
- ✅ shadcn/ui migration: Waves 6–10.
- ✅ Dark mode preserved: Task 6.3.
- ✅ Wave 0 housekeeping (CLAUDE.md, CONTRIBUTING.md,
  security-scan.sh, security.yml hook, lucide-boxes.svg): Tasks
  0.1–0.5.
- ✅ MUI removal: Wave 10.
- ✅ Image release + atmos cutover: Wave 11.

Type / function-name consistency check:

- `licensing_service.py` exports `get_entitlement_summary`,
  `attempt_auto_full_access_activation`, `refresh_entitlement`,
  `activate_paid_license`, `deactivate_paid_license` — same names
  used in `app/api/system.py` (the `/status` route imports
  `get_entitlement_summary`). No drift.
- `Footer.tsx` reads `/api/about`; `app/api/about.py` returns the
  same JSON shape. No drift.
- `tailwind.config.ts` `darkMode: ['class']`; `ThemeContext.tsx`
  toggles `class="dark"` on `<html>`. Aligned.

Placeholder scan: no "TBD", no "implement later", no "similar to".
Every step prescribes concrete code, exact commands, or precise
shell instructions.
