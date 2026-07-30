# Writer Ready Task 11 and Task 12 Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce real-model, fixture-only backup/restore evidence for WR-24 and close the complete Writer Ready acceptance set as READY only after all required regressions and operational gates pass.

**Architecture:** The `writer-ready-fixture` runner gains a dedicated Task 11 drill that owns Compose lifecycle and never addresses the normal stack. A small Python helper reads the canonical seeder IDs, snapshots the real writer `Card`, mutates its four writer fields through the public API, and compares the restored state. The drill uses the existing integrity-checked backup service through a stopped fixture backend, records only synthetic paths/results, starts a fresh backend, then performs a restart regression. Unit coverage uses real `Project`, `Card`, and `CardType` models and deliberately closes the old TestClient/sessions and disposes its engine before restore.

**Tech Stack:** Bash, Docker Compose v2, Python 3 standard-library HTTP, FastAPI TestClient, SQLModel/SQLite, pytest, Vitest.

## Global Constraints

- Operate only on Compose project `writer-ready-fixture`, `http://127.0.0.1:18080`, and data created by `seed-writer-ready-fixture.py`.
- Never invoke `git stash`, reset, clean, `down -v`, volume deletion, port 8080, or the ordinary `writers-room` project.
- Read matching `/build-meta.json`, verify readiness, clear fault state, seed and verify before the drill and before acceptance evidence.
- WR-24 uses real `Project`, `Card`, and `CardType`; the evidence compares title, content, generation template, and review template exactly.
- Record only redacted synthetic results and persistent contracts in the repository; leave raw drill artifacts outside it.
- `READY` requires every WR-01–WR-25 row to be PASS, all listed tests to pass, a clean pushed branch, and a safely stopped fixture.

---

### Task 1: Add real-model fresh-engine restore regression

**Files:**
- Modify: `backend/tests/services/test_backup_service.py`

- [ ] Add a failing test that creates a real Project/CardType/Card, takes a backup, mutates all four writer snapshot fields through an old TestClient, closes that client and every old Session, disposes the old engine, restores with force, then patches all engine references to a new engine and verifies the fields with a fresh TestClient.
- [ ] Run the targeted test and confirm RED before adding any helper code needed for isolation.
- [ ] Implement only the test-local engine/session replacement helpers; assert a safety-backup file contains the mutated four fields and restored GET contains the backed-up four fields.
- [ ] Run `python -m pytest tests/services/test_backup_service.py -q` and confirm GREEN.
- [ ] Commit the independent regression checkpoint.

### Task 2: Add fixture-only Task 11 drill

**Files:**
- Create: `scripts/novelforge-task11-drill.py`
- Modify: `scripts/novelforge-acceptance.sh`
- Modify: `scripts/tests/test-novelforge-acceptance.sh`
- Modify: `scripts/tests/test-restore-recovery.sh`
- Modify: `docs/operations/local-compose.md`

- [ ] Write failing shell-contract assertions for `task11-drill`: only fixture Compose calls, backup path and safety-backup path emission, backend stop/restore/fresh start/restart ordering, and no destructive/normal-stack command.
- [ ] Implement the Python helper with exact base URL and seeder-ID validation, capture/mutate/compare commands, and a deterministic synthetic mutation of title/content/generation/review.
- [ ] Implement the runner command: readiness, metadata comparison, fault clear, seed/verify, backup, helper mutation/confirmation, guarded restore after backend stop, new backend/frontend start, fresh readiness/GET comparison, restart/verify, and final JSON summary.
- [ ] Update the operational guide with the fixture-only Task 11 command, fresh-backend guarantee, backup/safety path semantics, and one current next step.
- [ ] Run shell tests plus focused backend regression and commit the checkpoint.

### Task 3: Run the real Task 11 drill and record WR-24

**Files:**
- Modify: `docs/acceptance/novelforge-acceptance-control.md`
- Modify: `docs/acceptance/writer-ready-01-working-matrix.md`

- [ ] Start fixture through the canonical runner; run ready, metadata, fault-status/clear, seed, and verify.
- [ ] Run `task11-drill`; retain its synthetic backup and safety-backup paths outside the repository and verify post-restore fresh GET/restart output.
- [ ] Run a final fixture verify and record WR-24 PASS with matching metadata, operational sequence, and artifact references.
- [ ] Update control status to Task 11 COMPLETE with exactly one next step: Task 12 closure.
- [ ] Commit and push the Task 11 evidence checkpoint.

### Task 4: Close Task 12 and delivery gate

**Files:**
- Create: `docs/acceptance/writer-ready-01.md`
- Modify: `docs/acceptance/writer-ready-01-working-matrix.md`
- Modify: `docs/acceptance/novelforge-acceptance-control.md`

- [ ] Run all mandated frontend, typecheck, backend and acceptance-harness commands, plus final fixture readiness/metadata/fault-clean/verify/down smoke.
- [ ] Write the final acceptance document with one row for WR-01–WR-25, each status, automated evidence, browser/operational evidence, artifact reference and a final verdict.
- [ ] Reconcile matrix, control and final document; scan WR-01–WR-25 for FAIL or NOT VERIFIED and require empty output before setting WR-25 PASS.
- [ ] Commit and push the closure checkpoint.
- [ ] Verify exact local/origin HEAD equality and clean status; if READY, inspect/create or update a draft PR to `main` without merging or deleting the branch.

## Plan self-review

- [ ] Every operational mutation is restricted to the synthetic fixture project and port 18080.
- [ ] The Task 11 test and drill use real NovelForge models, a safety backup, fresh backend/client verification and exact four-field comparison.
- [ ] Documentation has exactly one `Next step:` line per control document and does not expose private data.
- [ ] Task 12 does not promote a result from unit evidence alone; its READY verdict depends on the live Task 11 drill and final smoke.
