# Task 5 Review

## Verdict

CAUTION pending manual tailnet access verification.

## Scope reviewed

- `scripts/check-local-exposure.sh`
- `docs/operations/tailscale-local.md`
- `compose.yaml`
- `.env.example`
- Task 5 requirements from `docs/superpowers/plans/2026-07-25-sprint-0-foundation-spike.md`

## Review findings and resolutions

### Resolved P1

- The plan's original text grep depended on a particular human-readable `docker compose config` layout and could miss unsafe multiline port mappings. The implementation parses `docker compose config --format json` and evaluates the actual resolved service contracts.

### Resolved P2

- The first implementation attempted to pipe Compose JSON into a Python heredoc, but the heredoc would own standard input. The rendered configuration is now passed through an explicit environment variable and parsed with `json.loads`.

## Static safety properties

- Frontend published ports must have `host_ip` exactly equal to `127.0.0.1`.
- An omitted host address, `0.0.0.0`, `::`, or any other address is rejected.
- Backend host port publication is rejected.
- A missing `.env` produces an explicit setup failure instead of an ambiguous Compose error.
- Tailscale Serve is documented as the only approved remote-access layer.
- Tailscale Funnel, router forwarding, public tunnels, backend publication, and broad Docker binds are explicitly prohibited.

## Pending manual evidence

Gate C cannot be approved by CI alone. The project owner must verify:

1. an approved tailnet device reaches the HTTPS URL produced by Tailscale Serve;
2. the same URL is unreachable from outside the tailnet;
3. no router forwarding exists;
4. the test record contains no sensitive network or writing data.

The verdict becomes `LOOKS GOOD` after the static exposure check passes in CI and both manual observations are recorded.