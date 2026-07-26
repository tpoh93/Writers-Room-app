# Stabilization Sprint 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the accepted Sprint 0 foundation so `Thinking p*rn` run history survives restart, failure states remain safe, private prose never enters logs, restore failures recover predictably, and the stabilization contract is enforced in CI.

**Architecture:** Keep the existing FastAPI, SQLModel, Vue 3, CodeMirror, SSE, and Docker Compose architecture. Add explicit workflow metadata for retention, persist metadata-only step telemetry in existing node-state output JSON, strengthen timeout/cancellation handling, and test restart behavior through fresh database sessions rather than introducing a new scheduler or storage layer.

**Tech Stack:** Python 3.11, FastAPI, SQLModel, Pytest, Vue 3, TypeScript, Vitest, Docker Compose, Bash, GitHub Actions.

## Global Constraints

- Base branch: `main` at Sprint 0 squash commit `ff4f34e45ad2b42c562cb769c345bf19da626b21`.
- Frozen upstream baseline remains `ca7ca584580df0220a6a0d008309e5575b3dc449` (`v0.9.6`).
- Keep the product workflow name exactly `Thinking p*rn`.
- Do not add public networking, registration, authentication, PostgreSQL, Kubernetes, or SaaS behavior.
- Do not perform Visual Language, full localization, or Premium Polish work in this sprint.
- Do not commit OpenRouter credentials, private prose, provider payloads, tailnet details, SQLite data, or backups.
- Frontend must continue to call only the backend; no direct provider calls.
- Every behavior change starts with a failing test and ends with focused tests plus the full relevant suite.
- Do not merge automatically.

---

### Task 1: Explicit Built-In Workflow Retention Metadata

**Files:**
- Modify: `backend/app/bootstrap/workflows.py`
- Modify: `backend/app/bootstrap/workflows/thinking_porn_spike.wf`
- Modify: `backend/tests/workflow/test_parameterized_text_pipeline.py`

**Interfaces:**
- Consumes: existing `_parse_code_workflow(file_path: str) -> dict`.
- Produces: metadata directive `# workflow-keep-run-history: true|false`; parser output key `keep_run_history: bool`.

- [ ] **Step 1: Write failing parser tests**

Add these assertions to `backend/tests/workflow/test_parameterized_text_pipeline.py`:

```python
def test_builtin_workflow_explicitly_keeps_run_history() -> None:
    parsed = _parse_code_workflow(str(WORKFLOW_PATH))
    assert parsed["keep_run_history"] is True


def test_workflow_retention_metadata_rejects_invalid_value(tmp_path: Path) -> None:
    workflow_path = tmp_path / "invalid.wf"
    workflow_path.write_text(
        "# workflow-name: Invalid\n"
        "# workflow-keep-run-history: perhaps\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="workflow-keep-run-history"):
        _parse_code_workflow(str(workflow_path))
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
PYTHONPATH=backend pytest -q \
  backend/tests/workflow/test_parameterized_text_pipeline.py \
  -k 'keeps_run_history or retention_metadata'
```

Expected: the first test reports `False`; the second does not raise.

- [ ] **Step 3: Implement strict metadata parsing**

In `backend/app/bootstrap/workflows.py`, add:

```python
_WORKFLOW_KEEP_HISTORY_PATTERN = re.compile(
    r"^\s*#\s*workflow-keep-run-history:\s*(.+?)\s*$",
    re.MULTILINE,
)


def _parse_keep_run_history(code: str, file_path: str) -> bool:
    match = _WORKFLOW_KEEP_HISTORY_PATTERN.search(code)
    if not match:
        return False

    value = match.group(1).strip().lower()
    if value == "true":
        return True
    if value == "false":
        return False
    raise ValueError(
        "workflow-keep-run-history must be true or false: "
        f"{file_path}"
    )
```

Use it in `_parse_code_workflow`:

```python
"keep_run_history": _parse_keep_run_history(code, file_path),
```

Add to the top of `thinking_porn_spike.wf`:

```text
# workflow-keep-run-history: true
```

- [ ] **Step 4: Run focused and full backend tests**

Run:

```bash
PYTHONPATH=backend pytest -q backend/tests/workflow/test_parameterized_text_pipeline.py
PYTHONPATH=backend pytest -q backend/tests
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add \
  backend/app/bootstrap/workflows.py \
  backend/app/bootstrap/workflows/thinking_porn_spike.wf \
  backend/tests/workflow/test_parameterized_text_pipeline.py
git commit -m "fix: retain Thinking p*rn run history"
```

---

### Task 2: Prove Run and Checkpoint Survival Across Fresh Sessions

**Files:**
- Create: `backend/tests/workflow/test_run_history_persistence.py`
- Modify only if a test exposes a defect: `backend/app/api/endpoints/workflows.py`
- Modify only if a test exposes a defect: `backend/app/services/workflow/engine/state_manager.py`

**Interfaces:**
- Consumes: `WorkflowRun`, `NodeExecutionState`, `get_run`, `get_run_node_states`, `AsyncExecutor`.
- Produces: file-backed SQLite restart tests proving that completed node output and retry checkpoints survive a new SQLModel session.

- [ ] **Step 1: Write the failing persistence test**

Create `backend/tests/workflow/test_run_history_persistence.py` with a file-backed engine fixture and this core scenario:

```python
@pytest.mark.asyncio
async def test_completed_run_and_node_outputs_survive_fresh_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    database_path = tmp_path / "history.db"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as first_session:
        workflow = create_test_workflow(first_session, keep_run_history=True)
        run = create_test_run(first_session, workflow.id)
        await execute_fake_three_stage_run(first_session, run.id, monkeypatch)
        run_id = run.id

    with Session(engine) as second_session:
        restored_run = second_session.get(WorkflowRun, run_id)
        states = get_run_node_states(run_id, second_session)

        assert restored_run is not None
        assert restored_run.status == "succeeded"
        assert {state.node_id: state.outputs_json["text"] for state in states} == {
            "kimi": "Wersja Kimi",
            "grok": "Wersja Groka",
            "aion": "Wersja Aiona",
        }
```

Add a second test that fails on Grok in the first session, opens a fresh session, resumes with a new `AsyncExecutor`, and asserts provider calls are `[12, 13]`, never `11`.

- [ ] **Step 2: Run to verify RED or expose hidden coupling**

Run:

```bash
PYTHONPATH=backend pytest -q \
  backend/tests/workflow/test_run_history_persistence.py -vv
```

Expected before implementation: either missing helper behavior or a restart/resume defect. A surprising PASS is acceptable only after confirming the test uses two independently opened sessions and a file-backed database.

- [ ] **Step 3: Apply the smallest persistence fix**

Do not create a second run-history store. Fix only the defect exposed by the test. Preserve the existing contract:

```python
initial_context = {}
if run.scope_json:
    initial_context.update(run.scope_json)
if run.params_json:
    initial_context.update(run.params_json)
```

Resume must reuse successful `NodeExecutionState` rows and start at the first failed or missing node.

- [ ] **Step 4: Run focused and full backend suites**

```bash
PYTHONPATH=backend pytest -q backend/tests/workflow/test_run_history_persistence.py
PYTHONPATH=backend pytest -q backend/tests
```

- [ ] **Step 5: Commit**

```bash
git add backend/tests/workflow/test_run_history_persistence.py \
  backend/app/api/endpoints/workflows.py \
  backend/app/services/workflow/engine/state_manager.py
git commit -m "test: prove pipeline restart persistence"
```

Stage only implementation files that actually changed.

---

### Task 3: Privacy-Safe Per-Step Usage Telemetry

**Files:**
- Modify: `backend/app/services/ai/core/llm_service.py`
- Modify: `backend/app/services/workflow/nodes/ai/text_generate.py`
- Modify: `backend/tests/workflow/test_parameterized_text_pipeline.py`

**Interfaces:**
- Consumes: `calc_input_tokens`, `estimate_tokens`, `LLMConfig`, existing `generate_review(...) -> str`.
- Produces: `TextGenerateOutput.usage` persisted inside `NodeExecutionState.outputs_json`; no prompt or source prose in normal logs.

- [ ] **Step 1: Write failing telemetry and privacy tests**

Add a test asserting the persisted output shape:

```python
assert state.outputs_json == {
    "text": "Wersja Kimi",
    "usage": {
        "llm_config_id": 11,
        "model_name": "test-model-11",
        "input_tokens": pytest.approx(expected_input_tokens, rel=0, abs=2),
        "output_tokens": pytest.approx(expected_output_tokens, rel=0, abs=2),
        "duration_ms": pytest.approx(0, abs=5000),
        "estimated_cost_usd": None,
        "cost_status": "pricing_unavailable",
    },
}
```

Add a Loguru sink around a generation call and assert a unique private marker does not appear:

```python
private_marker = "PRIVATE_SCENE_MARKER_91A7"
messages: list[str] = []
sink_id = logger.add(messages.append, format="{message}")
try:
    await generate_review(
        session=session,
        llm_config_id=config.id,
        user_prompt=private_marker,
        track_stats=False,
    )
finally:
    logger.remove(sink_id)

assert private_marker not in "".join(messages)
```

- [ ] **Step 2: Run to verify RED**

```bash
PYTHONPATH=backend pytest -q \
  backend/tests/workflow/test_parameterized_text_pipeline.py \
  -k 'usage or private'
```

Expected: output has only `text`; private marker appears in logs.

- [ ] **Step 3: Remove prose logging and add structured usage**

Replace the prompt-bearing log in `generate_review` with metadata only:

```python
logger.info(
    "Starting review generation: llm_config_id={}, has_system_prompt={}, "
    "input_tokens={}",
    llm_config_id,
    bool(system_prompt),
    calc_input_tokens(system_prompt, user_prompt),
)
```

In `text_generate.py`, add:

```python
class TextGenerateUsage(BaseModel):
    llm_config_id: int
    model_name: str
    input_tokens: int
    output_tokens: int
    duration_ms: int
    estimated_cost_usd: float | None = None
    cost_status: str = "pricing_unavailable"


class TextGenerateOutput(BaseModel):
    text: str
    usage: TextGenerateUsage
```

Measure with `time.perf_counter()`, load `LLMConfig` from `self.context.session`, calculate tokens with existing helpers, and return both text and usage. Do not log prompts or generated prose.

- [ ] **Step 4: Verify API compatibility**

The frontend collector must continue reading:

```typescript
const text = state.outputs_json?.text
```

Run:

```bash
PYTHONPATH=backend pytest -q backend/tests
cd frontend && npm test -- --run && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add \
  backend/app/services/ai/core/llm_service.py \
  backend/app/services/workflow/nodes/ai/text_generate.py \
  backend/tests/workflow/test_parameterized_text_pipeline.py
git commit -m "fix: persist privacy-safe step telemetry"
```

---

### Task 4: Deterministic Timeout, Empty-Response, and Accept Safety

**Files:**
- Modify: `backend/app/api/endpoints/workflows.py`
- Modify: `backend/tests/workflow/test_parameterized_text_pipeline.py`
- Modify: `frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue`
- Modify: `frontend/src/renderer/src/components/pipelines/__tests__/SelectionPipelineDialog.test.ts`

**Interfaces:**
- Consumes: SSE error events, `WorkflowRun.status`, dialog `runError`, Aion step state.
- Produces: stable `timeout` run status and an accept button enabled only after a successful Aion result with no run error or conflict.

- [ ] **Step 1: Write failing backend failure-state tests**

Add tests for:

```python
@pytest.mark.asyncio
async def test_grok_timeout_preserves_kimi_and_marks_run_timeout(...):
    ...
    assert run.status == "timeout"
    assert states["kimi"].status == "success"
    assert states["grok"].status == "error"
    assert "aion" not in states or states["aion"].status != "success"


@pytest.mark.asyncio
async def test_empty_grok_response_never_runs_aion(...):
    ...
    assert states["grok"].status == "error"
    assert "aion" not in calls
```

The timeout fake must raise `asyncio.TimeoutError("synthetic provider timeout")`; the empty-response fake must raise the same `ValueError` produced by `generate_review` for blank content.

- [ ] **Step 2: Write the failing frontend safety test**

Mount the dialog, provide an Aion output, then send a run error. Assert:

```typescript
expect(wrapper.get('[data-test="accept"]').attributes('disabled')).toBeDefined()
```

- [ ] **Step 3: Run RED tests**

```bash
PYTHONPATH=backend pytest -q backend/tests/workflow/test_parameterized_text_pipeline.py \
  -k 'timeout or empty'
cd frontend && npm test -- \
  src/renderer/src/components/pipelines/__tests__/SelectionPipelineDialog.test.ts
```

- [ ] **Step 4: Implement explicit failure semantics**

In the stream endpoint, handle timeout before the generic exception:

```python
except asyncio.TimeoutError as exc:
    state_manager.update_run_status(run_id, "timeout")
    yield f"data: {json.dumps({
        'type': 'error',
        'error': str(exc),
        'code': 'provider_timeout',
        'message': 'Provider timeout',
    }, ensure_ascii=False)}\n\n"
```

Do not modify source text in backend failure paths.

Update the dialog condition:

```typescript
const acceptDisabled = computed(() =>
  running.value
  || steps.aion.status !== 'success'
  || !finalText.value.trim()
  || Boolean(runError.value)
  || Boolean(props.conflict)
)
```

- [ ] **Step 5: Run focused and full suites**

```bash
PYTHONPATH=backend pytest -q backend/tests
cd frontend && npm test -- --run && npm run typecheck && npm run build:web:container
```

- [ ] **Step 6: Commit**

```bash
git add \
  backend/app/api/endpoints/workflows.py \
  backend/tests/workflow/test_parameterized_text_pipeline.py \
  frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue \
  frontend/src/renderer/src/components/pipelines/__tests__/SelectionPipelineDialog.test.ts
git commit -m "fix: harden pipeline failure states"
```

---

### Task 5: Restore Failure Recovery

**Files:**
- Modify: `scripts/restore.sh`
- Create: `scripts/tests/test-restore-recovery.sh`
- Modify: `.github/workflows/sprint-0-backend.yml`

**Interfaces:**
- Consumes: `docker compose stop`, `docker compose run`, `docker compose up`.
- Produces: restore command returns the original failure status but always attempts to restart the existing backend and frontend.

- [ ] **Step 1: Write a failing shell test with fake Docker**

Create `scripts/tests/test-restore-recovery.sh` that prepends a temporary fake `docker` executable to `PATH`. The fake must:

```bash
case "$*" in
  "compose stop backend") exit 0 ;;
  "compose run --rm backend python -m app.cli.restore"*) exit 23 ;;
  "compose up -d backend frontend") exit 0 ;;
  *) exit 99 ;;
esac
```

Capture calls in a file. Assert `scripts/restore.sh /backups/broken.db --force` exits `23` and the final recorded call is `compose up -d backend frontend`.

- [ ] **Step 2: Run to verify RED**

```bash
bash scripts/tests/test-restore-recovery.sh
```

Expected: restart call is missing.

- [ ] **Step 3: Implement an EXIT recovery trap**

Use this shape in `scripts/restore.sh`:

```bash
restart_stack() {
  docker compose up -d backend frontend || {
    echo "ERROR: restore finished but the application stack could not restart" >&2
    return 1
  }
}

backend_stopped=false
cleanup() {
  status=$?
  if [[ "$backend_stopped" == true ]]; then
    restart_stack || true
  fi
  exit "$status"
}
trap cleanup EXIT

docker compose stop backend
backend_stopped=true
docker compose run --rm backend python -m app.cli.restore "$@"
```

The trap must preserve the restore command's exit status.

- [ ] **Step 4: Add the shell test to CI and run locally**

Add a workflow step:

```yaml
- name: Test restore failure recovery
  run: bash scripts/tests/test-restore-recovery.sh
```

Run:

```bash
bash -n scripts/restore.sh scripts/tests/test-restore-recovery.sh
bash scripts/tests/test-restore-recovery.sh
```

- [ ] **Step 5: Commit**

```bash
git add scripts/restore.sh scripts/tests/test-restore-recovery.sh \
  .github/workflows/sprint-0-backend.yml
git commit -m "fix: recover stack after restore failure"
```

---

### Task 6: Remove Actionable Pydantic V2 Deprecations

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/schemas/ai.py`
- Modify: `backend/app/schemas/tool_result.py`
- Modify: `backend/app/schemas/workflow.py`
- Modify only if reported by the warning gate: additional backend schema files using class-based `Config` or `json_encoders`.

**Interfaces:**
- Consumes: Pydantic v2 `ConfigDict`.
- Produces: backend suite passes with `PydanticDeprecatedSince20` promoted to errors.

- [ ] **Step 1: Add a warning gate command and confirm RED**

Run:

```bash
PYTHONPATH=backend pytest -q backend/tests \
  -W error::pydantic.warnings.PydanticDeprecatedSince20
```

Record every application-owned file reported. Do not suppress the warning globally.

- [ ] **Step 2: Convert class-based config**

For settings models:

```python
from pydantic import ConfigDict

model_config = ConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    extra="ignore",
)
```

For ORM response models:

```python
model_config = ConfigDict(from_attributes=True)
```

Replace `json_encoders` with field serializers only where a test proves serialization changes. Preserve existing JSON output.

- [ ] **Step 3: Run warning gate and full backend suite**

```bash
PYTHONPATH=backend pytest -q backend/tests \
  -W error::pydantic.warnings.PydanticDeprecatedSince20
PYTHONPATH=backend pytest -q backend/tests
```

The Starlette `httpx` warning may remain documented if it originates outside application code. Do not add a speculative dependency replacement in this task.

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/config.py backend/app/schemas
git commit -m "chore: migrate backend models to Pydantic v2 config"
```

---

### Task 7: Stabilization Gate, Evidence, and Draft PR

**Files:**
- Create: `.github/workflows/stabilization-sprint-1.yml`
- Create: `docs/acceptance/stabilization-sprint-1.md`
- Modify: `docs/acceptance/README.md`

**Interfaces:**
- Consumes: all focused tests and scripts from Tasks 1-6.
- Produces: one CI gate and one redacted acceptance record for Stabilization Sprint 1.

- [ ] **Step 1: Create the stabilization workflow**

The workflow must run on pull requests to `main` when stabilization paths change and execute:

```yaml
- backend full test suite
- backend Pydantic deprecation warning gate
- frontend full Vitest suite
- frontend typecheck
- production web build
- restore recovery shell test
- upstream baseline verification
- local exposure contract check
- OpenRouter key-shape scan
```

Do not require real provider credentials in GitHub Actions.

- [ ] **Step 2: Create the acceptance record**

`docs/acceptance/stabilization-sprint-1.md` must contain this matrix:

```markdown
| Gate | Expected evidence | Status |
|---|---|---|
| Run history retained | Fresh-session run and node-state test | PENDING |
| Restart resume skips completed Kimi | Fresh-session resume test | PENDING |
| Private prose absent from logs | Log sink regression test | PENDING |
| Per-step usage metadata persisted | Node output regression test | PENDING |
| Provider timeout state | Backend timeout regression test | PENDING |
| Empty response blocks Aion | Backend failure regression test | PENDING |
| Failed run cannot be accepted | Frontend dialog regression test | PENDING |
| Restore failure restarts stack | Shell recovery test | PENDING |
| Pydantic v2 warning gate | Pytest warning-as-error run | PENDING |
| Full frontend/backend suites | CI | PENDING |
```

Do not mark a row PASS until fresh evidence exists on the final branch head.

- [ ] **Step 3: Run the complete local verification**

```bash
PYTHONPATH=backend pytest -q backend/tests \
  -W error::pydantic.warnings.PydanticDeprecatedSince20
cd frontend && npm test -- --run && npm run typecheck && npm run build:web:container
cd ..
bash scripts/tests/test-restore-recovery.sh
bash scripts/verify-upstream.sh
bash scripts/check-local-exposure.sh
git grep -nE 'sk-or-v1-[A-Za-z0-9_-]{20,}' -- . && exit 1 || true
git diff --check
```

- [ ] **Step 4: Update evidence from actual output**

Replace only rows supported by the final verification. Document remaining non-blocking observations:

- nullable cost because pricing is unavailable;
- existing frontend chunk-size and mixed-import build warnings;
- any remaining third-party Starlette warning.

- [ ] **Step 5: Commit and push**

```bash
git add .github/workflows/stabilization-sprint-1.yml docs/acceptance
git commit -m "ci: add Stabilization Sprint 1 gate"
git push -u origin feature/stabilization-sprint-1
```

- [ ] **Step 6: Open a draft pull request**

Title:

```text
Stabilization Sprint 1
```

Body must state:

```markdown
- Base: Sprint 0 squash commit `ff4f34e`
- Scope: durability, failure safety, log privacy, restore recovery, deprecation cleanup
- Explicitly excluded: Visual Language, full localization, Premium Polish
- Do not merge until every stabilization acceptance row and GitHub Action is green
```

---

## Self-Review

- Spec coverage: run-history survival, restart resume, provider failure, timeout, source safety, secret/log privacy, backup recovery, and test gates are assigned to concrete tasks.
- Placeholder scan: no `TBD`, `TODO`, or undefined implementation step remains.
- Type consistency: `TextGenerateOutput` continues exposing top-level `text`; new `usage` is additive, so existing frontend result collection remains compatible.
- Scope boundary: frontend visual redesign, broad localization, cost-pricing integration, chunk splitting, and public deployment remain outside this stabilization sprint.
