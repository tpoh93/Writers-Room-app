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
./scripts/novelforge-acceptance.sh task11-drill
./scripts/novelforge-acceptance.sh down
```

The runner is the only fixture lifecycle procedure. It loads `compose.yaml` and `compose.acceptance.yaml`, preserves fixture volumes during `down`, and does not operate on the `writers-room` project.

## B+ status

- B+1: COMPLETE — implementation, no-Docker verification, and isolated Compose smoke passed.
- B+2: COMPLETE — fixture-only one-shot HTTP 500, response delay, hold/release and clear controls passed no-Docker tests and an isolated Compose smoke. The smoke observed 500 then 200 for successive synthetic writer PUTs, a 0.262 s response for a 0.25 s delay, a visible held request, explicit release, clear, reset and fixture verification.
- B+3: COMPLETE — recovery, failure/export/restart batches used the matching `61f5fa9cf9900cc32eefea87f51abd5bd4ab996d` fixture build. Browser observations, focused Writer Ready tests and the isolated restart are recorded in the working matrix.

## Task closure status

- Task 10: COMPLETE — WR-01–WR-23 PASS.
- Task 11: COMPLETE — matching `401782d` fixture drill made `/backups/novelforge-20260730T125617606144Z-task11.db`, mutated the canonical synthetic writer card, forced guarded restore with safety backup `/data/pre-restore/novelforge-20260730T125620305718Z-pre-restore.db`, force-recreated a fresh backend/frontend, compared the exact four writer fields through a fresh GET, restarted and re-verified the fixture.
- Task 12: COMPLETE — final frontend, backend and harness regressions passed; matching `4465281` fixture smoke confirmed readiness, metadata, idle fault state, seed/verify and safe `down`. Final WR-01–WR-25 verdict is READY in `docs/acceptance/writer-ready-01.md`.

Compose smoke: PASS. The current writer-ready working matrix remains the source for matrix classification; do not duplicate its rows here. WR-08 is a historical FAIL resolved by checkpoint `19af546c069f9dd4e472a58e586124eb363ab927`; B+3 reconciles it to PASS without repeating its already completed browser scenario. The active QA batch is none.

## WR-07 accepted flow

WR-07 does not require a permanent project-switcher inside an active editor. The supported scenario is: a user with a dirty writer takes the supported route to the library/dashboard; the required flush completes before the writer is left; a failed flush blocks that leave; only after a successful leave does the user select another project; the next project opens only after the previous writer flush completed. This is the accepted product decision for the matrix and does not authorize a new in-editor project-switcher UI.

## B+2 fixture fault controls

These commands exist only in the `writer-ready-fixture` backend, which is explicitly enabled by `compose.acceptance.yaml`. The normal `writers-room` stack has neither an active controller route nor a fault mode. Each arm applies to one next `PUT /api/cards/{id}` only: `fault-http-500` returns 500 before persistence; `fault-delay <seconds>` delays the response after persistence; `fault-hold` holds the response after persistence until `fault-release`. `fault-clear` removes an armed fault and releases any held response. Every command prints its JSON status; run `fault-status` before and after a scenario.

Always run `metadata` successfully before browser evidence and use `fault-clear` before fixture cleanup or after an interrupted scenario.

`task11-drill` is the only Task 11 operational procedure. It uses the canonical synthetic seeder IDs, makes an online `/backups` backup, mutates the four writer fields, stops only the fixture backend, performs forced restore with a `/data/pre-restore` safety backup, force-recreates a fresh fixture backend/frontend, compares a fresh GET, restarts both fixture services, and verifies the fixture. It neither addresses `writers-room` nor removes volumes.

Next step: review the draft PR; do not merge without explicit approval.
