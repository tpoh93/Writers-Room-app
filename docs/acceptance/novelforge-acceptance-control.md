# NovelForge acceptance control

This is the canonical operational index for the isolated `writer-ready-fixture` acceptance project at `http://127.0.0.1:18080`. It uses `compose.yaml` with `compose.acceptance.yaml`; normal Writers Room operation remains on port 8080.

## State and provenance

B+ implementation base: `19af546c069f9dd4e472a58e586124eb363ab927`.

Resolve live local state only with `git branch --show-current`, `git rev-parse HEAD`, and `git status --short`. Runtime provenance is `/build-meta.json`; obtain it with the runner before recording evidence. Shell owns Compose lifecycle, readiness, fixture seeding, and provenance comparison. Chrome DevTools is limited to UI and browser-network observation.

Runner never invokes stash, reset or clean. Protected stash identity is a local execution-capsule constraint and must be verified before work.

## Runner procedure

```bash
./scripts/novelforge-acceptance.sh up
./scripts/novelforge-acceptance.sh rebuild-frontend
./scripts/novelforge-acceptance.sh status
./scripts/novelforge-acceptance.sh ready
./scripts/novelforge-acceptance.sh metadata
./scripts/novelforge-acceptance.sh seed-writer-ready
./scripts/novelforge-acceptance.sh verify-writer-ready
./scripts/novelforge-acceptance.sh fault-status
./scripts/novelforge-acceptance.sh fault-http-500
./scripts/novelforge-acceptance.sh fault-delay 1
./scripts/novelforge-acceptance.sh fault-hold
./scripts/novelforge-acceptance.sh fault-release
./scripts/novelforge-acceptance.sh fault-clear
./scripts/novelforge-acceptance.sh down
```

The runner is the only fixture lifecycle procedure. It loads `compose.yaml` and `compose.acceptance.yaml`, preserves fixture volumes during `down`, and does not operate on the `writers-room` project.

## B+ status

- B+1: COMPLETE — implementation, no-Docker verification, and isolated Compose smoke passed.
- B+2: COMPLETE — fixture-only one-shot HTTP 500, response delay, hold/release and clear controls passed no-Docker tests and an isolated Compose smoke. The smoke observed 500 then 200 for successive synthetic writer PUTs, a 0.262 s response for a 0.25 s delay, a visible held request, explicit release, clear, reset and fixture verification.
- B+3: NOT STARTED — matrix reconciliation and batched QA require a separate plan.

Compose smoke: PASS. The current writer-ready working matrix remains the source for matrix classification; do not duplicate its rows here. WR-08 is a historical FAIL resolved by checkpoint `19af546c069f9dd4e472a58e586124eb363ab927`. The active QA batch is none. The only open product/spec decision is WR-07.

## B+2 fixture fault controls

These commands exist only in the `writer-ready-fixture` backend, which is explicitly enabled by `compose.acceptance.yaml`. The normal `writers-room` stack has neither an active controller route nor a fault mode. Each arm applies to one next `PUT /api/cards/{id}` only: `fault-http-500` returns 500 before persistence; `fault-delay <seconds>` delays the response after persistence; `fault-hold` holds the response after persistence until `fault-release`. `fault-clear` removes an armed fault and releases any held response. Every command prints its JSON status; run `fault-status` before and after a scenario.

Always run `metadata` successfully before browser evidence and use `fault-clear` before fixture cleanup or after an interrupted scenario.

Next step: begin the B+3 recovery batch with fresh matching metadata.
