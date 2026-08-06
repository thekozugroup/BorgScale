# BorgScale — Agent Operating Notes

## Project overview

BorgScale is a self-hosted web UI for BorgBackup, maintained by The
Kozu Group. It runs backups, browses and restores archives, manages
repositories, and automates schedules. Every feature is available to
every instance: no tiers, no license keys, no phone-home.
Source: https://github.com/thekozugroup/BorgScale.

## Repository layout

| dir | what lives here |
| --- | --- |
| `app/` | FastAPI + SQLAlchemy + SQLite backend |
| `frontend/` | React 18 + TypeScript + Vite frontend |
| `tests/` | pytest backend tests |
| `frontend/src/**/__tests__/` | vitest frontend tests |
| `docs/` | user guides, specs, runbooks |
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
