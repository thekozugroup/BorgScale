# BorgScale — Agent Operating Notes

## Project overview

BorgScale is the AGPL-3.0 fork of `karanhudia/borgscale` maintained by
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
