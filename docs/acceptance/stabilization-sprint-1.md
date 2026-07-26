# Stabilization Sprint 1 Acceptance Evidence

Status: `NOT READY — GitHub Actions has not yet reported the full suite gate.`

All local evidence below was collected on 2026-07-26 from the Stabilization
Sprint 1 working tree, using temporary Docker containers for dependency-bound
backend and frontend checks. No provider credentials were supplied or required.

| Gate | Expected evidence | Status |
|---|---|---|
| Run history retained | Fresh-session run and node-state test (`test_completed_run_and_outputs_survive_fresh_session`) | `PASS (local)` |
| Restart resume skips completed Kimi | Fresh-session resume test (`test_failed_grok_resume_after_fresh_session_skips_kimi`) | `PASS (local)` |
| Private prose absent from logs | Log sink regression covering initial execution, resume, persisted-output, and provider-error paths | `PENDING` |
| Per-step usage metadata persisted | Node output regression test (`test_text_generate_persists_usage_metadata`) | `PASS (local)` |
| Provider timeout state | Backend regression covering `asyncio.TimeoutError` and supported provider-specific `APITimeoutError` paths | `PENDING` |
| Empty response blocks Aion | Backend failure regression test (`test_empty_grok_response_never_runs_aion`) | `PASS (local)` |
| Failed run cannot be accepted | Frontend dialog regression test (`keeps accept disabled when a run error follows an Aion output`) | `PASS (local)` |
| Restore failure restarts stack | Shell recovery test | `PASS (local)` |
| Pydantic v2 warning gate | Pytest warning-as-error run | `PASS (local)` |
| Full frontend/backend suites | CI | `PENDING` |

## Fresh local verification

The backend full suite, with Pydantic v2 deprecations promoted to errors,
passed in a temporary Python 3.11 Docker container. The frontend full Vitest
suite, typecheck, and production web build passed in a temporary Node 22 Docker
container. The restore recovery shell test, upstream baseline check, local-only
exposure contract check, and quiet tracked OpenRouter key-shape scan passed.

## Remaining acceptance blockers

- Private prose logging remains `PENDING`: the current log-sink regression
  covers the direct generation path, but does not cover resume, persisted-output,
  or provider-error log paths. Redaction-safe regression coverage for all four
  paths is required before this row can pass.
- Provider timeout state remains `PENDING`: the current backend regression
  injects `asyncio.TimeoutError`, but supported OpenAI/LangChain integrations
  may surface provider-specific `APITimeoutError`. That production-shaped
  exception path must be proven to produce the timeout state before this row can
  pass.

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

## Scope boundary

This record covers durability, failure safety, log privacy, restore recovery,
and deprecation gating only. Visual Language changes, full localization, and
Premium Polish are explicitly excluded.
