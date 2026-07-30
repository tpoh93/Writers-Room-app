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
./scripts/novelforge-acceptance.sh down
```

The runner is the only fixture lifecycle procedure. It loads `compose.yaml` and `compose.acceptance.yaml`, preserves fixture volumes during `down`, and does not operate on the `writers-room` project.

## B+ status

- B+1: COMPLETE — implementation, no-Docker verification, and isolated Compose smoke passed.
- B+2: NOT STARTED — deterministic fault controls require a separate plan.
- B+3: NOT STARTED — matrix reconciliation and batched QA require a separate plan.

Compose smoke: PASS. The current writer-ready working matrix remains the source for matrix classification; do not duplicate its rows here. WR-08 is a historical FAIL resolved by checkpoint `19af546c069f9dd4e472a58e586124eb363ab927`. The active QA batch is none. The only open product/spec decision is WR-07.

Next step: owner review of separate B+2 plan.
