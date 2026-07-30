# NovelForge Acceptance Harness B+2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide deterministic, fixture-only writer `PUT` failures, delayed responses, and held responses so remaining Writer Ready scenarios can be observed without changing normal Writers Room behavior.

**Architecture:** A small backend acceptance module owns an in-memory, lock-protected one-shot fault controller. It is mounted only when `NOVELFORGE_ACCEPTANCE_FAULTS=1`, which only `compose.acceptance.yaml` sets. Middleware targets exactly `PUT /api/cards/{positive-integer}`: it consumes a 500 fault before the application handler, or waits after the handler response for a bounded delay or explicit release. The canonical runner exposes the controller only through readable fixture commands.

**Tech Stack:** FastAPI/Starlette ASGI middleware, Python `asyncio`, pytest/TestClient, Bash, Docker Compose, curl.

**Execution record:** Tasks 1–4 are complete: implementation used RED/GREEN tests, no-Docker verification passed, and the isolated B+2 smoke passed. Task 5 remains pending for B+3 browser evidence and Task 10 closure.

## Global Constraints

- The only acceptance Compose project is `writer-ready-fixture` on `127.0.0.1:18080`.
- Normal `writers-room` does not set `NOVELFORGE_ACCEPTANCE_FAULTS`, does not mount controller routes, and has no active fault path.
- A fault is consumed by at most one matching writer PUT; control endpoints never affect card persistence.
- `hold` is released only by the explicit runner command or fixture `clear`; it has no automatic production-facing route.
- `down` preserves fixture volumes; no command invokes stash, reset, clean, prune, `-v`, or normal-stack Compose.
- Tests establish RED before production code and browser evidence follows a successful `metadata` command from the same fixture run.

---

### Task 1: Acceptance-only controller contract

**Files:**

- Create: `backend/app/acceptance/__init__.py`
- Create: `backend/app/acceptance/writer_put_faults.py`
- Create: `backend/tests/api/test_acceptance_writer_put_faults.py`

**Interfaces:**

- Produces `WriterPutFaultController.arm_failure()`, `arm_delay(delay_seconds: float)`, `arm_hold()`, `release()`, `clear()`, `status()`, and `intercept(scope, call_next)`.
- `status()` returns JSON-safe `{"enabled": true, "armed": "none|http-500|delay|hold", "requestState": "idle|held", "delaySeconds": number|null}`.

- [ ] **Step 1: Write failing controller tests**

```python
def test_armed_http_500_is_consumed_by_one_writer_put(client):
    client.post('/api/acceptance/writer-put-fault/http-500')
    assert client.put('/api/cards/1', json=payload).status_code == 500
    assert client.put('/api/cards/1', json=payload).status_code == 200

def test_non_writer_requests_do_not_consume_the_fault(client):
    client.post('/api/acceptance/writer-put-fault/http-500')
    assert client.get('/healthz/live').status_code == 200
    assert client.get('/api/acceptance/writer-put-fault').json()['armed'] == 'http-500'
```

- [ ] **Step 2: Run test to verify RED**

Run: `PYTHONPATH=backend pytest -q backend/tests/api/test_acceptance_writer_put_faults.py`

Expected: FAIL because acceptance control routes and controller do not exist.

- [ ] **Step 3: Implement minimal one-shot controller**

```python
class WriterPutFaultController:
    async def intercept(self, scope, call_next):
        if scope['method'] != 'PUT' or not WRITER_CARD_PATH.fullmatch(scope['path']):
            return await call_next()
        fault = await self._consume_armed_fault()
        if fault == 'http-500':
            return JSONResponse(status_code=500, content={'detail': 'fixture writer PUT fault'})
        response = await call_next()
        await self._apply_post_response_fault(fault)
        return response
```

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `PYTHONPATH=backend pytest -q backend/tests/api/test_acceptance_writer_put_faults.py`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/acceptance/__init__.py backend/app/acceptance/writer_put_faults.py backend/tests/api/test_acceptance_writer_put_faults.py
git diff --cached --check
git commit -m "feat: add fixture writer put fault controller"
```

### Task 2: Fixture-only application wiring

**Files:**

- Modify: `backend/main.py`
- Modify: `compose.acceptance.yaml`
- Modify: `backend/tests/api/test_acceptance_writer_put_faults.py`

**Interfaces:**

- Consumes `NOVELFORGE_ACCEPTANCE_FAULTS` exactly when its value is `"1"`.
- Produces `GET /api/acceptance/writer-put-fault`, `POST .../http-500`, `POST .../delay`, `POST .../hold`, `POST .../release`, and `DELETE .../writer-put-fault` only in enabled fixture instances.

- [ ] **Step 1: Extend failing tests for normal and fixture applications**

```python
def test_control_routes_are_not_mounted_without_fixture_flag(monkeypatch):
    app = create_app_for_test(faults_enabled=False)
    assert TestClient(app).get('/api/acceptance/writer-put-fault').status_code == 404

def test_hold_reports_held_until_explicit_release(client):
    client.post('/api/acceptance/writer-put-fault/hold')
    # launch writer PUT in a thread and wait for requestState == 'held'
    assert client.post('/api/acceptance/writer-put-fault/release').status_code == 200
```

- [ ] **Step 2: Run test to verify RED**

Run: `PYTHONPATH=backend pytest -q backend/tests/api/test_acceptance_writer_put_faults.py`

Expected: FAIL because fixture flag wiring and hold/release are absent.

- [ ] **Step 3: Mount routes and middleware only under the fixture environment flag**

```python
if os.getenv('NOVELFORGE_ACCEPTANCE_FAULTS') == '1':
    install_writer_put_fault_controls(app, api_prefix=settings.app.api_prefix)
```

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `PYTHONPATH=backend pytest -q backend/tests/api/test_acceptance_writer_put_faults.py`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py compose.acceptance.yaml backend/tests/api/test_acceptance_writer_put_faults.py
git diff --cached --check
git commit -m "feat: isolate writer put faults to acceptance fixture"
```

### Task 3: Runner commands and no-Docker contract tests

**Files:**

- Modify: `scripts/novelforge-acceptance.sh`
- Modify: `scripts/tests/test-novelforge-acceptance.sh`
- Modify: `docs/operations/local-compose.md`

**Interfaces:**

- Produces `fault-status`, `fault-http-500`, `fault-delay <seconds>`, `fault-hold`, `fault-release`, and `fault-clear`.
- Commands call only `http://127.0.0.1:18080/api/acceptance/writer-put-fault...`, require Docker through the existing guard, and print controller status after mutations.

- [ ] **Step 1: Add failing fake-Docker tests**

```bash
run_runner fault-delay 0.2
assert_output_contains '"armed":"delay"'
run_runner fault-clear
assert_output_contains '"armed":"none"'
run_runner fault-delay invalid
assert_exit 2
```

- [ ] **Step 2: Run test to verify RED**

Run: `bash scripts/tests/test-novelforge-acceptance.sh`

Expected: FAIL because the runner rejects the new commands.

- [ ] **Step 3: Implement strict command parsing and local curl calls**

```bash
fault-delay)
  [[ $# -eq 2 && "$2" =~ ^([0-9]+([.][0-9]+)?|[.][0-9]+)$ ]] || die 2 'Usage: ... fault-delay <seconds>'
  fault_request POST "/api/acceptance/writer-put-fault/delay?seconds=$2"
  ;;
```

- [ ] **Step 4: Run no-Docker runner tests to verify GREEN**

Run: `bash scripts/tests/test-novelforge-acceptance.sh`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/novelforge-acceptance.sh scripts/tests/test-novelforge-acceptance.sh docs/operations/local-compose.md
git diff --cached --check
git commit -m "feat: add acceptance writer fault commands"
```

### Task 4: B+2 completion evidence and smoke

**Files:**

- Modify: `docs/acceptance/novelforge-acceptance-control.md`
- Modify: `docs/acceptance/writer-ready-01-working-matrix.md`

**Interfaces:**

- Consumes runner `up`, `metadata`, `seed-writer-ready`, `fault-*`, `verify-writer-ready`, and `down`.
- Produces concise synthetic B+2 evidence with exactly one current next step.

- [ ] **Step 1: Run static and focused test suites**

Run: `PYTHONPATH=backend pytest -q backend/tests/api/test_acceptance_writer_put_faults.py backend/tests/api/test_cards_writer_ready.py backend/tests/test_health.py && bash scripts/tests/test-novelforge-acceptance.sh`

Expected: all selected tests PASS.

- [ ] **Step 2: Run isolated Compose smoke**

Run: `./scripts/novelforge-acceptance.sh up && ./scripts/novelforge-acceptance.sh metadata && ./scripts/novelforge-acceptance.sh seed-writer-ready && ./scripts/novelforge-acceptance.sh fault-http-500 && ./scripts/novelforge-acceptance.sh fault-status && ./scripts/novelforge-acceptance.sh fault-clear && ./scripts/novelforge-acceptance.sh verify-writer-ready && ./scripts/novelforge-acceptance.sh down`

Expected: all commands exit 0; metadata confirms the running image and fixture volumes remain preserved.

- [ ] **Step 3: Update evidence documents only from observed results**

```markdown
- B+2: COMPLETE — fixture-only one-shot HTTP 500, delayed response and held/release controls; no-Docker tests and isolated smoke passed.
- Next step: B+3 recovery batch with fresh matching metadata.
```

- [ ] **Step 4: Commit**

```bash
git add docs/acceptance/novelforge-acceptance-control.md docs/acceptance/writer-ready-01-working-matrix.md
git diff --cached --check
git commit -m "docs: record acceptance fault controls"
```

### Task 5: B+3 Task 10 closure

**Files:**

- Modify: `docs/acceptance/novelforge-acceptance-control.md`
- Modify: `docs/acceptance/writer-ready-01-working-matrix.md`

**Interfaces:**

- Consumes fresh `metadata` output and B+2 runner controls.
- Produces explicit PASS evidence for WR-07 and WR-09–WR-23, retaining WR-24 and WR-25 as deferred to their separately authorized tasks.

- [ ] **Step 1: Record approved WR-07 journey**

```markdown
WR-07 is fulfilled by guarded leave to the library/dashboard followed by project selection. No in-editor project switcher is required or introduced.
```

- [ ] **Step 2: Execute recovery and failure/export/restart batches**

Run: `./scripts/novelforge-acceptance.sh metadata` immediately before every new browser evidence package.

Expected: each row is observed with synthetic fixture data and is marked PASS only after its concrete UI/network/API evidence.

- [ ] **Step 3: Rerun affected regression scenarios after any Writer Ready fix**

Run: focused Vitest/pytest suite for modified behavior and its minimal browser path.

Expected: all regression evidence PASS on a metadata-matched build.

- [ ] **Step 4: Restore or describe fixture state, then close Task 10**

Run: `./scripts/novelforge-acceptance.sh verify-writer-ready && ./scripts/novelforge-acceptance.sh down`

Expected: canonical fixture verifies, volumes are retained, and control document names Task 11 as the sole next step.

- [ ] **Step 5: Commit and push final evidence**

```bash
git add docs/acceptance/novelforge-acceptance-control.md docs/acceptance/writer-ready-01-working-matrix.md
git diff --cached --check
git commit -m "docs: close writer ready task 10 acceptance"
git push origin feature/writer-ready-01-acceptance
```
