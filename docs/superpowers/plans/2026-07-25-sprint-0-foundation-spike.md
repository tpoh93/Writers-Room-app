# Sprint 0 Foundation Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that the NovelForge fork can run privately on Piotr's Mac, move later to a VPS without application-code changes, and safely execute one selected-text Kimi to Grok to Aion pipeline with preview, accept, reject, retry, and persisted evidence.

**Architecture:** Keep the Vue 3 and CodeMirror frontend, FastAPI backend, SQLModel/SQLite persistence, and existing workflow engine. Make the web runtime canonical behind a same-origin Nginx proxy, add Compose-managed persistent volumes, reuse `WorkflowRun` and `NodeExecutionState` for pipeline state, add one plain-text workflow node, and isolate selection safety in focused pure modules before wiring UI.

**Tech Stack:** Docker Compose, Nginx, Vue 3, TypeScript, CodeMirror 6, Vitest, FastAPI, SQLModel, SQLite, pytest, LangChain provider adapters, OpenRouter, Tailscale.

## Global Constraints

- Upstream baseline is `RhythmicWave/NovelForge` commit `ca7ca584580df0220a6a0d008309e5575b3dc449` (`v0.9.6`).
- Repository is `tpoh93/Writers-Room-app` and remains AGPLv3.
- Web runtime is canonical; Electron remains supported but is not the deployment source of truth.
- Version 1 is private, single-owner, local-first, and reachable remotely only through Tailscale.
- No public registration, password reset, billing, organizations, public sharing, PostgreSQL, Kubernetes, or public deployment automation.
- SQLite remains the primary database.
- OpenRouter is the primary provider through the existing OpenAI-compatible transport.
- Real credentials, private writing, runtime databases, and backups must never enter Git.
- A generated patch is destructive only after explicit acceptance.
- Any document change between capture and acceptance causes a conflict in Sprint 0; the implementation must not guess a new insertion point.
- Every task is performed on a dedicated branch or isolated worktree and ends with independent verification and a commit.

---

## Planned File Structure

### Runtime and operations

- Create: `compose.yaml` — canonical local and VPS-compatible service graph.
- Create: `.env.example` — non-secret runtime contract.
- Modify: `.gitignore` — ignore local environment files, volumes, evidence containing private text, and Superdesign temporary files.
- Create: `backend/Dockerfile` — FastAPI runtime image.
- Create: `backend/.dockerignore` — backend build exclusions.
- Create: `frontend/Dockerfile.web` — web frontend builder and Nginx runtime image.
- Create: `frontend/nginx.conf` — same-origin static serving and API/SSE proxy.
- Create: `frontend/.dockerignore` — frontend build exclusions.
- Create: `scripts/backup.sh` — container-safe SQLite backup entry point.
- Create: `scripts/restore.sh` — guarded restore entry point.
- Create: `scripts/check-local-exposure.sh` — reject unsafe host bindings.
- Create: `docs/operations/local-compose.md` — clean-checkout startup and shutdown.
- Create: `docs/operations/tailscale-local.md` — trusted-device access and public-exposure negative test.
- Create: `docs/operations/vps-portability.md` — Linux portability drill.

### Backend

- Modify: `backend/main.py` — add liveness and readiness endpoints.
- Modify: `backend/requirements.txt` — preserve runtime dependencies only.
- Create: `backend/requirements-dev.txt` — pytest, pytest-asyncio, and httpx.
- Create: `backend/tests/test_health.py` — health endpoint tests.
- Create: `backend/app/core/storage.py` — normalized data and backup path settings.
- Create: `backend/app/services/backup_service.py` — SQLite backup, integrity validation, and guarded restore.
- Create: `backend/app/cli/backup.py` — CLI wrapper around backup service.
- Create: `backend/app/cli/restore.py` — CLI wrapper around restore service.
- Create: `backend/tests/services/test_backup_service.py` — backup and restore tests.
- Create: `backend/app/services/text_patch_service.py` — SHA-256 snapshot and idempotent patch validation.
- Create: `backend/tests/services/test_text_patch_service.py` — text safety tests.
- Create: `backend/app/services/workflow/nodes/ai/text_generate.py` — plain-text LLM workflow node.
- Modify: `backend/app/api/endpoints/workflows.py` — pre-create parameterized runs, execute from persisted parameters, expose node outputs.
- Modify: `backend/app/schemas/workflow.py` — request and response schemas for parameterized execution and node-state reads.
- Create: `backend/tests/workflow/test_parameterized_text_pipeline.py` — deterministic three-step pipeline tests.
- Create: `backend/app/bootstrap/workflows/thinking_porn_spike.wf` — first three-step pipeline definition.

### Frontend

- Modify: `frontend/src/renderer/src/api/request.ts` — use same-origin requests in production web builds.
- Create: `frontend/src/renderer/src/api/selectionPipelines.ts` — start run, stream events, read outputs, mark patch state.
- Create: `frontend/src/renderer/src/utils/selectionPatch.ts` — capture and validate immutable selection snapshots.
- Create: `frontend/src/renderer/src/utils/__tests__/selectionPatch.test.ts` — selection safety unit tests.
- Create: `frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue` — brief, progress, step outputs, diff, conflict, accept, reject.
- Modify: `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue` — launch the pipeline and apply one undoable transaction.
- Modify: `frontend/package.json` — add Vitest and test scripts.

### Evidence

- Create: `docs/acceptance/sprint-0-matrix.md` — Gate A through Gate E evidence table.
- Create: `docs/acceptance/sprint-0-go-no-go.md` — final evidence-based fork decision.
- Create: `scripts/smoke-openrouter.sh` — redaction-safe real-provider smoke runner.

---

### Task 1: Freeze the Fork Baseline and Verification Contract

**Files:**
- Create: `docs/architecture/upstream-sync.md`
- Create: `scripts/verify-upstream.sh`
- Create: `docs/acceptance/sprint-0-matrix.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: upstream commit `ca7ca584580df0220a6a0d008309e5575b3dc449`.
- Produces: `scripts/verify-upstream.sh`, which exits `0` only when the recorded baseline and license files exist; acceptance matrix used by every later task.

- [ ] **Step 1: Write the baseline verification script**

```bash
#!/usr/bin/env bash
set -euo pipefail

EXPECTED_UPSTREAM="ca7ca584580df0220a6a0d008309e5575b3dc449"

if [[ ! -f LICENSE ]]; then
  echo "FAIL: LICENSE is missing" >&2
  exit 1
fi

if ! grep -qi "GNU AFFERO GENERAL PUBLIC LICENSE" LICENSE; then
  echo "FAIL: LICENSE is not AGPL" >&2
  exit 1
fi

if [[ ! -f docs/architecture/upstream-sync.md ]]; then
  echo "FAIL: upstream sync documentation is missing" >&2
  exit 1
fi

if ! grep -q "$EXPECTED_UPSTREAM" docs/architecture/upstream-sync.md; then
  echo "FAIL: expected upstream baseline is not recorded" >&2
  exit 1
fi

printf 'PASS: upstream baseline %s is recorded and AGPL notice exists\n' "$EXPECTED_UPSTREAM"
```

- [ ] **Step 2: Make it executable and verify the intended initial failure**

Run:

```bash
chmod +x scripts/verify-upstream.sh
./scripts/verify-upstream.sh
```

Expected: `FAIL: upstream sync documentation is missing`.

- [ ] **Step 3: Write the upstream synchronization document**

The document must define these exact remotes and commands:

```bash
git remote -v
git remote add upstream https://github.com/RhythmicWave/NovelForge.git
git fetch upstream --tags
git branch upstream-baseline ca7ca584580df0220a6a0d008309e5575b3dc449
git switch -c upstream-sync/YYYY-MM-DD main
git merge --no-commit --no-ff upstream/main
```

It must also require a dedicated `upstream-sync/*` branch, tests before merge, retained AGPL notices, and a short modification summary for each accepted upstream batch.

- [ ] **Step 4: Create the acceptance matrix**

Create rows for:

```text
A1 pinned upstream commit
A2 AGPL notices intact
B1 Compose builds
B2 backend healthy
B3 frontend healthy
B4 data persists
B5 secrets absent from Git
C1 trusted Tailscale device reaches app
C2 no public route
D1 three model configs execute in order
D2 intended handoff verified
D3 final diff visible
D4 accept changes only selection
D5 reject changes nothing
D6 changed document blocks apply
E1 clean Linux start
E2 restored data usable
E3 no code change required
```

Each row contains `Status`, `Command or evidence`, `Artifact`, and `Reviewer`.

- [ ] **Step 5: Extend `.gitignore`**

Add:

```gitignore
.env
.env.*
!.env.example
runtime/
backups/
*.db
*.db-shm
*.db-wal
*.sqlite
*.sqlite3
evidence/private/
.superdesign/tmp/
```

- [ ] **Step 6: Run verification**

```bash
bash -n scripts/verify-upstream.sh
./scripts/verify-upstream.sh
git diff --check
```

Expected: all commands succeed.

- [ ] **Step 7: Commit**

```bash
git add .gitignore docs/architecture/upstream-sync.md docs/acceptance/sprint-0-matrix.md scripts/verify-upstream.sh
git commit -m "docs: freeze NovelForge upstream baseline"
```

---

### Task 2: Add Backend Health Checks and a Reproducible Runtime Image

**Files:**
- Create: `backend/requirements-dev.txt`
- Create: `backend/tests/test_health.py`
- Modify: `backend/main.py`
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Consumes: existing FastAPI `app` in `backend/main.py`.
- Produces: `GET /healthz/live` and `GET /healthz/ready`; backend image exposing port `54321`.

- [ ] **Step 1: Add development test dependencies**

```text
-r requirements.txt
pytest==8.4.1
pytest-asyncio==1.1.0
httpx==0.28.1
```

- [ ] **Step 2: Write failing health tests**

```python
from fastapi.testclient import TestClient

from main import app


def test_liveness_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/healthz/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_endpoint_reports_database() -> None:
    with TestClient(app) as client:
        response = client.get("/healthz/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}
```

- [ ] **Step 3: Run the tests and confirm failure**

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest tests/test_health.py -v
```

Expected: both requests return `404`.

- [ ] **Step 4: Implement liveness and readiness**

Add to `backend/main.py`:

```python
from sqlalchemy import text
from sqlmodel import Session

from app.db.session import engine


@app.get("/healthz/live")
def health_live():
    return {"status": "ok"}


@app.get("/healthz/ready")
def health_ready():
    with Session(engine) as session:
        session.exec(text("SELECT 1"))
    return {"status": "ready", "database": "ok"}
```

- [ ] **Step 5: Run health tests**

```bash
cd backend
python -m pytest tests/test_health.py -v
```

Expected: `2 passed`.

- [ ] **Step 6: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 54321

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:54321/healthz/ready', timeout=2)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "54321"]
```

- [ ] **Step 7: Create `backend/.dockerignore`**

```text
.env
.venv
__pycache__
.pytest_cache
*.pyc
*.db
*.db-shm
*.db-wal
tests
```

- [ ] **Step 8: Build and smoke-test the image**

```bash
docker build -t writers-room-backend:spike backend
docker run --rm -d --name writers-room-backend-spike -p 127.0.0.1:54321:54321 writers-room-backend:spike
for i in {1..30}; do curl -fsS http://127.0.0.1:54321/healthz/ready && break; sleep 1; done
docker rm -f writers-room-backend-spike
```

Expected: readiness JSON is returned before the loop expires.

- [ ] **Step 9: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore backend/main.py backend/requirements-dev.txt backend/tests/test_health.py
git commit -m "feat: add backend health and container runtime"
```

---

### Task 3: Build the Canonical Same-Origin Web Stack

**Files:**
- Modify: `frontend/src/renderer/src/api/request.ts`
- Modify: `frontend/package.json`
- Create: `frontend/Dockerfile.web`
- Create: `frontend/nginx.conf`
- Create: `frontend/.dockerignore`
- Create: `compose.yaml`
- Create: `.env.example`
- Create: `docs/operations/local-compose.md`

**Interfaces:**
- Consumes: backend health endpoint and existing `npm run build:web`.
- Produces: one browser address on `${APP_BIND_ADDRESS:-127.0.0.1}:${APP_PORT:-8080}` with `/api` and SSE proxied to backend.

- [ ] **Step 1: Add a frontend same-origin unit seam**

Change the production web branch in `BASE_URL` from hostname plus `:54321` to an empty string:

```typescript
if (platform === 'web') {
  return ''
}
```

Electron keeps `http://127.0.0.1:54321`.

- [ ] **Step 2: Typecheck and build before container work**

```bash
cd frontend
npm ci
npm run typecheck
npm run build:web
```

Expected: both commands succeed and `frontend/dist-web` exists.

- [ ] **Step 3: Create `frontend/Dockerfile.web`**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:web

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist-web /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD wget -qO- http://127.0.0.1/healthz/frontend >/dev/null || exit 1
```

- [ ] **Step 4: Create `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location = /healthz/frontend {
        access_log off;
        add_header Content-Type text/plain;
        return 200 'ok';
    }

    location /api/ {
        proxy_pass http://backend:54321/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
    }

    location /imgs/ {
        proxy_pass http://backend:54321/imgs/;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 5: Create `frontend/.dockerignore`**

```text
node_modules
dist-web
out
.env
npm-debug.log
```

- [ ] **Step 6: Create `.env.example`**

```dotenv
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=8080
APP_NAME=Writers Room
APP_VERSION=0.1.0-spike
NOVELFORGE_DB_PATH=/data/novelforge.db
WRITERS_ROOM_BACKUP_DIR=/backups
CORS_ORIGINS=http://127.0.0.1:8080
KNOWLEDGE_GRAPH_PROVIDER=sqlmodel
BOOTSTRAP_OVERWRITE=true
BOOTSTRAP_OVERWRITE_CARD_SCHEMAS=false
```

- [ ] **Step 7: Create `compose.yaml`**

```yaml
name: writers-room

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NOVELFORGE_DB_PATH: /data/novelforge.db
      WRITERS_ROOM_BACKUP_DIR: /backups
    volumes:
      - writers_room_data:/data
      - writers_room_backups:/backups
    expose:
      - "54321"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:54321/healthz/ready', timeout=2)"]
      interval: 10s
      timeout: 3s
      start_period: 20s
      retries: 6

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.web
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "${APP_BIND_ADDRESS:-127.0.0.1}:${APP_PORT:-8080}:80"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1/healthz/frontend"]
      interval: 10s
      timeout: 3s
      start_period: 10s
      retries: 6

volumes:
  writers_room_data:
  writers_room_backups:
```

- [ ] **Step 8: Document clean startup**

The document must use:

```bash
cp .env.example .env
docker compose config
docker compose up --build -d
docker compose ps
curl -fsS http://127.0.0.1:8080/healthz/frontend
curl -fsS http://127.0.0.1:8080/api/../healthz/ready || curl -fsS http://127.0.0.1:54321/healthz/ready
docker compose logs --tail=200 backend frontend
```

The direct backend curl is only for local diagnosis. Normal browser traffic must use the frontend origin.

- [ ] **Step 9: Run the stack**

```bash
cp .env.example .env
docker compose config
docker compose up --build -d
for i in {1..60}; do docker compose ps --format json | grep -q 'healthy' && break; sleep 2; done
curl -fsS http://127.0.0.1:8080/healthz/frontend
docker compose ps
```

Expected: both services report healthy and the browser UI loads at `http://127.0.0.1:8080`.

- [ ] **Step 10: Commit**

```bash
git add .env.example compose.yaml docs/operations/local-compose.md frontend/Dockerfile.web frontend/.dockerignore frontend/nginx.conf frontend/package.json frontend/src/renderer/src/api/request.ts
git commit -m "feat: add canonical Compose web stack"
```

---

### Task 4: Make SQLite Backup and Restore Safe and Portable

**Files:**
- Create: `backend/app/core/storage.py`
- Create: `backend/app/services/backup_service.py`
- Create: `backend/app/cli/__init__.py`
- Create: `backend/app/cli/backup.py`
- Create: `backend/app/cli/restore.py`
- Create: `backend/tests/services/test_backup_service.py`
- Create: `scripts/backup.sh`
- Create: `scripts/restore.sh`
- Modify: `docs/operations/local-compose.md`

**Interfaces:**
- Produces: `create_backup(db_path: Path, backup_dir: Path, label: str | None = None) -> Path`.
- Produces: `restore_backup(backup_path: Path, db_path: Path, force: bool = False) -> Path | None`.
- Produces: CLI commands runnable inside the backend container.

- [ ] **Step 1: Write failing backup tests**

```python
import sqlite3
from pathlib import Path

import pytest

from app.services.backup_service import create_backup, restore_backup


def write_value(path: Path, value: str) -> None:
    with sqlite3.connect(path) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS sample(value TEXT NOT NULL)")
        conn.execute("DELETE FROM sample")
        conn.execute("INSERT INTO sample(value) VALUES (?)", (value,))
        conn.commit()


def read_value(path: Path) -> str:
    with sqlite3.connect(path) as conn:
        return conn.execute("SELECT value FROM sample").fetchone()[0]


def test_backup_and_restore_round_trip(tmp_path: Path) -> None:
    db_path = tmp_path / "live.db"
    backup_dir = tmp_path / "backups"
    write_value(db_path, "before")

    backup_path = create_backup(db_path, backup_dir, label="roundtrip")
    write_value(db_path, "after")
    restore_backup(backup_path, db_path, force=True)

    assert read_value(db_path) == "before"


def test_restore_refuses_existing_database_without_force(tmp_path: Path) -> None:
    db_path = tmp_path / "live.db"
    backup_dir = tmp_path / "backups"
    write_value(db_path, "before")
    backup_path = create_backup(db_path, backup_dir)

    with pytest.raises(FileExistsError):
        restore_backup(backup_path, db_path, force=False)
```

- [ ] **Step 2: Run and verify import failure**

```bash
cd backend
python -m pytest tests/services/test_backup_service.py -v
```

Expected: `ModuleNotFoundError` for `backup_service`.

- [ ] **Step 3: Implement backup service with SQLite's backup API**

```python
from __future__ import annotations

import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def _integrity_check(path: Path) -> None:
    with sqlite3.connect(path) as conn:
        result = conn.execute("PRAGMA integrity_check").fetchone()
    if not result or result[0] != "ok":
        raise ValueError(f"SQLite integrity check failed for {path}: {result}")


def create_backup(db_path: Path, backup_dir: Path, label: str | None = None) -> Path:
    db_path = db_path.resolve()
    backup_dir = backup_dir.resolve()
    if not db_path.is_file():
        raise FileNotFoundError(db_path)
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_label = "" if not label else f"-{''.join(c for c in label if c.isalnum() or c in '-_')}"
    destination = backup_dir / f"novelforge-{stamp}{safe_label}.db"
    with sqlite3.connect(db_path) as source, sqlite3.connect(destination) as target:
        source.backup(target)
    _integrity_check(destination)
    return destination


def restore_backup(backup_path: Path, db_path: Path, force: bool = False) -> Path | None:
    backup_path = backup_path.resolve()
    db_path = db_path.resolve()
    if not backup_path.is_file():
        raise FileNotFoundError(backup_path)
    _integrity_check(backup_path)
    safety_backup = None
    if db_path.exists():
        if not force:
            raise FileExistsError(db_path)
        safety_backup = create_backup(db_path, db_path.parent / "pre-restore", label="pre-restore")
    db_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = db_path.with_suffix(db_path.suffix + ".restore-tmp")
    shutil.copy2(backup_path, temporary)
    _integrity_check(temporary)
    os.replace(temporary, db_path)
    _integrity_check(db_path)
    return safety_backup
```

- [ ] **Step 4: Add storage path settings**

```python
from pathlib import Path

from app.core.config import settings


def database_path() -> Path:
    url = settings.database.get_database_url()
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        raise ValueError("Sprint 0 backup supports SQLite only")
    return Path(url[len(prefix):]).resolve()


def backup_directory() -> Path:
    return Path(os.getenv("WRITERS_ROOM_BACKUP_DIR", "/backups")).resolve()
```

Include `import os`.

- [ ] **Step 5: Add CLI wrappers**

`backup.py` prints only the created backup path. `restore.py` accepts a positional backup path plus `--force`, calls `restore_backup`, and prints the safety-backup path when one was created.

- [ ] **Step 6: Add host scripts**

```bash
#!/usr/bin/env bash
set -euo pipefail
docker compose exec -T backend python -m app.cli.backup "$@"
```

```bash
#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "usage: scripts/restore.sh /backups/file.db [--force]" >&2
  exit 2
fi
docker compose stop backend
docker compose run --rm backend python -m app.cli.restore "$@"
docker compose up -d backend frontend
```

- [ ] **Step 7: Run tests**

```bash
cd backend
python -m pytest tests/services/test_backup_service.py -v
```

Expected: all tests pass.

- [ ] **Step 8: Run container persistence drill**

```bash
docker compose up -d
./scripts/backup.sh --label persistence-drill
docker compose down
docker compose up -d
./scripts/backup.sh --label after-recreate
```

Expected: backup files exist in the backup volume and the application database remains available.

- [ ] **Step 9: Commit**

```bash
git add backend/app/cli backend/app/core/storage.py backend/app/services/backup_service.py backend/tests/services/test_backup_service.py scripts/backup.sh scripts/restore.sh docs/operations/local-compose.md
git commit -m "feat: add safe SQLite backup and restore"
```

---

### Task 5: Lock Remote Access to Tailscale

**Files:**
- Create: `scripts/check-local-exposure.sh`
- Create: `docs/operations/tailscale-local.md`
- Modify: `docs/acceptance/sprint-0-matrix.md`

**Interfaces:**
- Consumes: frontend bound to `127.0.0.1:${APP_PORT:-8080}`.
- Produces: a repeatable Tailscale Serve setup and a script that fails unsafe Compose configuration.

- [ ] **Step 1: Write exposure check**

```bash
#!/usr/bin/env bash
set -euo pipefail

resolved="$(docker compose config)"

if grep -Eq 'published: "?8080"?.*host_ip: (0\.0\.0\.0|::)' <<<"$resolved"; then
  echo "FAIL: frontend is publicly bound" >&2
  exit 1
fi

if ! grep -q '127.0.0.1' <<<"$resolved"; then
  echo "FAIL: localhost binding not found" >&2
  exit 1
fi

if command -v lsof >/dev/null 2>&1; then
  lsof -nP -iTCP:8080 -sTCP:LISTEN || true
fi

echo "PASS: Compose defaults to a local-only binding"
```

- [ ] **Step 2: Run script**

```bash
chmod +x scripts/check-local-exposure.sh
./scripts/check-local-exposure.sh
```

Expected: `PASS: Compose defaults to a local-only binding`.

- [ ] **Step 3: Document Tailscale Serve**

Use these commands:

```bash
tailscale status
tailscale serve --bg localhost:8080
tailscale serve status --json
```

Document disabling with:

```bash
tailscale serve reset
```

Explicitly prohibit `tailscale funnel`, router port forwarding, and changing `APP_BIND_ADDRESS` to `0.0.0.0` for convenience.

- [ ] **Step 4: Perform trusted-device verification**

From an approved device, open the HTTPS URL shown by `tailscale serve status`. From a device outside the tailnet, confirm no route exists. Record both observations in Gate C.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-local-exposure.sh docs/operations/tailscale-local.md docs/acceptance/sprint-0-matrix.md
git commit -m "docs: define Tailscale-only remote access"
```

---

### Task 6: Extract a Strict Selection-Patch Safety Contract

**Files:**
- Create: `frontend/src/renderer/src/utils/selectionPatch.ts`
- Create: `frontend/src/renderer/src/utils/__tests__/selectionPatch.test.ts`
- Modify: `frontend/package.json`
- Create: `backend/app/services/text_patch_service.py`
- Create: `backend/tests/services/test_text_patch_service.py`

**Interfaces:**
- Frontend produces `SelectionSnapshot` with `from`, `to`, `text`, and SHA-256 `documentHash`.
- Frontend produces `validatePatch(snapshot, currentDocument, replacement, applied)` returning `ok`, `conflict`, or `already_applied`.
- Backend mirrors SHA-256 and idempotency validation for persisted run evidence.

- [ ] **Step 1: Add Vitest**

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Add dev dependencies:

```json
"vitest": "^3.2.4"
```

- [ ] **Step 2: Write frontend failing tests**

```typescript
import { describe, expect, it } from 'vitest'
import { captureSelection, validatePatch } from '../selectionPatch'

describe('selection patch safety', () => {
  it('accepts an unchanged Polish selection', async () => {
    const doc = 'Przed. Zażółć gęślą jaźń. Po.'
    const from = doc.indexOf('Zażółć')
    const to = from + 'Zażółć gęślą jaźń'.length
    const snapshot = await captureSelection(doc, from, to)
    expect(await validatePatch(snapshot, doc, 'Nowy tekst', false)).toEqual({ status: 'ok' })
  })

  it('blocks any document change during Sprint 0', async () => {
    const doc = 'Ala ma kota.'
    const snapshot = await captureSelection(doc, 0, 3)
    expect((await validatePatch(snapshot, 'Ala ma dwa koty.', 'Ola', false)).status).toBe('conflict')
  })

  it('blocks duplicate application', async () => {
    const doc = '**tekst**'
    const snapshot = await captureSelection(doc, 2, 7)
    expect((await validatePatch(snapshot, doc, 'nowy', true)).status).toBe('already_applied')
  })
})
```

- [ ] **Step 3: Run and verify failure**

```bash
cd frontend
npm install
npm test -- selectionPatch.test.ts
```

Expected: module import failure.

- [ ] **Step 4: Implement frontend snapshot functions**

```typescript
export interface SelectionSnapshot {
  from: number
  to: number
  text: string
  documentHash: string
}

export type PatchValidation =
  | { status: 'ok' }
  | { status: 'conflict'; reason: string }
  | { status: 'already_applied' }

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function captureSelection(document: string, from: number, to: number): Promise<SelectionSnapshot> {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to <= from || to > document.length) {
    throw new RangeError('Invalid selection range')
  }
  return { from, to, text: document.slice(from, to), documentHash: await sha256(document) }
}

export async function validatePatch(
  snapshot: SelectionSnapshot,
  currentDocument: string,
  replacement: string,
  applied: boolean,
): Promise<PatchValidation> {
  if (applied) return { status: 'already_applied' }
  if (!replacement.trim()) return { status: 'conflict', reason: 'Replacement is empty' }
  if (await sha256(currentDocument) !== snapshot.documentHash) {
    return { status: 'conflict', reason: 'Document changed after pipeline launch' }
  }
  if (currentDocument.slice(snapshot.from, snapshot.to) !== snapshot.text) {
    return { status: 'conflict', reason: 'Selected text no longer matches' }
  }
  return { status: 'ok' }
}
```

- [ ] **Step 5: Write backend failing tests**

```python
from app.services.text_patch_service import capture_snapshot, validate_patch


def test_backend_patch_contract_blocks_changed_document() -> None:
    snapshot = capture_snapshot("Ala ma kota", 0, 3)
    result = validate_patch(snapshot, "Ala ma dwa koty", "Ola", already_applied=False)
    assert result.status == "conflict"


def test_backend_patch_contract_blocks_second_application() -> None:
    snapshot = capture_snapshot("Ala ma kota", 0, 3)
    result = validate_patch(snapshot, "Ala ma kota", "Ola", already_applied=True)
    assert result.status == "already_applied"
```

- [ ] **Step 6: Implement backend mirror**

Use Pydantic models `TextSelectionSnapshot` and `PatchValidationResult`, `hashlib.sha256(document.encode('utf-8')).hexdigest()`, exact range validation, strict document-hash equality, original-text equality, non-empty replacement, and `already_applied` protection.

- [ ] **Step 7: Run tests**

```bash
cd frontend && npm test -- selectionPatch.test.ts
cd ../backend && python -m pytest tests/services/test_text_patch_service.py -v
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/renderer/src/utils/selectionPatch.ts frontend/src/renderer/src/utils/__tests__/selectionPatch.test.ts backend/app/services/text_patch_service.py backend/tests/services/test_text_patch_service.py
git commit -m "feat: add strict selected-text patch safety"
```

---

### Task 7: Add Parameterized Plain-Text Workflow Execution

**Files:**
- Create: `backend/app/services/workflow/nodes/ai/text_generate.py`
- Modify: `backend/app/api/endpoints/workflows.py`
- Modify: `backend/app/schemas/workflow.py`
- Create: `backend/tests/workflow/test_parameterized_text_pipeline.py`
- Create: `backend/app/bootstrap/workflows/thinking_porn_spike.wf`

**Interfaces:**
- Produces node `AI.TextGenerate`.
- Produces `POST /api/workflows/{workflow_id}/runs` accepting `RunRequest`.
- Produces `GET /api/workflows/runs/{run_id}/node-states` exposing persisted outputs without secrets.
- Modifies stream execution to pass `run.params_json` as `initial_context`.

- [ ] **Step 1: Define schemas**

Add:

```python
class NodeExecutionStateRead(BaseModel):
    node_id: str
    node_type: str
    status: str
    progress: int
    outputs_json: Optional[dict] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class WorkflowRunCreated(BaseModel):
    run_id: int
    workflow_id: int
    status: str
```

- [ ] **Step 2: Write a failing parameterized-run API test**

The test creates a workflow, posts:

```json
{
  "params_json": {
    "source_text": "Tekst źródłowy",
    "brief": "Wzmocnij scenę",
    "kimi_llm_config_id": 11,
    "grok_llm_config_id": 12,
    "aion_llm_config_id": 13
  },
  "idempotency_key": "test-selection-1"
}
```

It asserts that the created `WorkflowRun.params_json` exactly matches the payload and a repeated idempotency key returns the same run id.

- [ ] **Step 3: Add run-creation endpoint**

```python
@router.post("/workflows/{workflow_id}/runs", response_model=WorkflowRunCreated)
def create_parameterized_run(
    workflow_id: int,
    payload: RunRequest,
    session: Session = Depends(get_session),
):
    workflow = session.get(Workflow, workflow_id)
    if not workflow or not workflow.is_active:
        raise HTTPException(status_code=404, detail="Active workflow not found")
    run = RunManager(session).create_run(
        workflow_id=workflow_id,
        scope_json=payload.scope_json,
        params_json=payload.params_json,
        idempotency_key=payload.idempotency_key,
    )
    return WorkflowRunCreated(run_id=run.id, workflow_id=run.workflow_id, status=run.status)
```

Adjust `RunManager.create_run` only if its current signature lacks `scope_json` or `params_json`; preserve existing callers and add optional keyword parameters with default `None`.

- [ ] **Step 4: Pass persisted parameters into execution**

In `execute_code_workflow_stream`, when `run_id` refers to a pre-created run, use:

```python
initial_context = dict(run.params_json or {})
async for event in executor.execute_stream(plan, initial_context=initial_context):
    ...
```

Preserve the legacy path when no `run_id` is supplied.

- [ ] **Step 5: Add node-state endpoint**

```python
@router.get("/workflows/runs/{run_id}/node-states", response_model=list[NodeExecutionStateRead])
def read_node_states(run_id: int, session: Session = Depends(get_session)):
    run = session.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    statement = select(NodeExecutionState).where(NodeExecutionState.run_id == run_id).order_by(NodeExecutionState.id)
    return session.exec(statement).all()
```

- [ ] **Step 6: Add plain-text workflow node**

```python
from typing import AsyncIterator, Optional

from pydantic import BaseModel, Field

from app.services.ai.core.llm_service import generate_review
from app.services.workflow.nodes.base import BaseNode
from app.services.workflow.registry import register_node


class TextGenerateInput(BaseModel):
    user_prompt: str
    llm_config_id: int = Field(..., json_schema_extra={"x-component": "LLMSelect"})
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 4096
    timeout: int = 180


class TextGenerateOutput(BaseModel):
    text: str


@register_node
class TextGenerateNode(BaseNode[TextGenerateInput, TextGenerateOutput]):
    node_type = "AI.TextGenerate"
    category = "ai"
    label = "Text generation"
    description = "Generate plain text using one configured LLM"
    input_model = TextGenerateInput
    output_model = TextGenerateOutput

    async def execute(self, inputs: TextGenerateInput) -> AsyncIterator[TextGenerateOutput]:
        text = await generate_review(
            session=self.context.session,
            llm_config_id=inputs.llm_config_id,
            user_prompt=inputs.user_prompt,
            system_prompt=inputs.system_prompt,
            temperature=inputs.temperature,
            max_tokens=inputs.max_tokens,
            timeout=inputs.timeout,
            track_stats=True,
        )
        yield TextGenerateOutput(text=text)
```

Use the repository's actual relative import style for `BaseNode` and `register_node`.

- [ ] **Step 7: Add the first workflow definition**

```python
#@node(description="Kimi: architecture, psychology and staging")
kimi = AI.TextGenerate(
    llm_config_id=kimi_llm_config_id,
    system_prompt="You are Kimi, the scene architect. Preserve intent, facts, names, language and point of view.",
    user_prompt=f"TASK BRIEF:\n{brief}\n\nSOURCE SELECTION:\n{source_text}",
    temperature=0.7,
    max_tokens=4096,
    timeout=180
)
#</node>

#@node(description="Grok: choreography and continuity")
grok = AI.TextGenerate(
    llm_config_id=grok_llm_config_id,
    system_prompt="You are Grok, the continuity and physical choreography editor. Return only the revised selection.",
    user_prompt=f"TASK BRIEF:\n{brief}\n\nORIGINAL:\n{source_text}\n\nKIMI VERSION:\n{kimi.text}",
    temperature=0.7,
    max_tokens=4096,
    timeout=180
)
#</node>

#@node(description="Aion: unified literary polish")
aion = AI.TextGenerate(
    llm_config_id=aion_llm_config_id,
    system_prompt="You are Aion, the final literary editor. Preserve the requested meaning and return only the final replacement text.",
    user_prompt=f"TASK BRIEF:\n{brief}\n\nORIGINAL:\n{source_text}\n\nKIMI VERSION:\n{kimi.text}\n\nGROK VERSION:\n{grok.text}",
    temperature=0.6,
    max_tokens=4096,
    timeout=180
)
#</node>
```

- [ ] **Step 8: Write deterministic pipeline test**

Monkeypatch `generate_review` so calls return `KIMI:<source>`, `GROK:<previous>`, and `AION:<previous>` in sequence. Assert:

```text
three calls use config ids 11, 12, 13
Grok prompt contains Kimi output
Aion prompt contains Kimi and Grok outputs
all node outputs persist
failed second call preserves first output
retry begins from the failed node according to existing checkpoint semantics
```

- [ ] **Step 9: Run backend tests**

```bash
cd backend
python -m pytest tests/workflow/test_parameterized_text_pipeline.py -v
python -m pytest tests -v
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add backend/app/api/endpoints/workflows.py backend/app/schemas/workflow.py backend/app/services/workflow/nodes/ai/text_generate.py backend/app/bootstrap/workflows/thinking_porn_spike.wf backend/tests/workflow/test_parameterized_text_pipeline.py
git commit -m "feat: add parameterized three-step text workflow"
```

---

### Task 8: Wire Selection to Pipeline, Diff, Accept, Reject, and Undo

**Files:**
- Create: `frontend/src/renderer/src/api/selectionPipelines.ts`
- Create: `frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue`
- Modify: `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue`
- Create: `frontend/src/renderer/src/components/pipelines/__tests__/SelectionPipelineDialog.test.ts`
- Modify: `frontend/package.json`

**Interfaces:**
- `startSelectionPipeline(input: StartSelectionPipelineInput) -> Promise<{ runId: number }>`.
- `streamSelectionPipeline(workflowId: number, runId: number, handlers: PipelineEventHandlers) -> { close(): void }`.
- Dialog emits `accept(replacement: string)` and `reject()`.

- [ ] **Step 1: Add Vue component test dependencies**

Add:

```json
"@vue/test-utils": "^2.4.6",
"jsdom": "^26.1.0"
```

Configure Vitest environment as `jsdom` in `frontend/vitest.config.ts`.

- [ ] **Step 2: Write dialog tests**

Tests must verify:

```text
source and final text are displayed
three step labels appear in order
accept is disabled while running
accept is disabled in conflict state
reject emits without replacement
accept emits exactly the final replacement
```

- [ ] **Step 3: Implement API client**

`selectionPipelines.ts` must:

1. list workflows and resolve `Thinking p*rn` by exact name;
2. POST a parameterized run with `source_text`, `brief`, and three model config ids;
3. open same-origin SSE with `/api/workflows/{workflowId}/execute-stream?run_id={runId}`;
4. collect `complete` events keyed by statement variable;
5. fetch `/api/workflows/runs/{runId}/node-states` after `end`;
6. expose `aion.outputs_json.text` as the final replacement;
7. close EventSource on dialog closure or component unmount.

- [ ] **Step 4: Implement dialog**

The dialog must show:

```text
brief input before start
Kimi, Grok, Aion status rows
expandable output for each completed step
original and final text in separate panes
simple word and line change highlighting
buttons: Zastosuj, Odrzuć, Ponów nieudany krok, Zamknij
conflict alert that blocks apply
```

Sprint 0 may use a focused before/after comparison rather than a character-perfect merge diff.

- [ ] **Step 5: Integrate into `CodeMirrorEditor.vue`**

Replace the local non-cryptographic `snapshotHash` authority for the new pipeline path with `captureSelection(getText(), from, to)`. Keep existing quick-polish behavior unchanged.

Add a context-menu command named exactly `Thinking p*rn` that:

```typescript
const selected = getSelectedText()
if (!selected) return
const snapshot = await captureSelection(getText(), selected.from, selected.to)
selectionPipelineState.snapshot = snapshot
selectionPipelineState.visible = true
```

- [ ] **Step 6: Apply in one undoable transaction**

```typescript
async function acceptSelectionPipeline(replacement: string) {
  if (!view || !selectionPipelineState.snapshot) return
  const snapshot = selectionPipelineState.snapshot
  const validation = await validatePatch(snapshot, getText(), replacement, selectionPipelineState.applied)
  if (validation.status !== 'ok') {
    selectionPipelineState.conflict = validation.status === 'conflict' ? validation.reason : 'Patch already applied'
    return
  }
  view.dispatch({
    changes: { from: snapshot.from, to: snapshot.to, insert: replacement },
    selection: { anchor: snapshot.from + replacement.length },
    annotations: Transaction.userEvent.of('input.pipeline.accept'),
  })
  selectionPipelineState.applied = true
  isDirty.value = true
  emit('update:dirty', true)
}
```

Import `Transaction` from `@codemirror/state` if it is not already imported.

- [ ] **Step 7: Preserve reject semantics**

Reject closes the proposal and clears pipeline UI state without dispatching an editor change.

- [ ] **Step 8: Run frontend verification**

```bash
cd frontend
npm test
npm run typecheck
npm run build:web
```

Expected: all tests and build pass.

- [ ] **Step 9: Manual safety demo**

Use source:

```text
Przed sceną.

**Zażółć gęślą jaźń.**

Po scenie.
```

Verify:

```text
reject changes zero characters
accept changes only the bold selection content
undo restores the exact source
editing any document character while the pipeline runs produces conflict
second accept is blocked
```

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/renderer/src/api/selectionPipelines.ts frontend/src/renderer/src/components/pipelines frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue
git commit -m "feat: add selected-text pipeline preview and apply"
```

---

### Task 9: Prove the Real OpenRouter Chain Without Leaking Secrets

**Files:**
- Create: `scripts/smoke-openrouter.sh`
- Create: `docs/acceptance/openrouter-smoke.md`
- Modify: `docs/acceptance/sprint-0-matrix.md`

**Interfaces:**
- Consumes runtime-only variables `OPENROUTER_API_KEY`, `KIMI_MODEL_ID`, `GROK_MODEL_ID`, `AION_MODEL_ID`.
- Produces redacted evidence with run id, provider, model id, duration, token counters, and status.

- [ ] **Step 1: Write secret guard and smoke script**

```bash
#!/usr/bin/env bash
set -euo pipefail

required=(OPENROUTER_API_KEY KIMI_MODEL_ID GROK_MODEL_ID AION_MODEL_ID)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "FAIL: $name is not set" >&2
    exit 2
  fi
done

if git grep -nF "$OPENROUTER_API_KEY" -- . ':!scripts/smoke-openrouter.sh'; then
  echo "FAIL: API key appears in tracked content" >&2
  exit 1
fi

curl -fsS http://127.0.0.1:8080/healthz/frontend >/dev/null
printf 'Runtime ready for OpenRouter smoke: %s -> %s -> %s\n' "$KIMI_MODEL_ID" "$GROK_MODEL_ID" "$AION_MODEL_ID"
printf 'Configure the three LLM records in the UI, then run the fixture described in docs/acceptance/openrouter-smoke.md\n'
```

- [ ] **Step 2: Configure three distinct LLM records**

Use provider `openai_compatible`, API base `https://openrouter.ai/api/v1`, the runtime API key, and the three model ids from environment variables. Give display names `Kimi - scene architect`, `Grok - continuity`, and `Aion - final polish`.

- [ ] **Step 3: Run one accepted fixture and one rejected fixture**

The fixture must be invented test prose, not private canonical GUILT-3 material. Record:

```text
workflow id
run id
three display names and exact model ids
start and finish timestamps
input and output token counters already tracked by LLMConfig
final status
whether accept or reject was chosen
whether text outside the selection changed
```

- [ ] **Step 4: Run provider-failure proof**

Temporarily set the second model id to an invalid value. Verify Kimi output remains recorded, Grok fails, Aion does not run, and source text is unchanged. Restore the valid configuration afterward.

- [ ] **Step 5: Scan for secrets**

```bash
git status --short
git grep -nE 'sk-or-v1-|OPENROUTER_API_KEY=.+' -- . ':!.env.example' || true
```

Expected: no real key or private evidence appears.

- [ ] **Step 6: Commit only redacted evidence**

```bash
git add scripts/smoke-openrouter.sh docs/acceptance/openrouter-smoke.md docs/acceptance/sprint-0-matrix.md
git commit -m "test: record OpenRouter three-model smoke evidence"
```

---

### Task 10: Run Linux Portability Drill and Issue the GO or NO-GO Decision

**Files:**
- Create: `docs/operations/vps-portability.md`
- Create: `docs/acceptance/sprint-0-go-no-go.md`
- Modify: `docs/acceptance/sprint-0-matrix.md`

**Interfaces:**
- Consumes: repository checkout, `.env` recreated from `.env.example`, backup archive, Compose images.
- Produces: evidence-based decision to continue adapting NovelForge or stop before Foundation implementation.

- [ ] **Step 1: Prepare a clean Linux environment**

Use an arm64 or amd64 Linux VM with Docker Engine and Compose v2. Do not mount the Mac source directory into runtime containers.

- [ ] **Step 2: Follow only repository instructions**

```bash
git clone https://github.com/tpoh93/Writers-Room-app.git
cd Writers-Room-app
cp .env.example .env
docker compose config
docker compose up --build -d
docker compose ps
```

Record every manual correction. Any correction not already documented is a portability defect.

- [ ] **Step 3: Restore Mac-created data**

Copy one backup into the documented backup volume or path, then run:

```bash
./scripts/restore.sh /backups/<recorded-backup-name>.db --force
docker compose ps
```

The evidence document must replace `<recorded-backup-name>` with the actual file used before commit.

- [ ] **Step 4: Execute deterministic and real-provider smoke paths**

Run the frontend selection test fixture, one fake or monkeypatched pipeline test, and one real OpenRouter pipeline if credentials are available in the Linux runtime environment.

- [ ] **Step 5: Complete Gate E**

Pass criteria:

```text
same Compose stack starts
no application code edit
health checks pass
restored project and workflow definitions appear
selected-text preview works
accept and reject remain safe
backup can be created again on Linux
```

- [ ] **Step 6: Write the final decision**

Use exactly one result:

```text
GO: at least 4 of 5 core foundation questions pass, and no unresolved text-loss risk exists.
NO-GO: any unresolved text-loss risk, unreproducible runtime, unusable backup restore, or inability to chain three models.
```

Core questions:

```text
1. Does the local and Linux web runtime start reproducibly?
2. Can selected text enter a parameterized workflow?
3. Can three distinct LLM configurations run sequentially with persisted handoff?
4. Can the final result apply only to the captured range with conflict and undo protection?
5. Can data be backed up, restored, and moved without code changes?
```

- [ ] **Step 7: Run final verification suite**

```bash
./scripts/verify-upstream.sh
./scripts/check-local-exposure.sh
docker compose config
docker compose up --build -d
docker compose ps
cd backend && python -m pytest tests -v
cd ../frontend && npm test && npm run typecheck && npm run build:web
cd .. && git diff --check
git status --short
```

Expected: all commands pass and the working tree contains only intentional evidence changes.

- [ ] **Step 8: Commit**

```bash
git add docs/operations/vps-portability.md docs/acceptance/sprint-0-go-no-go.md docs/acceptance/sprint-0-matrix.md
git commit -m "docs: record Sprint 0 GO NO-GO decision"
```

---

## Review and Execution Checkpoints

After each task:

1. Run the task-specific commands.
2. Inspect `git diff --check`.
3. Run secret scanning for Tasks 3, 4, 5, and 9.
4. Request a specification-compliance review.
5. Request a code-quality review.
6. Merge only after both reviews pass.

Tasks 2 and 3 may be implemented in parallel after Task 1, but they meet at the Compose integration review. Tasks 4 and 5 may proceed after Task 3. Task 6 can proceed in parallel with Tasks 2 through 5 because its pure safety modules have no runtime dependency. Task 7 depends on Task 6's contract. Task 8 depends on Tasks 6 and 7. Tasks 9 and 10 are strictly sequential after the complete local path works.

## Deferred Until After a GO Decision

- Full Polish localization.
- Codex simplification and redesign.
- Translation workflows.
- Cost dashboard beyond evidence capture.
- Neo4j enablement.
- Visual Language and Superdesign canvas work.
- Martyna-specific access rules beyond Tailscale membership.
- VPS purchase, TLS proxy, public DNS, accounts, or multi-user isolation.
