# Copyright Notice

## BorgScale

Copyright (c) 2025 Karan Hudia
Copyright (c) 2026 The Kozu Group

## License

BorgScale is free software, licensed under the **GNU Affero General Public
License, version 3**. See [LICENSE](../LICENSE) for the complete terms.

This notice previously described the software as proprietary and confidential,
and stated that copying, redistribution and derivative works were not
permitted. That was never accurate for an AGPL-3.0 project and directly
contradicted the LICENSE file beside it. The AGPL grants exactly those rights.

## What the licence grants you

- Run BorgScale for any purpose, including commercially, at any scale.
- Study and modify the source.
- Redistribute copies, modified or not.

## What it asks in return

- Distributed copies, modified or not, stay under AGPL-3.0.
- Copyright notices — including the ones above — are preserved.
- Modified versions carry prominent notices of what changed.
- **Section 13:** if you run a modified version and let others use it over a
  network, those users are entitled to your modified source. BorgScale ships
  the machinery for this: `GET /api/about` returns a machine-readable source
  pointer, and a "Source (AGPL)" link appears in the footer of every page. If
  you host a modified version, repoint those at your own repository — leaving
  them aimed at ours does not discharge your obligation, because your users
  need your source, not ours.

## Third-party components

Bundled dependencies remain under their own licences, predominantly MIT and
Apache-2.0. BorgBackup is BSD-licensed and is executed as a separate program,
not linked into BorgScale.

## Docker images

- Docker Hub: `ainullcode/borgscale`
- Architectures: amd64, arm64, armv7
