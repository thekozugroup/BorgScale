# Privacy

**BorgScale does not collect analytics, telemetry, or usage statistics.**

There is no tracking script, no analytics endpoint, and no phone-home of any
kind. Nothing about your instance, your repositories, or your usage leaves the
machine you run it on.

This is a change from upstream `borg-ui`, which shipped anonymous usage
tracking. The Kozu Group fork removed it.

## What that means concretely

- The frontend loads no third-party scripts. Everything it needs — fonts,
  icons, the editor — is served from your own instance, so BorgScale works on
  an air-gapped network.
- The backend makes no outbound requests except the ones you configure
  yourself: your Borg repositories over SSH, your notification services, your
  MQTT broker, and your Redis cache.
- There is no license check, no activation call, and no update ping.

## How this is enforced

Two automated checks keep it that way, and both run in CI.

`tests/test_no_phone_home.py` starts the application with every outbound HTTP
call denied at the transport layer and exercises the startup path and the main
endpoints. Any request to a host the test did not explicitly allow fails the
suite, with the offending URL reported.

`scripts/security-scan.sh` scans the source tree for outbound URLs and fails on
any host outside the allowlist.

## Verifying it yourself

The source is AGPL-3.0 and is what runs — see `GET /api/about` on any instance
for the source pointer. To inspect a running container directly:

```bash
# Shows every socket the container has open
docker exec borg-web-ui ss -tunp
```

## Reporting a concern

If you find anything that contradicts this page, that is a bug and we want to
know. Open an issue at
[thekozugroup/BorgScale](https://github.com/thekozugroup/BorgScale/issues).
