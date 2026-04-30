# Contributing to BorgScale

Thanks for your interest in BorgScale, the AGPL-3.0 fork of
`karanhudia/borgscale`.

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
