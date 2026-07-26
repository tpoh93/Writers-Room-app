# Task 3 Review

## Verdict

LOOKS GOOD.

## Scope reviewed

- `frontend/src/renderer/src/api/request.ts`
- `frontend/package.json`
- `frontend/Dockerfile.web`
- `frontend/nginx.conf`
- `frontend/.dockerignore`
- `.env.example`
- `compose.yaml`
- `docs/operations/local-compose.md`
- `.github/workflows/sprint-0-backend.yml`
- Task 3 requirements from `docs/superpowers/plans/2026-07-25-sprint-0-foundation-spike.md`

## Review findings and resolutions

### Resolved P1

- The original plan documented a backend diagnostic URL that was not routed by Nginx while the backend port was intentionally not published. Exact `/healthz/live` and `/healthz/ready` same-origin proxy routes were added and the operations guide now uses them.

### Resolved P2

- The first CI version checked Docker health immediately after HTTP readiness and occasionally observed the valid transitional state `starting`. The checks now poll health deterministically and fail early on `unhealthy`.
- The first Compose CI version guessed generated container names. It now obtains container IDs through `docker compose ps -q`, preserving portability across Compose naming implementations.
- The upstream `build:web` lifecycle references a post-build backend-copy step that is not needed inside the split container architecture. A focused `build:web:container` command builds only the static web artifact and Docker installs dependencies with lifecycle scripts disabled.

## Spec compliance

- Web builds use same-origin API requests.
- Electron keeps the direct local backend URL.
- Nginx serves the Vue single-page application and proxies `/api`, `/imgs`, backend readiness, and backend liveness.
- Backend port `54321` is internal to the Compose network.
- The only published address defaults to `127.0.0.1:8080`.
- SQLite data and backup directories use named volumes.
- Frontend startup waits for backend readiness.
- Clean startup, logs, persistence boundaries, shutdown, and safe network defaults are documented.

## Hard evidence

GitHub Actions run `30178048386` completed successfully.

- `Frontend typecheck and web build`: PASS
  - Node.js 22 setup: PASS
  - dependency installation: PASS
  - full frontend typecheck: PASS
  - canonical web build: PASS
  - `dist-web/index.html` verification: PASS
- `Canonical Compose smoke test`: PASS
  - Compose configuration validation: PASS
  - backend and frontend image builds: PASS
  - same-origin frontend health: PASS
  - same-origin backend readiness: PASS
  - browser application shell contains the Vue mount point: PASS
  - both Compose services reached Docker `healthy`: PASS
  - host access to backend port `54321` was rejected: PASS
- Existing backend health and backend image jobs remained green.

## Final assessment

Task 3 establishes the canonical local-first web runtime and demonstrates that the same container graph runs successfully on a clean Linux GitHub runner. No open Critical, P1, or P2 findings remain.