# BorgScale — Fork & Modernisation Design

**Date:** 2026-04-30
**Status:** Design
**Author:** The Kozu Group
**License of fork:** AGPL-3.0 (must remain — same as upstream)

## Summary

BorgScale is a fork of [karanhudia/borg-ui](https://github.com/karanhudia/borg-ui)
made before the upstream's announced switch to a paid, source-available
model. The fork preserves the AGPL-3.0 baseline indefinitely, removes
closed-ecosystem anti-features (license activation, network telemetry),
rebrands the project, and modernises the UI with a black/white
[shadcn/ui](https://ui.shadcn.com/) stock theme. Functional behaviour
matches upstream at the time of the fork; nothing user-facing is
removed except the activation prompts and analytics opt-in.

## Goals

- Stand up `github.com/thekozugroup/BorgScale` and a Docker image at
  `ghcr.io/thekozugroup/borgscale:latest`.
- Strip every code path that:
  - Calls `license.borgui.com` or any other phone-home.
  - Reports analytics (Umami) on user behaviour.
  - Gates a feature behind an entitlement check.
- Replace branding (name, logo, colours) so the fork reads as its own
  product and so we don't infringe the upstream's trademarks.
- Migrate the React frontend from MUI v7 + Emotion to shadcn/ui + Tailwind.
- Validate every refactor with two automated graders that must each return
  100/100 before any phase is declared done.

## Non-goals (v1)

- No new features beyond what upstream had at fork time.
- No mobile app.
- No SaaS hosting.
- No replacement of the underlying borg backup engine, FastAPI, SQLite,
  Docker single-container delivery, or Python version.
- No relicensing (fork stays AGPL-3.0).

## Repository topology

| remote | URL | purpose |
| --- | --- | --- |
| `origin` | `github.com/thekozugroup/BorgScale` | The fork. Default branch: `main`. |
| `upstream` | `github.com/karanhudia/borg-ui` | Read-only, used to cherry-pick AGPL-era bugfixes until the announced relicense lands. |

The fork preserves git history. Tags and branches will be re-prefixed with
`borgscale-` to avoid collision when ingesting upstream tags later.

## Stack inventory (taken from fork at HEAD `73d15ce0`)

| layer | tech |
| --- | --- |
| Backend | Python 3.10, FastAPI, SQLAlchemy, SQLite |
| Backend tests | pytest, fixture-based, ~58.82% line coverage |
| Frontend | React 18 + TypeScript + Vite |
| UI library (current) | MUI v7 + Emotion + lucide-react icons |
| State / data | TanStack Query (`@tanstack/react-query`), `react-hook-form` |
| i18n | i18next |
| Frontend tests | Vitest + Testing Library, ~81.66% line coverage |
| Container | Single-image, Python entrypoint serves built React bundle |
| Deployment | Docker container `ainullcode/borg-ui` (will become `ghcr.io/thekozugroup/borgscale`) |

## Anti-features inventory (Phase 1 targets)

| component | location | action |
| --- | --- | --- |
| Activation client | `app/services/licensing_service.py` | Replace public surface with a stub that always returns `tier=full`, no HTTP. |
| Activation routes | `app/api/system.py:130+` | Remove `/api/system/licensing/*`. The OpenAPI spec must lose them. |
| Activation settings | `app/config.py:46-52` + reads in `app/config.py:208-217` | Delete; remove env-var documentation. |
| Startup auto-activation | `app/main.py:242` | Delete the call. Replace with a one-line log: "BorgScale runs unrestricted." |
| `entitlement_id` column | `app/database/models.py` | Keep for migration safety (don't drop), but deprecate in code. New schema migration adds a comment. |
| Umami analytics | `frontend/src/utils/analytics.ts`, `AnalyticsConsentBanner.tsx`, references in `main.tsx`, `PreferencesTab.tsx`, `AppContext.tsx`, fixtures in `__tests__` | Delete. PreferencesTab loses the analytics row. The `analytics_enabled` API field stays in the response with a hardcoded `false` and is ignored on write. Migration `051_add_analytics_enabled` stays (column safe to leave). |
| User-visible "Premium / Upgrade" CTAs | grep frontend for `Upgrade`, `Premium`, `paid`, `License` | Audit + remove. Confirmed-empty patterns in audit go in the spec annex. |
| `borgui.com` URLs | doc + footer + emails | Replace with `github.com/thekozugroup/BorgScale`. |

## Phase plan

### Phase 1 — Anti-feature removal (highest risk)

Goal: identical user-facing behaviour, minus the phone-home, minus the
analytics, minus the gating scaffolding.

Components:

1. **Backend stub.** Rewrite `licensing_service.py` to a 30-line module
   that returns `{"tier": "full", "entitlement_id": "open-source",
   "expires_at": None, "status": "active", "features": ["all"]}` for
   every call. Existing import sites keep working.
2. **Route removal.** Delete `/api/system/licensing/*`. Keep
   `/api/system/licensing/status` returning the constant payload above
   so any frontend code that still polls receives a non-404. Mark
   `/api/system/licensing/activate` and `.../deactivate` removed in
   CHANGELOG.
3. **Frontend cleanup.** Delete analytics module, banner, preference
   row. Remove any "Upgrade" CTAs, license tab, premium badges. Keep
   the `analytics_enabled` field in the API response shape so older
   clients don't break.
4. **Network isolation test.** Add `tests/test_no_phone_home.py`:
   - imports every module in `app/`; asserts no live HTTP client is
     constructed during import.
   - boots the FastAPI app in `pytest`'s in-process client with an
     OS-level firewall that blocks `*.borgui.com`, `*.umami.is`,
     `*.umami.cloud`, `*.posthog.com`, `*.sentry.io`, `*.segment.io`,
     `*.mixpanel.com`. The full lifecycle (boot → admin login → list
     repos → trigger backup) must complete without hitting any of
     those hosts.
5. **Existing tests.** All pre-existing pytest + vitest suites must
   still pass.
6. **Docker build.** Image builds; `docker compose up` on a fresh DB
   reaches a healthy state without external network access.

QAQC gate: both graders return 100/100 before Phase 2 begins.

### Phase 2 — Brand swap

Goal: every "Borg UI" string and every upstream-trademarked asset is
replaced. No code changes that affect functionality.

Components:

1. Replace logo files (`LogoWithBackground.png`, `LogoWithName.png`,
   `LogoWithNameWhite.png`, `borg-ui-logo.png`, `logo.png`,
   `frontend/public/favicon-*.png`, `frontend/public/logo.png`,
   `apple-touch-icon.png`).
2. Replace strings: `Borg UI` → `BorgScale`; `borg-ui` slug →
   `borgscale`; `Borg Web UI` → `BorgScale`. Preserve the lowercase
   `borg` references that name the underlying tool — those are
   correct usage of an unrelated trademark.
3. Update `package.json`, `pyproject.toml`, Dockerfile labels,
   `README.md`, doc site references, `index.html` `<title>`, OG
   tags, manifest.
4. Replace `borgui.com` URLs with `github.com/thekozugroup/BorgScale`.
5. Sweep the i18n bundles for English strings to update.

QAQC gate: both graders 100/100. Skeptic agent verifies no remaining
upstream branding in any rendered page.

### Phase 3 — UI migration to shadcn/ui

Goal: replace the MUI/Emotion stack with shadcn/ui + Tailwind under a
plain black/white stock theme. Layouts unchanged conceptually but
visually consistent.

Constraints:

- Use the **default shadcn/ui stock black/white theme** (no custom
  colour palette in v1). References: <https://ui.shadcn.com/>,
  <https://ui.shadcn.com/docs/components>, <https://ui.shadcn.com/blocks>,
  <https://ui.shadcn.com/charts/area>.
- The branding "logo" position is filled by the **lucide `boxes`**
  glyph (selected by the user 2026-04-30). Stacked-cubes mark evokes
  deduplicated chunks. Used at 16/24/64 px (favicon, sidebar, hero).
- Use it via `<Boxes />` from `lucide-react` (already present in the
  upstream dependency set). Favicon generated from the same SVG path
  for consistency.

Migration order (each step ships behind a feature flag, then enabled):

1. **Tooling.** Install Tailwind, configure with `npx shadcn@latest init`
   targeting the `frontend/src/components/ui/` directory. Bring in the
   following primitives on demand: `button`, `card`, `dialog`,
   `dropdown-menu`, `form`, `input`, `select`, `switch`, `table`,
   `tabs`, `toast`, `tooltip`, `progress`, `badge`, `sheet`, `command`,
   `popover`, `separator`, `skeleton`, `alert`, `avatar`, `accordion`,
   `radio-group`, `checkbox`, `slider`, `textarea`.
2. **Theme.** Apply the default black/white shadcn theme (CSS
   variables only). Drop MUI `ThemeProvider` once the tree is migrated.
3. **App shell.** Replace `Layout`, `AppBar`, `Drawer`, `NavList` with
   the shadcn `sidebar` block.
4. **Login + setup wizard.** Smallest, most isolated.
5. **Settings pages** (preferences, profile, users, notifications).
6. **Repository list and detail.**
7. **Backup wizard + schedule editor.** Most complex; today the worst
   gradient offender. Use shadcn `wizard` patterns from
   <https://ui.shadcn.com/blocks>.
8. **Dashboard.** Use the `charts/area` recipe for the activity graph
   instead of upstream's MUI chart.
9. **Archive browser** (file tree, restore drawer).
10. **Final cleanup.** Delete `@mui/*`, `@emotion/*`, MUI-specific
    icon imports. Standardise on `lucide-react`. Remove any leftover
    Emotion globals.

Per migrated page:
- Visual parity with the previous behaviour (no new features).
- Accessibility automatically inherited from Radix primitives behind
  shadcn.
- Vitest tests adjusted (selectors change but assertions stay).
- Skeptic grader reviews the page; must return 100/100.
- QAQC grader reviews codebase delta; must return 100/100.

## Security check before every commit/push

Every commit batch produced by an implementation subagent must pass a
local security scan **before** the merge into `main` and **before**
`git push origin main`. The scan covers:

- **Secret scan** (gitleaks against the staged tree).
- **Hardcoded credentials, tokens, API keys** in source.
- **Outbound URLs** newly introduced — every new HTTP request target
  is checked against an allowlist (`https://github.com/*`,
  `https://ghcr.io/*`, `http://127.0.0.1:*`, the user's tailnet, and
  the project's own GHCR/Docker Hub endpoints). Anything else fails
  the gate.
- **Dependency CVEs** for any newly added or version-bumped package
  (`pip-audit` for Python, `npm audit --audit-level high` for the
  frontend).

The scan is wrapped in `scripts/security-check.sh` (added in Phase 1
along with the rest of the QAQC tooling) and invoked from the
controller before every push, never from inside an implementation
subagent. A failed scan blocks the merge and surfaces the violation
to the design skeptic / QAQC pair for re-evaluation.

## Reporting cadence

The controller works waves to completion silently, only reporting back
to the user when **both** the QAQC agent and the Design Skeptic agent
have independently graded the work at **100/100**. Intermediate grade
trends are visible in the per-task notes but are not surfaced unless
the user asks.

## QAQC + Design Skeptic agents

Two specialised reviewer agents run after every commit batch.

### QAQC agent (codebase quality + anti-feature removal)

Inputs:
- Diff since last grade.
- The anti-features inventory in this spec.

Output:
- Grade 0–100.
- List of unresolved anti-feature traces.
- List of code quality regressions (typing, complexity, dead code,
  unused imports, dead branches).
- List of test gaps.

Pass condition: 100/100, zero items in any list.

### Design Skeptic agent (UI polish + consistency)

Inputs:
- Built frontend, served from a headless Chromium.
- Screenshots of every primary page at 1280×800 and 768×1024.

Output:
- Grade 0–100.
- List of inconsistencies: gradients, font drift, spacing drift,
  colour drift, broken focus rings, missing dark mode, accessibility
  contrast issues.
- List of missing visual states (hover, focus, disabled, loading,
  error).

Pass condition: 100/100, zero items in any list.

## Concurrency model

The implementation team is **up to 7 concurrent subagents**. Each one
operates in its own git worktree off of `main` to avoid index lock
conflicts. The controller merges branches in order after both graders
sign off on a phase.

Wave structure (mirrors Constellation pattern):

| wave | scope | concurrency |
| --- | --- | --- |
| 0 | Repo housekeeping (CLAUDE.md / contributing / CI rebrand stubs) | 1 |
| 1 | Phase 1 backend stub + route removal | 2 |
| 2 | Phase 1 frontend cleanup + analytics removal | 2 |
| 3 | Phase 1 network-isolation tests + image build | 1 |
| 4 | Phase 2 brand swap (assets, strings, docs split into 3 buckets) | 3 |
| 5 | Phase 3 tooling + shell + login wizard | 2 |
| 6 | Phase 3 settings + repository pages | 2 |
| 7 | Phase 3 backup wizard + dashboard + archive browser (charts) | 3 |
| 8 | Phase 3 final cleanup, MUI removal | 1 |
| 9 | Release: image build, README, GitHub Release | 1 |

Between waves: critic + QAQC + design skeptic. Iterate fixes until
both 100/100.

## Risks + mitigations

| risk | mitigation |
| --- | --- |
| Atmos's running `borg-ui` is a live production target — must not break it during migration | Build new image as `ghcr.io/thekozugroup/borgscale:dev` and stand it up on a separate port until Phase 1 ships green; cut over the compose entry only after passing both graders |
| Hidden license checks in unaudited paths | Phase 1 includes a network-isolation smoke test; container must complete a full backup against a local repo with no internet |
| Upstream pushes AGPL bugfixes after fork | Track `upstream` remote, weekly `git merge upstream/main` until upstream relicenses |
| MUI → shadcn migration breaks pages mid-flight | One page at a time; old + new components coexist via `tailwind` + `emotion` running in parallel; final cleanup deletes MUI only after the last component is migrated |
| AGPL compliance for our hosted instance | Ensure `/api/about` (or an "About" footer) links to the fork's source. Required by AGPL §13 for SaaS-style services |

## Files affected (high-level)

Phase 1 (~30 files):

- `app/services/licensing_service.py` (rewrite)
- `app/api/system.py` (delete routes)
- `app/config.py` (delete settings)
- `app/main.py` (delete startup hook)
- `frontend/src/utils/analytics.ts` (delete)
- `frontend/src/components/AnalyticsConsentBanner.tsx` (delete)
- `frontend/src/main.tsx` (drop init call)
- `frontend/src/contexts/AppContext.tsx` (drop conditional)
- `frontend/src/components/PreferencesTab.tsx` (drop row)
- `frontend/src/data/announcements.json` (drop the
  "Umami analytics" announcement entry)
- new: `tests/test_no_phone_home.py`

Phase 2 (~50 files; mostly text):

- `LogoWithBackground.png`, `LogoWithName.png`, `LogoWithNameWhite.png`,
  `borg-ui-logo.png`, `logo.png`, `frontend/public/*.png`
- `package.json` (top + frontend), `pyproject.toml`, Dockerfile
- `README.md`, `CHANGELOG.md`, `docs/**/*.md`
- `frontend/src/i18n/locales/*.json`
- `index.html`, `manifest.json`, `apple-touch-icon`

Phase 3 (~120 files):

- `frontend/package.json` (deps churn)
- `frontend/tailwind.config.ts`, `postcss.config.js`,
  `frontend/src/index.css`, `frontend/src/components/ui/*` (new shadcn)
- Every page in `frontend/src/pages/`
- Every component in `frontend/src/components/`
- Tests in `frontend/src/**/__tests__/`
- Final: removal of `@mui/*` and `@emotion/*` imports

## Out of scope (explicit)

- Adding new features beyond what upstream had at fork time.
- Migrating the database off SQLite.
- Replacing FastAPI with another framework.
- Any rewrite of the borg interaction layer.
- Multi-tenant / SaaS features.

## Open questions (resolved)

- Phase 3 visual identity: black/white shadcn stock theme. Confirmed
  2026-04-30.
- Phase 3 logo: `lucide:boxes`. Confirmed 2026-04-30.
- Spec review gate: must be graded 100/100 by a critic agent before
  any implementation work begins; the user has pre-approved that gate
  outcome and does not need to re-confirm.

## Open questions (still pending)

- None.
