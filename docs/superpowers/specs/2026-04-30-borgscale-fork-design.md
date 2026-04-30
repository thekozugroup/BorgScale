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

## Stack inventory (taken from fork at upstream HEAD `73d15ce0`; spec authored at `a4cee2b4`)

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

The list below is exhaustive across the fork's working tree as of spec commit `a4cee2b4`; none have been removed at this point. The Phase 1
QAQC agent verifies that no item from this table survives, and that
no equivalent has been re-introduced in any new code.

### Backend

| component | location | action |
| --- | --- | --- |
| Activation client | `app/services/licensing_service.py` | Rewrite as a 30-line stub that always returns `{"tier": "full", "entitlement_id": "open-source", "expires_at": null, "status": "active", "features": ["all"]}`. Public function names preserved so callers compile. The internal `_apply_entitlement` / `_clear_entitlement` / `_post_activation` / `refresh_entitlement` functions are deleted; the stub does NOT touch the database. |
| `entitlement_id` column | `app/database/models.py:`field on `User` (or wherever it lives) | Column is left in place to keep the migration history intact, but is never written and never read after Phase 1. The stub never persists anything to it. New migration `100_borgscale_drop_unused_entitlement_writes` does not drop the column; it only adds a comment row recording the deprecation. |
| Activation routes | `app/api/system.py:130+` (`/api/system/licensing/activate`, `/api/system/licensing/deactivate`, `/api/system/licensing/status`, `/api/system/licensing/refresh`) | Delete `/activate`, `/deactivate`, `/refresh`. Keep `/status` returning the constant payload from the stub above so legacy frontend polling does not 404. OpenAPI schema must lose the deleted routes. |
| Activation settings | `app/config.py:46-52` and reads at `app/config.py:208-217` | Delete the four `activation_*` settings and their `os.getenv` reads. Remove from any `.env.example`. |
| Startup auto-activation | `app/main.py:242` (call into `attempt_auto_full_access_activation`) | Delete the call site. Log a single line at INFO: `"BorgScale runs unrestricted."`. |
| Analytics columns | `app/database/models.py` (`analytics_enabled`, `analytics_consent_given`) | Columns retained for migration safety. Default values stay. Code paths that read them are removed. |
| Analytics migrations | `app/database/migrations/051_add_analytics_enabled.py`, `052_add_analytics_consent_given.py` | Retained (do not delete) so historical migrations apply cleanly. Add a comment in each noting BorgScale ignores the column. |
| Settings write path | `app/api/settings.py:99-100, 1137-1167` | The `analytics_enabled` and `analytics_consent_given` request fields are silently ignored on write. The response always returns `false` for both. The frontend caller of this endpoint loses the corresponding form rows in Phase 1 frontend cleanup. |

### Frontend — phone-home and content-fetch services

| component | location | action |
| --- | --- | --- |
| Umami analytics | `frontend/src/utils/analytics.ts` | Delete. |
| Analytics consent banner | `frontend/src/components/AnalyticsConsentBanner.tsx` (+ tests in `__tests__/`) | Delete. |
| Analytics init | `frontend/src/main.tsx`, `frontend/src/context/AppContext.tsx` | Remove imports and conditional init blocks. |
| Analytics preference UI | `frontend/src/components/PreferencesTab.tsx` (+ tests) | Drop the analytics row. The mutation no longer sends `analytics_enabled`. |
| Remote announcements service | `frontend/src/services/announcements.ts:8` (`DEFAULT_REMOTE_ANNOUNCEMENTS_URL`) | Replace remote URL with `null`. The service still loads `frontend/src/data/announcements.json` shipped in the bundle. The `VITE_ANNOUNCEMENTS_URL` env var is removed; the consumer (`useAnnouncementSurface`) only reads bundled JSON. The Umami-related entry in `announcements.json` is removed. |
| Remote plan-content service | `frontend/src/services/planContent.ts:10` (`DEFAULT_REMOTE_PLAN_CONTENT_URL`) | Service is deleted along with the entire plan-gating subsystem (next section). |

### Frontend — plan / entitlement / paywall scaffolding

All of the following are unconditionally deleted; their imports are
removed from any callers.

| component | location |
| --- | --- |
| Licensing settings tab | `frontend/src/components/LicensingTab.tsx` (+ tests) |
| Plan badge | `frontend/src/components/PlanBadge.tsx` (+ tests) |
| Plan gate (entitlement-conditional rendering) | `frontend/src/components/PlanGate.tsx` (+ tests) |
| Upgrade CTA prompt | `frontend/src/components/UpgradePrompt.tsx` (+ tests) — if absent, no-op |
| Plan info drawer | `frontend/src/components/PlanInfoDrawer.tsx` (+ tests) |
| Plan polling hook | `frontend/src/hooks/usePlan.ts` |
| Plan content hook | `frontend/src/hooks/usePlanContent.ts` |
| Plan content type definitions | `frontend/src/types/planContent.ts` |
| External-link constants | `frontend/src/utils/externalLinks.ts` (`BUY_URL`, etc.) |
| Plan content data | `frontend/src/data/plan-content.json` |
| Frontend API client licensing surface | `frontend/src/services/api.ts` (the `licensingAPI` block exporting `activate`, `deactivate`, `refresh`) |
| System info entitlement type | `frontend/src/hooks/useSystemInfo.ts` (`EntitlementInfo`, `paid_active`, `community` types and any UI states gated on them) |

After deletion, every call site is rewritten to assume "full access".
A grep for `usePlan`, `EntitlementInfo`, `BUY_URL`, `LicensingTab`,
`PlanBadge`, `PlanGate`, `PlanInfoDrawer`, `UpgradePrompt` in the
frontend tree must return zero matches at the end of Phase 1.

### Frontend — strings referencing `borgui.com`

Mass rename in Phase 2, but tracked here so Phase 1 doesn't accidentally
delete the surrounding components:

| location | content |
| --- | --- |
| `frontend/src/locales/{en,es,de,it}.json:3311` | `"buyLink": "Upgrade at borgui.com"` (deleted by Phase 1 plan-gating removal — the i18n key becomes orphaned and is removed in the same commit) |
| `frontend/src/data/plan-content.json:456-460` | `support@borgui.com` references in four locales (whole file deleted in Phase 1) |
| `frontend/src/utils/externalLinks.ts:1` | `BUY_URL = 'https://borgui.com/buy'` (file deleted in Phase 1) |
| `frontend/src/services/{announcements,planContent}.ts` | `https://updates.borgui.com/...` defaults (handled above) |
| `frontend/src/components/__tests__/PlanGate.test.tsx` | references `borgui.com` (deleted with `PlanGate.tsx`) |
| upstream `README.md`, `CHANGELOG.md`, doc site | Replaced in Phase 2 with `github.com/thekozugroup/BorgScale`. |

### AGPL §13 compliance (Phase 2 deliverable)

Because BorgScale is served over a network, AGPL §13 obliges the
operator to offer the source. Phase 2 (NOT Phase 1) adds:

- `GET /api/about` returning `{"name": "BorgScale", "version": "<SemVer>", "source": "https://github.com/thekozugroup/BorgScale", "license": "AGPL-3.0", "license_url": "https://www.gnu.org/licenses/agpl-3.0.html", "upstream": "https://github.com/karanhudia/borg-ui"}`.
- A footer link "Source (AGPL)" on every page that resolves to the
  `source` URL above.
- A pytest case `tests/test_agpl_about_endpoint.py` asserting the
  endpoint returns 200 with the expected keys.
- The Design Skeptic agent verifies the footer link is present and
  reachable on every primary page.

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
4. **Network-isolation test.** Add `tests/test_no_phone_home.py`:
   - imports every module in `app/`; asserts no live HTTP client is
     constructed during import.
   - patches `httpx.AsyncClient` (and `httpx.Client`) via `respx` so
     any unexpected outbound HTTP attempt fails the test. `respx`
     declares an empty allowlist; any unmocked call is a failure with
     full request URL captured. The same test boots the FastAPI app
     via `TestClient`, drives the full lifecycle (admin login → list
     repos → register a local repo → run a backup against a tempdir
     borg repo). Zero outbound HTTP attempts must occur.
   - The list of denied hosts is documented as
     `*.borgui.com`, `*.umami.is`, `*.umami.cloud`, `*.posthog.com`,
     `*.sentry.io`, `*.segment.io`, `*.mixpanel.com`,
     `*.amplitude.com`, `*.google-analytics.com`,
     `*.googletagmanager.com`. The respx default-deny configuration
     covers all of them by virtue of being a default-deny mock.
5. **Existing tests.** All pre-existing pytest + vitest suites must
   still pass.
6. **Docker container smoke test.** A separate test invoked from
   `scripts/security-scan.sh` (NOT from `pytest`) runs the built
   container with `--network none` and asserts that the FastAPI app
   reports healthy via the in-container loopback within 30 seconds,
   that admin login succeeds, and that a fresh local borg repo can
   be initialised and backed up. This is the real network-isolation
   integration test; the respx-based unit tests cover the same
   surface at the Python level.

QAQC gate: both the QAQC agent and the Design Skeptic agent return 100/100 before Phase 2 begins.

### Phase 2 — Brand swap

Goal: every "Borg UI" string and every upstream-trademarked asset is
replaced. No code changes that affect functionality.

Components:

1. **Logo asset replacement.** All raster logo files at the repo root
   and under `frontend/public/`/`assets/` are regenerated from the
   `lucide:boxes` SVG path at the original pixel sizes. A one-off
   script `scripts/generate-logos.mjs` reads
   `frontend/src/assets/lucide-boxes.svg` (committed alongside),
   pads to a square, fills foreground `#000` on `#fff` (light) and
   `#fff` on `#000` (white-on-black variant), and exports PNGs at
   the same pixel sizes the upstream assets used. Files refreshed:
   `LogoWithBackground.png`, `LogoWithName.png`, `LogoWithNameWhite.png`,
   `borg-ui-logo.png` (renamed to `borgscale-logo.png` — old name
   removed), `logo.png`, `frontend/public/favicon-{16x16,32x32}.png`,
   `frontend/public/logo.png`, `frontend/public/apple-touch-icon.png`,
   any references to those filenames. Until Phase 3 swaps the layout,
   the wordmark next to the logo continues to read "BorgScale" via
   the existing MUI `<Typography>` component.
2. **String replacement.** `Borg UI` → `BorgScale`; `borg-ui` slug →
   `borgscale`; `Borg Web UI` → `BorgScale`. Preserve lowercase
   `borg` references that name the underlying tool — those are
   correct usage of an unrelated trademark.
3. **Manifest, Docker, package metadata.** Update top-level
   `package.json`, `frontend/package.json`, `pyproject.toml`,
   `Dockerfile` labels (`org.opencontainers.image.*`), `README.md`,
   `CHANGELOG.md`, every file under `docs/`, `index.html` `<title>`,
   OG tags, `manifest.json` (`name`, `short_name`, `theme_color`).
4. **`borgui.com` URL sweep.** Replace any remaining mentions with
   `https://github.com/thekozugroup/BorgScale`. Old support contacts
   (`support@borgui.com` etc.) become a single
   `https://github.com/thekozugroup/BorgScale/issues` link. Confirm
   `grep -rn 'borgui\.com' .` returns zero non-test matches.
5. **i18n bundle sweep.** `frontend/src/locales/{en,es,de,it}.json`
   updated for every translated string mentioning the old product
   name. Orphaned keys (e.g. `buyLink`) deleted.
6. **AGPL §13 endpoint and footer.** Add `GET /api/about` returning
   the JSON contract specified earlier (name/version/source/license/
   license_url/upstream); add a footer link "Source (AGPL)" on every
   page wired to the same `source` URL; add `tests/test_agpl_about_endpoint.py`
   asserting the endpoint shape.

QAQC gate: QAQC agent and Design Skeptic agent both 100/100. Skeptic
verifies no remaining upstream branding in any rendered page and
confirms the AGPL footer link renders on every page.

### Phase 3 — UI migration to shadcn/ui

Goal: replace the MUI/Emotion stack with shadcn/ui + Tailwind under a
plain black/white stock theme. Layouts unchanged conceptually but
visually consistent.

Constraints:

- Use the **default shadcn/ui stock black/white theme** (no custom
  colour palette in v1). References: <https://ui.shadcn.com/>,
  <https://ui.shadcn.com/docs/components>, <https://ui.shadcn.com/blocks>,
  <https://ui.shadcn.com/charts/area>.
- **Dark mode preserved.** shadcn/ui ships with light + dark CSS
  variable sets out of the box; the existing `ThemeContext.tsx`
  toggle (system / light / dark) is wired to the `class="dark"`
  strategy on `<html>`. The Design Skeptic agent verifies both modes for
  every migrated page.
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

The scan is wrapped in `scripts/security-scan.sh` (added in Phase 1
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

The Design Skeptic is implemented as a thin wrapper around
[Impeccable](https://impeccable.style/) — a deterministic CLI that
runs 25 design-quality checks (gradients, nested cards, low-contrast
labels, gradient-text headings, broken focus rings, etc.) and emits
JSON per-violation. Installed in Wave 6 alongside the Tailwind +
shadcn tooling and used from Wave 7 onward.

Inputs:
- Built frontend (`frontend/dist/`).
- `npx impeccable detect frontend/src/ --json` output.
- Screenshots of every primary page at 1280×800 and 768×1024 (light
  + dark) rendered in headless Chromium for the qualitative pass.

Process per wave:
1. `cd frontend && npm run build`.
2. `npx impeccable detect src/ --json --severity all > /tmp/impeccable.json`.
3. Parse JSON. If any violation has severity `error`, the wave is
   blocked at 0 — implementer must fix.
4. If only `warning` / `info` severities remain, the agent does a
   second qualitative pass over the screenshots and reports any
   remaining inconsistencies (visual states, dark-mode parity,
   shadcn-conformance regressions) that Impeccable does not cover.
5. Grade `100 - len(remaining_issues)` capped at `[0, 100]`.

Output:
- Grade 0–100.
- Impeccable JSON report attached.
- List of remaining qualitative inconsistencies (if any) with the
  page name, viewport, and theme.
- List of missing visual states (hover, focus, disabled, loading,
  error).

Pass condition: 100/100, zero error-severity Impeccable violations,
zero qualitative issues. Impeccable's deterministic fail-on-severity
gate runs in CI on every push (Wave 0 wires it into
`scripts/security-scan.sh` once Impeccable is installed in Wave 6).

## Concurrency model

The implementation team is **up to 7 concurrent subagents**. Each one
operates in its own git worktree off of `main` to avoid index lock
conflicts. The controller merges branches in order after both the QAQC agent and the Design Skeptic agent
sign off on a phase.

Wave structure (mirrors Constellation pattern):

| wave | scope | concurrency |
| --- | --- | --- |
| 0 | Repo housekeeping (see Wave 0 detail below). | 1 |
| 1 | Phase 1 backend stub + route removal | 2 |
| 2 | Phase 1 frontend cleanup + analytics removal | 2 |
| 3 | Phase 1 network-isolation tests + image build | 1 |
| 4 | Phase 2 brand swap (assets, strings, docs split into 3 buckets) | 3 |
| 5 | Phase 3 tooling + shell + login wizard | 2 |
| 6 | Phase 3 settings + repository pages | 2 |
| 7 | Phase 3 backup wizard FIRST (defines shared shadcn primitives like `wizard`/`stepper`/`form` patterns), THEN dashboard + archive browser dispatched in parallel after the wizard branch merges | 3 (sequenced — wizard alone, then 2 parallel) |
| 8 | Phase 3 final cleanup, MUI removal | 1 |
| 9 | Release: image build, README, GitHub Release | 1 |

Between waves: critic + QAQC + Design Skeptic. Iterate fixes until
both 100/100.

### Wave 0 detail (deliverables)

The repository at fork time has neither `CLAUDE.md` nor `CONTRIBUTING.md`
geared to BorgScale. Wave 0 creates them de novo and rewires the security
gate. Concrete deliverables:

1. **`CLAUDE.md`** at repo root. Required sections:
   - "Project overview" — one paragraph naming BorgScale as the AGPL-3.0
     fork of upstream `karanhudia/borg-ui`, with a link to the fork URL.
   - "Repository layout" — table of `app/` (FastAPI), `frontend/`
     (React + TS + Vite, MUI v7 → shadcn/ui), `tests/`, `docs/`,
     `scripts/`, `.github/workflows/`.
   - "Build & test" — exact commands: `cd frontend && npm ci && npm run build`,
     `pip install -r requirements.txt`, `pytest`, `cd frontend && npm test`,
     `npm run lint`, `npm run typecheck`.
   - "Security gate" — describes `scripts/security-scan.sh` and the
     four checks (gitleaks, outbound-URL allowlist, pip-audit, npm audit).
   - "Grader agents" — section listing the QAQC agent and the Design
     Skeptic agent, the inputs each receives, and the gate condition
     (both 100/100).
   - "AGPL note" — one paragraph clarifying the fork must remain AGPL-3.0
     and that `/api/about` plus a footer link satisfy AGPL §13 for hosted
     instances.

2. **`CONTRIBUTING.md`** rewritten for BorgScale. Required sections:
   - "Setup" — clone + install commands.
   - "Branch + commit policy" — short branches, conventional commits.
   - "Test requirements" — must pass `pytest`, `npm test`, `npm run lint`,
     `npm run typecheck` before opening a PR.
   - "Security gate" — must pass `scripts/security-scan.sh` before push.
   - "Anti-feature reminder" — one paragraph reminding contributors that
     phone-home, telemetry, and paywall scaffolding are out-of-scope and
     blocked by the QAQC agent.
   - "Upstream sync" — instructions to `git fetch upstream && git merge
     upstream/main` for AGPL-era bugfixes only; expressly forbids merging
     any post-relicense upstream commit.

3. **`scripts/security-scan.sh`** is **modified, not created**. The file
   already exists with `pip-audit` and `npm audit`. Wave 0 ADDS:
   - `gitleaks protect --staged --no-banner --redact` (exits non-zero on
     leak).
   - A staged-diff outbound-URL allowlist scan: greps `git diff --cached`
     for newly-introduced `https?://` URLs and fails the run if any new
     host is not in the allowlist `github.com`, `ghcr.io`, `127.0.0.1`,
     `localhost`, `*.tailscale.com`, `docker.io`, `pypi.org`,
     `npmjs.org`, `npm.pkg.github.com`, `lucide.dev`, `ui.shadcn.com`,
     `gnu.org`, `borgbackup.readthedocs.io`.
   - Final exit 0 only if all four checks pass; prints a single-line
     summary.

4. **CI hook.** Modify the existing `.github/workflows/security.yml`
   (NOT a non-existent `ci.yml`) to invoke `scripts/security-scan.sh`
   on every push and pull request to `main`. Combine with the existing
   Trivy / scheduled-scan steps already in that workflow.

5. **`frontend/src/assets/lucide-boxes.svg`.** Commit the upstream
   lucide `boxes` SVG (project under ISC; SVG is bundle-redistributable).
   Used by Phase 2's `scripts/generate-logos.mjs` and Phase 3's React
   components.

6. **Spec-baseline correction.** The text "exhaustive at fork commit
   `a4cee2b4`" in the anti-features section is rephrased to *"exhaustive
   across the fork's working tree as of spec commit `a4cee2b4`; none
   have been removed at this point."*

7. **`VITE_*` env-var cleanup.** Phase 1 deletion list is amended to
   include `frontend/src/vite-env.d.ts` (drop the `VITE_ANNOUNCEMENTS_URL`
   and `VITE_PLAN_CONTENT_URL` interface properties). No `.env.example`
   for the frontend exists, so no further `.env` updates required.

Wave 0 controller workflow:
- Wave 0 ships in a single feature branch off `main` named
  `wave-0-housekeeping`.
- Once it merges, `scripts/security-scan.sh` is the gate enforced by the
  controller for every subsequent wave's merge — invoked from the
  controller (NOT inside subagents). Subagents commit on their feature
  branches; the controller runs the gate before merging each subagent
  branch into `main` and before pushing.

## Risks + mitigations

| risk | mitigation |
| --- | --- |
| Atmos's running `borg-ui` is a live production target — must not break it during migration | Build new image as `ghcr.io/thekozugroup/borgscale:dev` and stand it up on a separate port until Phase 1 ships green; cut over the compose entry only after passing both the QAQC agent and the Design Skeptic agent |
| Hidden license checks in unaudited paths | Phase 1 includes a network-isolation smoke test; container must complete a full backup against a local repo with no internet |
| Upstream pushes AGPL bugfixes after fork | Track `upstream` remote, weekly `git merge upstream/main` until upstream relicenses |
| MUI → shadcn migration breaks pages mid-flight | One page at a time; old + new components coexist via `tailwind` + `emotion` running in parallel; final cleanup deletes MUI only after the last component is migrated |
| AGPL compliance for our hosted instance | Ensure `/api/about` (or an "About" footer) links to the fork's source. Required by AGPL §13 for SaaS-style services |

## Files affected (high-level)

Phase 1 (~50 files):

- `app/services/licensing_service.py` (rewrite to stub)
- `app/api/system.py` (delete `/licensing/{activate,deactivate,refresh}`; keep `/status` returning the constant)
- `app/api/settings.py` (drop `analytics_enabled` / `analytics_consent_given` reads + writes; response always returns `false`)
- `app/config.py` (delete `activation_*` settings + env-var reads)
- `app/main.py` (delete startup activation hook)
- `app/database/migrations/051_add_analytics_enabled.py` (add deprecation comment, leave logic intact)
- `app/database/migrations/052_add_analytics_consent_given.py` (add deprecation comment, leave logic intact)
- new: `app/database/migrations/100_borgscale_drop_unused_entitlement_writes.py` (no-op, comment-only)
- `frontend/src/utils/analytics.ts` (delete)
- `frontend/src/components/AnalyticsConsentBanner.tsx` (delete)
- `frontend/src/components/LicensingTab.tsx` (delete)
- `frontend/src/components/PlanBadge.tsx` (delete)
- `frontend/src/components/PlanGate.tsx` (delete)
- `frontend/src/components/PlanInfoDrawer.tsx` (delete)
- `frontend/src/components/UpgradePrompt.tsx` (delete if present)
- `frontend/src/hooks/usePlan.ts` (delete)
- `frontend/src/hooks/usePlanContent.ts` (delete)
- `frontend/src/hooks/useSystemInfo.ts` (drop `EntitlementInfo` and any `paid_active` / `community` UI states)
- `frontend/src/utils/externalLinks.ts` (delete)
- `frontend/src/services/api.ts` (drop `licensingAPI` block)
- `frontend/src/services/announcements.ts` (drop remote URL default; bundled JSON only)
- `frontend/src/services/planContent.ts` (delete)
- `frontend/src/data/plan-content.json` (delete)
- `frontend/src/data/announcements.json` (drop "Umami analytics" entry)
- `frontend/src/main.tsx` (drop analytics init)
- `frontend/src/context/AppContext.tsx` (drop analytics conditional)
- `frontend/src/components/PreferencesTab.tsx` (drop analytics row)
- `frontend/src/locales/{en,es,de,it}.json` (drop orphaned `buyLink` and any plan-gate keys)
- `frontend/src/vite-env.d.ts` (drop `VITE_ANNOUNCEMENTS_URL` and `VITE_PLAN_CONTENT_URL` interface declarations)
- `frontend/src/types/planContent.ts` (delete — type definitions for the deleted plan-content service)
- every `frontend/src/**/__tests__/*.tsx` test file referencing the deleted components (delete or amend)
- new: `tests/test_no_phone_home.py`
- modified: `scripts/security-scan.sh` (Wave 0 — adds gitleaks + URL-allowlist checks)

Phase 2 (~50 files; mostly text):

- `LogoWithBackground.png`, `LogoWithName.png`, `LogoWithNameWhite.png`,
  `borg-ui-logo.png`, `logo.png`, `frontend/public/*.png`
- `package.json` (top + frontend), `pyproject.toml`, Dockerfile
- `README.md`, `CHANGELOG.md`, `docs/**/*.md`
- `frontend/src/locales/*.json`
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
