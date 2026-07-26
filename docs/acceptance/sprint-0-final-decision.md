# Sprint 0 Final Decision

## Decision

`GO`

Sprint 0 foundation is accepted for continuation into the next planned phase.
This decision does not merge the branch into `main` and does not authorize
unplanned localization, visual-language or premium-polish work.

## Scope

- Repository: `tpoh93/Writers-Room-app`
- Branch: `spike/sprint-0-foundation`
- Upstream baseline: `ca7ca584580df0220a6a0d008309e5575b3dc449`
- Decision time UTC: `2026-07-26T03:16:04+00:00`

## Functional evidence

The real OpenRouter pipeline was manually verified with:

- `moonshotai/kimi-k3`
- `x-ai/grok-4.5`
- `aion-labs/aion-3.0`

Observed results:

- Fixture A applied only the selected text and exact undo restored the source;
- Fixture B rejected the result without changing the document;
- Fixture C preserved the Kimi checkpoint after Grok failure;
- retry skipped Kimi and completed Grok followed by Aion;
- the document remained unchanged during the failed execution.

## Corrective changes

Two defects discovered during acceptance were corrected:

1. project-list requests now use the canonical `/api/projects/` path;
2. an EventSource transport closure occurring after a successful SSE `end`
   no longer produces a false pipeline failure.

Both corrections have dedicated regression tests.

## Verification

- Frontend tests: `22 passed`
- Backend tests: `22 passed`
- Frontend typecheck: `PASS`
- Production web build: `PASS`
- Upstream verification: `PASS`
- Local exposure verification: `PASS`
- Runtime health checks: `PASS`
- Secret scan: `PASS`
- Tracked `.env` scan: `PASS`
- Git diff whitespace validation: `PASS`

## Non-blocking observations

- The frontend build reports existing chunk-size and mixed-import warnings.
- Backend tests report Pydantic and Starlette deprecation warnings.
- Fixtures B and C did not retain durable run IDs because the workflow uses
  `keep_run_history=false`.
- Token counters were not retained after runtime cleanup.

These observations should be tracked as maintenance work but do not invalidate
the verified Sprint 0 behavior.

## Restrictions after GO

- Do not merge automatically.
- Do not change the frozen upstream baseline.
- Keep `Thinking p*rn` spelled exactly as defined.
- Continue work only through the planned project phase and review process.
