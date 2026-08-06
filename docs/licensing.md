---
layout: default
title: Licensing
nav_order: 12
---

# Licensing

BorgScale is licensed under the **GNU Affero General Public License v3.0**, and
every feature is available to every instance. There are no tiers, no paid
plans, no license keys, no activation step, and no user limit.

Upstream `borg-ui` gated some capabilities behind Community, Pro and Enterprise
tiers. The Kozu Group fork removed that gating; `app/core/features.py` now
grants every feature unconditionally, and `tests/unit/test_core_features.py`
pins that behaviour so a restriction cannot be reintroduced by accident.

## What AGPL-3.0 means for you

**Running it.** Use BorgScale for anything, including commercially, at any
scale, with no fee and no registration.

**Modifying it.** Change whatever you like. If you distribute your modified
version, or let others use it over a network, you must offer them the
corresponding source under the same licence.

**Section 13 — the network clause.** This is the part that distinguishes AGPL
from GPL. If you host a modified BorgScale and other people use it over a
network, those users are entitled to your modified source.

BorgScale satisfies §13 out of the box:

- `GET /api/about` returns a machine-readable pointer to the source, the
  licence, and the upstream project.
- A "Source (AGPL)" link appears in the footer of every page.

If you modify BorgScale and host it for others, **update that pointer to your
own source repository**. Leaving it pointing at ours does not discharge your
obligation, because your users need *your* source, not ours.

## Third-party components

BorgScale bundles frontend and backend dependencies under their own licences,
predominantly MIT and Apache-2.0. BorgBackup itself is BSD-licensed and is
executed as a separate program, not linked into BorgScale.

## Full text

See [LICENSE](https://github.com/thekozugroup/BorgScale/blob/main/LICENSE) in
the repository, or the
[GNU AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html).
