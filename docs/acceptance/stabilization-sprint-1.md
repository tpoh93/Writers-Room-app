# Stabilization Sprint 1 Acceptance Evidence

Status: `MERGED — CLOSURE 1.1 READY FOR REVIEW`

Final verified implementation head:
`5b0ccbf10b1e9853a3a478483116bdf2fcd82a5f`

Documentation head:
`e4643e329f4ea34da24220dd6202d77e4d948a23`

PR #2 was merged to `main` as squash commit
`5deace267b80a7eb2bdddacc633ae01d01f0f166`.

Evidence below was collected on 2026-07-26 from the Stabilization Sprint 1
working tree and final GitHub Actions runs. Local dependency-bound backend and
frontend checks used temporary Docker containers. No provider credentials were
supplied or required.

| Gate | Expected evidence | Status |
|---|---|---|
| Run history retained | Fresh-session run and node-state test (`test_completed_run_and_outputs_survive_fresh_session`) | `PASS (local)` |
| Restart resume skips completed Kimi | Fresh-session resume test (`test_failed_grok_resume_after_fresh_session_skips_kimi`) | `PASS (local)` |
| Private prose absent from logs | Log sink regression covering initial execution, persisted outputs, a fresh session, resume, and the provider-error path; every private marker remained absent from captured logs | `PASS (local)` |
| Per-step usage metadata persisted | Node output regression test (`test_text_generate_persists_usage_metadata`) | `PASS (local)` |
| Provider timeout state | Real `openai.APITimeoutError` passes through `generate_review`, normalizes to `ProviderTimeoutError`, and produces the safe timeout workflow/SSE state while preserving completed Kimi output and usage | `PASS (local)` |
| Empty response blocks Aion | Backend failure regression test (`test_empty_grok_response_never_runs_aion`) | `PASS (local)` |
| Failed run cannot be accepted | Frontend dialog regression test (`keeps accept disabled when a run error follows an Aion output`) | `PASS (local)` |
| Restore failure restarts stack | Shell recovery test | `PASS (local)` |
| Pydantic v2 warning gate | Pytest warning-as-error run | `PASS (local)` |
| Full frontend/backend suites | Final GitHub Actions runs on implementation head `5b0ccbf` | `PASS (CI)` |

## Historical local verification

Final verification for the implementation head recorded:

- focused privacy and provider-timeout tests: `3 passed`;
- the privacy log-sink test covers initial execution, persisted outputs, a fresh
  database session, resume, and the provider-error path; every private marker
  remained absent from captured logs, and marker literals occur only in tests;
- a real `openai.APITimeoutError` passes through `generate_review` and is
  normalized to `asyncio.TimeoutError`; the run ends as `timeout`, SSE reports
  `code=provider_timeout`, completed Kimi output and usage remain stored, Grok
  ends as `error`, Aion does not run, and source text and `params_json` remain
  unchanged;
- backend full suite: `33 passed`, with one third-party
  `StarletteDeprecationWarning`;
- Pydantic warning gate: `33 passed`, with the same third-party
  `StarletteDeprecationWarning`;
- frontend suite, typecheck, and production web build: `PASS`;
- recovery, upstream, exposure, and credential guards: `PASS`.

Final GitHub Actions on implementation head `5b0ccbf`:

- `Thinking p*rn`, run 2: `success`;
- `Task 7 Parameterized Pipeline`, run 33: `success`;
- `Task 8 Selected Text UI`, run 14: `success`;
- `Sprint 0 Foundation`, run 97: `success`.

## Acceptance closure

All original sprint acceptance rows are `PASS`, and PR #2 is merged. A later
privacy review found that generic provider exceptions were not normalized at
the provider boundary. Stabilization Closure 1.1 addresses that issue and
reconciles the post-merge evidence in
[`stabilization-closure-1-1.md`](stabilization-closure-1-1.md).

Attempt 1 remains historically `BLOCKED`: an initial mandatory local backend
gate inherited the ignored root `.env` container database path and failed its
two health tests before a controlled temporary-database rerun passed. It
created no commit and performed no push.

Attempt 2 resumed the same working tree and gave every backend invocation a
new explicit SQLite path under `/tmp`. Its pre-commit focused and full backend,
frontend, recovery, frozen-upstream, exposure, credential, marker, scope,
allowlist, and diff gates all pass. Stabilization Closure 1.1 is therefore
`READY FOR REVIEW`; the post-commit evidence and exact closure commit SHA are
recorded in the final Attempt 2 report.

## Non-blocking observations

- Usage metadata keeps `estimated_cost_usd` nullable when pricing is unavailable
  and records `cost_status: pricing_unavailable`; pricing integration remains
  outside this sprint.
- The production web build emitted its existing chunk-size warning (assets over
  500 kB after minification). No mixed-import warning was emitted in this fresh
  container run. Chunk splitting and import restructuring are outside this
  stabilization scope.
- The backend suite emitted one third-party `StarletteDeprecationWarning` from
  `fastapi.testclient` about its `httpx` integration. It is not a Pydantic v2
  warning and did not fail the configured Pydantic warning gate.
- CI did not use real provider credentials; provider integrations were exercised
  through deterministic test doubles and production-shaped exceptions.

## Scope boundary

This record covers durability, failure safety, log privacy, restore recovery,
and deprecation gating only. Visual Language changes, full localization, and
Premium Polish are explicitly excluded.
