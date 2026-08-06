<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.png" />
    <img alt="BorgScale Logo v2" src="assets/logo-light.png" width="360" />
  </picture>
</div>

---

<div align="center">
  <h5>
    <a href="https://github.com/thekozugroup/BorgScale">Website</a>
    <span> | </span>
    <a href="https://github.com/thekozugroup/BorgScale">Documentation</a>
    <span> | </span>
    <a href="https://hub.docker.com/r/ainullcode/borgscale">Docker Hub</a>
  </h5>
</div>

<div align="center">

[![Docker Hub](https://img.shields.io/docker/pulls/ainullcode/borgscale)](https://hub.docker.com/r/ainullcode/borgscale)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![GitHub Actions](https://github.com/thekozugroup/BorgScale/workflows/Build%20and%20Publish%20Docker%20Images/badge.svg)](https://github.com/thekozugroup/BorgScale/actions)
[![Tests](https://github.com/thekozugroup/BorgScale/workflows/Tests/badge.svg)](https://github.com/thekozugroup/BorgScale/actions/workflows/tests.yml)
[![codecov](https://codecov.io/gh/thekozugroup/BorgScale/branch/main/graph/badge.svg)](https://codecov.io/gh/thekozugroup/BorgScale)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/5KfVa5QkdQ)

</div>

<p align="center">
  <strong>A modern web interface for <a href="https://borgbackup.readthedocs.io/">Borg Backup</a></strong><br>
  Run backups, browse archives, restore files, manage repositories, and automate schedules from one interface.
</p>

## Highlights

- Dashboard for repository health, activity, schedules, and storage
- Repository management for local, SSH, and SFTP destinations
- Live backup progress, archive browsing, and restore workflows
- Automated schedules, maintenance actions, and pre/post backup hooks
- Notifications through 100+ Apprise services
- Remote machine management with SSH key deployment and storage visibility
- Support for BorgBackup 1.x and BorgBackup 2 beta workflows
- Multi-architecture containers for `amd64`, `arm64`, and `armv7`

> [!NOTE]
> BorgScale is developed with modern AI tooling as part of the workflow. Architecture, security, and release decisions are reviewed before merge.

## Release Readiness

Every push runs backend lint and format checks, the full backend unit and
integration suites, frontend typecheck, lint, format and unit tests, a
locale-parity check, a design-token contrast check, and core, extended and SSH
smoke suites against a built app. A release additionally has to pass that same
gate before any image is pushed, so a red commit cannot reach Docker Hub.

Two checks exist specifically to keep BorgScale honest:
`tests/test_no_phone_home.py` denies all outbound HTTP and fails on any
unexpected request, and `tests/unit/test_authorization_coverage.py` calls every
state-changing route as a signed-out client and as a low-privilege user and
fails if either gets through.

Docker Hub publishes the user-facing app image `ainullcode/borgscale`; the
separate `borgscale-runtime-base` image is an internal CI artifact.

## Interface

### Operations Overview

Track repository health, recent activity, storage, and day-to-day backup execution from the main product surfaces.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/readme/dashboard-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="screenshots/readme/dashboard-light.png" />
  <img alt="BorgScale dashboard" src="screenshots/readme/dashboard-light.png" width="100%" />
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/readme/repositories-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="screenshots/readme/repositories-light.png" />
  <img alt="Repository management" src="screenshots/readme/repositories-light.png" width="100%" />
</picture>

### Backup and Restore Workflows

Monitor live backup progress, inspect archives, and work through restore flows without dropping to the CLI.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/readme/backup-progress-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="screenshots/readme/backup-progress-light.png" />
  <img alt="Live backup progress" src="screenshots/readme/backup-progress-light.png" width="100%" />
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/readme/archive-browser-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="screenshots/readme/archive-browser-light.png" />
  <img alt="Archive browser" src="screenshots/readme/archive-browser-light.png" width="100%" />
</picture>

### Automation and Integrations

Automate schedules, manage remote machines, and configure notifications for ongoing backup operations.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/readme/schedule-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="screenshots/readme/schedule-light.png" />
  <img alt="Backup schedule management" src="screenshots/readme/schedule-light.png" width="100%" />
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/readme/remote-machines-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="screenshots/readme/remote-machines-light.png" />
  <img alt="Remote machines management" src="screenshots/readme/remote-machines-light.png" width="100%" />
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/readme/notifications-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="screenshots/readme/notifications-light.png" />
  <img alt="Notification services" src="screenshots/readme/notifications-light.png" width="100%" />
</picture>

## Getting Started

```bash
docker run -d \
  --name borg-web-ui \
  -p 8081:8081 \
  -v borg_data:/data \
  -v borg_cache:/home/borg/.cache/borg \
  -v /home/yourusername:/local:rw \
  ainullcode/borgscale:latest
```

Access the app at `http://localhost:8081` with `admin` / `admin123`.

For setup details, see the [installation guide](https://github.com/thekozugroup/BorgScale

## Documentation

- [Full documentation](https://github.com/thekozugroup/BorgScale)
- [Development guide](https://github.com/thekozugroup/BorgScale)
- [Testing guide](https://github.com/thekozugroup/BorgScale)

## Support

- [Discord community](https://discord.gg/5KfVa5QkdQ)
- [GitHub issues](https://github.com/thekozugroup/BorgScale/issues)

## Star History

<div align="center">

<a href="https://star-history.com/#thekozugroup/BorgScale&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=thekozugroup/BorgScale&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=thekozugroup/BorgScale&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=thekozugroup/BorgScale&type=Date" />
  </picture>
</a>

</div>

## Contributing

See the [contributing guide](.github/CONTRIBUTING.md) and the [development guide](docs/development.md).

## License

This project is licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
Every feature is available to every instance: no tiers, no plans, no license keys, no user limit.

AGPL §13 asks that anyone using a modified instance over a network can get its
source. BorgScale ships that out of the box — `GET /api/about` returns a
machine-readable source pointer, and a "Source (AGPL)" link sits in the footer of
every page. If you host a modified BorgScale for others, point both at your own
repository: your users need your source, not ours.

<div align="center">

Maintained by [The Kozu Group](https://github.com/thekozugroup).

</div>
