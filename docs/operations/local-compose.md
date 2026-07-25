# Local Compose Operation

## Purpose

This is the canonical Version 1 runtime for Writers Room App. The same `compose.yaml` is intended to run on Piotr's Mac now and on a Linux VPS later without application-code changes.

The browser talks only to the frontend origin. Nginx serves the built Vue application and proxies API, image, SSE, and backend health traffic to the private backend service. Port `54321` is not published to the host.

## Prerequisites

- Docker Desktop with Docker Compose v2
- Git checkout of `tpoh93/Writers-Room-app`
- No real API keys or private writing committed to Git

## First startup

Run from the repository root:

```bash
cp .env.example .env
docker compose config
docker compose up --build -d
docker compose ps
```

Wait until both services report healthy, then verify the same-origin endpoints:

```bash
curl -fsS http://127.0.0.1:8080/healthz/frontend
curl -fsS http://127.0.0.1:8080/healthz/ready
```

Open:

```text
http://127.0.0.1:8080
```

Normal browser and diagnostic traffic must use this frontend origin. The backend container is reachable only inside the Compose network.

## Logs

```bash
docker compose logs --tail=200 backend frontend
```

Follow logs continuously:

```bash
docker compose logs -f backend frontend
```

Do not paste logs containing private writing, prompts, provider payloads, or credentials into public issues or commits.

## Stop and restart

Stop containers while preserving named volumes:

```bash
docker compose down
```

Restart:

```bash
docker compose up -d
```

Rebuild after code or dependency changes:

```bash
docker compose up --build -d
```

## Persistent storage

The stack uses named volumes:

- `writers_room_data` for SQLite application data
- `writers_room_backups` for backup files

`docker compose down` preserves both volumes. Do not use `docker compose down -v` unless intentionally destroying all local application data and backups.

## Create a backup

The backend stays online while SQLite creates a transactionally consistent backup through its backup API:

```bash
./scripts/backup.sh
./scripts/backup.sh --label before-upgrade
```

The command prints only the created path inside the persistent backup volume, for example:

```text
/backups/novelforge-20260725T223000000000Z-before-upgrade.db
```

Record this exact path before a risky migration or upstream import.

## Restore a backup

Restore is intentionally guarded. The backend is stopped before the database file is replaced.

```bash
./scripts/restore.sh /backups/novelforge-YYYYMMDDTHHMMSSffffffZ-before-upgrade.db --force
```

With `--force`, the restore command first creates a safety backup of the database being replaced under `/data/pre-restore/`. The CLI prints that safety-backup path when it is created.

Without `--force`, restore refuses to overwrite an existing database.

After a successful restore, the script starts backend and frontend again. Verify:

```bash
curl -fsS http://127.0.0.1:8080/healthz/ready
docker compose ps
```

Never run a manual file copy over the live SQLite database. Never restore while the backend is writing. Do not delete the safety backup until the restored application has been inspected.

## Safe network defaults

`.env.example` binds the frontend to `127.0.0.1:8080`. Do not change `APP_BIND_ADDRESS` to `0.0.0.0` for normal Version 1 use. Remote access will be provided through Tailscale, not router port forwarding, public tunnels, or a directly exposed backend port.

## Troubleshooting

Inspect rendered configuration:

```bash
docker compose config
```

Inspect service state:

```bash
docker compose ps
```

Check health from inside each container:

```bash
docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:54321/healthz/ready', timeout=2).read().decode())"
docker compose exec frontend wget -qO- http://127.0.0.1/healthz/frontend
```

The host should not have a listener for the backend service on port `54321`. A host-side request to that port is expected to fail in the canonical Compose stack.

## Clean-checkout acceptance

A clean checkout passes this operation slice when:

1. `docker compose config` succeeds.
2. `docker compose up --build -d` succeeds.
3. both services become healthy.
4. frontend health returns `ok` through `127.0.0.1:8080`.
5. backend readiness returns JSON through the same origin.
6. the editor shell loads in a browser.
7. stopping and starting containers preserves application data.
8. backup and forced restore reproduce the backed-up SQLite state.
9. a safety backup is created before replacing an existing database.
