# Task Creation: Sprint 0 Foundation Spike

## Goal

Prove that the NovelForge fork can become a private, local-first writing application that runs on Piotr's Mac, is reachable through Tailscale, survives restarts and data migration, and supports one complete selected-text three-model pipeline without changing text outside the selected range.

## Context inspected

- Approved architecture: `docs/superpowers/specs/2026-07-25-local-first-vps-ready-design.md`
- Upstream baseline: `RhythmicWave/NovelForge` commit `ca7ca584580df0220a6a0d008309e5575b3dc449` (`v0.9.6`)
- Frontend: Vue 3, TypeScript, CodeMirror 6, Pinia, Element Plus, Vite/Electron
- Backend: FastAPI, SQLModel, SQLite, LangChain provider adapters
- Existing selected-text path in `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue`
- Existing workflow persistence and checkpointing in `backend/app/db/models.py` and `backend/app/services/workflow/`
- Existing OpenAI-compatible transport in `backend/app/services/ai/core/chat_model_factory.py`
- Current Docker Compose guidance checked against current Docker documentation through Context7

## Requirements inventory

### Critical requirements

- Web runtime is canonical; Electron remains optional.
- Frontend and backend start through Docker Compose.
- SQLite and backups use persistent storage outside container filesystems.
- No real API keys or private writing are committed.
- Remote access uses Tailscale only in Version 1.
- One selected-text run executes three different LLM configurations sequentially.
- The final result is shown before application.
- Accept changes only the captured selection.
- Reject changes nothing.
- A changed source document produces a conflict instead of a guessed replacement.
- Completed step outputs survive a later-step failure.
- The same stack starts on clean Linux without application code changes.

### Non-functional requirements

- Safe default network binding.
- Health checks and deterministic startup ordering.
- Idempotent patch application.
- Restart-safe pipeline state.
- Backup before risky database migration.
- Clear rollback after every slice.
- No SaaS accounts, billing, public registration, or PostgreSQL in Sprint 0.

### Good-to-haves

- Estimated per-step cost.
- Optional Neo4j Compose profile.
- Polished Polish copy.
- Rich visual diff.

These are deferred until the core path passes.

### Stack and architecture context

- Stack: Vue 3, CodeMirror 6, TypeScript, FastAPI, SQLModel, SQLite, LangChain, Docker Compose, Tailscale.
- Boundaries: browser frontend, same-origin reverse proxy, FastAPI API, SQLite persistence, provider adapters, workflow runner.
- Integrations: OpenRouter through OpenAI-compatible transport; Tailscale for trusted-device access.
- Limitations: public AGPL fork; private deployment; single-owner data model; no public ingress.

### Unknowns and assumptions

- Unknown: exact current upstream test layout may require adapting test file locations after checkout.
- Unknown: whether all OpenRouter target models support the same structured-output path.
- Assumption: plain text generation is sufficient for the first pipeline spike; structured output is not required for each literary step.
- Assumption: the existing CodeMirror editor remains the selected-text integration point.

## Iteration layering

### Iteration 1: Runnable private foundation

- Outcome: clean checkout starts frontend and backend with persistent data and health checks.
- Scope: Compose, same-origin routing, SQLite volume, secret handling, baseline documentation.
- Deferred: real multi-model workflow and editor patching.

### Iteration 2: Safe selected-text vertical path

- Outcome: deterministic fake-model pipeline runs through backend and returns a conflict-safe patch preview.
- Scope: run records, step outputs, retry seam, selection fingerprint, accept/reject API and editor integration.
- Deferred: real OpenRouter calls and visual polish.

### Iteration 3: Real-provider and portability proof

- Outcome: Kimi to Grok to Aion runs through OpenRouter, data survives restart, and the same stack starts on clean Linux.
- Scope: provider smoke test, cancellation, retry, backup/restore, Tailscale access, Linux portability report.
- Deferred: Codex redesign, translation pipeline, full localization, public hosting.

## Vertical slices

1. Baseline and branch discipline
   - Value: preserves a clean upstream relationship and gives every later change a reversible starting point.
   - Work: document upstream remote, pinned commit, branch conventions, local prerequisites, and verification commands.
   - Dependencies: approved architecture.
   - Acceptance: a new contributor can identify the exact upstream baseline and create a feature branch without touching `main`.
   - Verification: compare fork `main` with upstream commit; inspect license and notices.
   - Change Review focus: accidental divergence, missing AGPL notices, vague sync procedure.

2. Compose runtime with same-origin frontend
   - Value: one command starts the application in the same shape locally and later on a VPS.
   - Work: backend image, frontend build image, reverse proxy, `/api` routing, health endpoints, startup ordering, localhost-safe defaults.
   - Dependencies: slice 1.
   - Acceptance: `docker compose up --build` reaches the UI and healthy API; the frontend never requires a hard-coded backend port in production.
   - Verification: Compose config validation, health checks, browser smoke test, container recreation.
   - Change Review focus: public binding, oversized images, secrets copied into layers, broken Electron path.

3. Persistent SQLite and backup/restore
   - Value: writing and configuration survive container deletion and can move later to a VPS.
   - Work: explicit data and backup volumes, backup CLI, restore CLI, integrity check, documented paths.
   - Dependencies: slice 2.
   - Acceptance: a test project survives `docker compose down` plus container recreation; backup restores into a clean stack.
   - Verification: create fixture data, back up, delete live volume, restore, compare project and workflow records.
   - Change Review focus: copying a live SQLite file unsafely, restore overwriting without confirmation, secrets in backups.

4. Tailscale-only private access
   - Value: trusted devices can use the browser UI without public ports or router forwarding.
   - Work: localhost binding or Tailscale Serve instructions, verification checklist, explicit public-exposure negative test.
   - Dependencies: slice 2.
   - Acceptance: approved device connects through Tailscale; untrusted public path does not.
   - Verification: access from second trusted device, host port inspection, router configuration check.
   - Change Review focus: `0.0.0.0` defaults, anonymous public ingress, undocumented trust assumptions.

5. Selection safety seam
   - Value: AI can never silently replace the wrong text.
   - Work: pure fingerprint and patch-validation functions, selection snapshot contract, conflict response, idempotency key, unit tests.
   - Dependencies: none beyond existing editor and backend models.
   - Acceptance: unchanged document accepts patch; changed selection or incompatible surrounding document returns conflict; duplicate accept is rejected.
   - Verification: unit tests for one word, multiple paragraphs, Polish diacritics, Markdown, changed document, double apply.
   - Change Review focus: coordinate drift, weak hashes used as authority, text outside range changing, non-undoable editor transaction.

6. Deterministic three-step pipeline API
   - Value: proves the product path without spending API money or depending on provider instability.
   - Work: pipeline run schema, three ordered step records, fake model adapter, persisted outputs, failure and retry semantics, status endpoint.
   - Dependencies: slices 2 and 5.
   - Acceptance: fake Kimi output feeds fake Grok, then fake Aion; step 2 can fail and retry without rerunning step 1; source text remains untouched.
   - Verification: backend integration tests and restart simulation after step 1.
   - Change Review focus: hidden in-memory state, missing model identity, retry overwriting previous evidence, partial text application.

7. Editor launch, preview, accept, and reject
   - Value: completes the first user-visible loop from selection to controlled replacement.
   - Work: launch command in CodeMirror context menu, brief dialog, progress display, per-step outputs, final diff, accept/reject, undoable transaction.
   - Dependencies: slices 5 and 6.
   - Acceptance: accept replaces only the captured range; reject leaves document byte-for-byte unchanged; conflict blocks accept.
   - Verification: frontend unit tests where practical, TypeScript typecheck, manual browser demo with fixture text.
   - Change Review focus: stale selection reuse, double click, mutation during preview, text outside selection, missing undo.

8. Real OpenRouter pipeline smoke test
   - Value: proves the intended Kimi to Grok to Aion chain works with three separate model configurations.
   - Work: configure OpenRouter transport, run one controlled fixture, record model ids, durations, token counts, failures, and cost estimate.
   - Dependencies: slices 6 and 7.
   - Acceptance: three configured models run in order and final output reaches preview; provider failure leaves document unchanged.
   - Verification: evidence log with redacted credentials and one accepted plus one rejected run.
   - Change Review focus: leaked keys, unsupported response mode, wrong model handoff, unbounded retries, misleading cost data.

9. Linux portability and GO or NO-GO report
   - Value: decides whether NovelForge is truly the correct foundation before larger adaptation.
   - Work: run stack on clean Linux VM or equivalent, restore Mac-created backup, execute fake pipeline, document blockers and decision.
   - Dependencies: slices 1 through 8.
   - Acceptance: no code changes are needed; restored project opens; health checks pass; selected-text flow works.
   - Verification: command transcript, environment versions, screenshots or logs, completed acceptance matrix.
   - Change Review focus: environment-specific hacks, undocumented manual fixes, hidden host paths, optimistic GO decision without evidence.

## Risks and dependencies

- Upstream may assume desktop packaging paths. Mitigation: make web runtime canonical and keep Electron changes minimal.
- SQLite backup can corrupt if copied during a write. Mitigation: use SQLite backup API or a controlled transaction, then run `PRAGMA integrity_check`.
- The current LLM abstraction may favor structured output. Mitigation: add a narrow plain-text pipeline adapter rather than forcing literary output through a schema.
- CodeMirror editor component is large. Mitigation: extract selection and patch safety logic into focused modules before adding pipeline UI.
- OpenRouter models may differ in reasoning and response parameters. Mitigation: keep per-step provider configuration and test each model independently before chaining.
- Public fork contains implementation but not private data. Mitigation: secret scans, ignored runtime volumes, fixtures only.

## Subagent opportunities

- Read-only backend survey: workflow persistence, provider abstractions, migration behavior. High analysis depth; output a file map and risk list.
- Read-only frontend survey: selected-text code path, preview mutation rules, undo behavior. High analysis depth; output exact extraction seams.
- Container review: Compose security, image boundaries, volume ownership, Linux portability. Medium-high analysis depth; output a review checklist.
- Each implementation slice should use an isolated worktree and receive a two-stage review: specification compliance, then code quality.

## Handoff

Next module: `implementation` after the detailed Superpowers implementation plan is accepted, because the architecture and vertical sequencing are now stable enough for task-by-task execution.

### Checkpoint

- Decision: proceed with NovelForge Sprint 0 spike.
- Protected scope: no public SaaS, no redesign, no full localization, no PostgreSQL.
- Required evidence: tests, command logs, health status, backup restore, selected-range safety, OpenRouter smoke, Linux portability.
- Stop condition: any unresolved risk of source-text loss or inability to reproduce the stack from a clean checkout.
