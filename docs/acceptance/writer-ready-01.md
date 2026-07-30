# WRITER-READY-01 final acceptance

## Verdict

**READY.** WR-01–WR-25 are PASS. Task 10 completed B+1–B+3, Task 11 completed the real-model guarded restore drill, and Task 12 reran the required automated and fixture gates. The fixture was stopped with normal `down`; its named volumes were preserved.

## Final evidence gate

- Frontend: `npm --prefix frontend test` — 16 files / 96 Vitest tests and 10 `node:test` metadata tests PASS.
- Typecheck: `npm --prefix frontend run typecheck` — PASS.
- Backend: `tests/api/test_cards_writer_ready.py`, `tests/services/test_card_export_service.py`, and `tests/services/test_backup_service.py` — 15 PASS.
- Harness: `test-novelforge-build-meta.sh`, `test-build-meta-nginx.sh`, `test-novelforge-acceptance.sh`, and `test-restore-recovery.sh` — PASS.
- Final fixture smoke: matching `4465281` build metadata, readiness, idle fault status before/after clear, seed/verify, and normal `down` — PASS.

| row | status | automated evidence | browser / operational evidence | artifact reference |
|-----|--------|--------------------|--------------------------------|--------------------|
| WR-01 | PASS | Writer Ready focused suite | Synthetic project/card hierarchy opened in browser | working matrix WR-01 |
| WR-02 | PASS | Recovery draft store tests | Existing fixture smoke captured complete local snapshots | working matrix WR-02 |
| WR-03 | PASS | Save coordinator tests | Existing autosave fixture smoke | working matrix WR-03 |
| WR-04 | PASS | Writer session tests | Visible `Zapisz` PUT evidence | working matrix WR-04 |
| WR-05 | PASS | Writer session tests | Visible Cmd/Ctrl+S PUT evidence | working matrix WR-05 |
| WR-06 | PASS | Editor flush guard tests | Browser card-change success/failure evidence | working matrix WR-06 |
| WR-07 | PASS | `App.writerReady.test.ts` | Accepted guarded leave-to-library flow | control WR-07 decision |
| WR-08 | PASS | Controlled-close regression | Fixed at `19af546` and reconciled in B+3 | working matrix WR-08 |
| WR-09 | PASS | Recovery session regression | Browser recovery dialog for synthetic force-close record | working matrix WR-09 |
| WR-10 | PASS | Save coordinator failure regression | Browser Offline/Retry recovery evidence | working matrix WR-10 |
| WR-11 | PASS | Save/export failure regressions | Metadata-matched fixture one-shot 500 then 200 | B+2/B+3 control evidence |
| WR-12 | PASS | Snapshot baseline regression | Browser reopened canonical seeded card | working matrix WR-12 |
| WR-13 | PASS | Redundant-draft recovery regression | Fixture recovery contract | working matrix WR-13 |
| WR-14 | PASS | Recover/discard/cancel regression | Browser recovery dialog | working matrix WR-14 |
| WR-15 | PASS | Conflict fingerprint regression | Browser no-auto-overwrite dialog | working matrix WR-15 |
| WR-16 | PASS | Delayed-save rebase regression | Fixture delayed writer PUT | B+2/B+3 control evidence |
| WR-17 | PASS | History/deduplication regressions | Writer fixture contract | working matrix WR-17 |
| WR-18 | PASS | Export service tests | Browser TXT artifact inspection | working matrix WR-18 |
| WR-19 | PASS | Export service tests | Browser Markdown artifact inspection | working matrix WR-19 |
| WR-20 | PASS | Export service tests | Browser JSON attachment inspection | working matrix WR-20 |
| WR-21 | PASS | Export CJK scanner tests | TXT/Markdown artifact scans | working matrix WR-21 |
| WR-22 | PASS | Export flush-block regressions | Fixture 500 supports deterministic failure path | working matrix WR-22 |
| WR-23 | PASS | Acceptance runner contract tests | Isolated Compose restart/verify | working matrix WR-23 |
| WR-24 | PASS | Real `Project`/`Card`/`CardType` fresh-engine/client restore test | Fixture backup → four-field mutation → guarded restore → fresh GET → restart/verify | `/backups/novelforge-20260730T125617606144Z-task11.db`; `/data/pre-restore/novelforge-20260730T125620305718Z-pre-restore.db` |
| WR-25 | PASS | Full Task 12 regression gate | Metadata-matched final fixture smoke and document reconciliation | this document; working matrix; control document |

## Consistency and delivery checks

- The working matrix and control document classify WR-01–WR-25 as PASS.
- The Task 11 unit test closes the old TestClient and request sessions, disposes the old engine, asserts the safety backup contains the mutation, then uses a new engine and fresh client to assert the restored four fields.
- The operational drill only addressed `writer-ready-fixture` at `127.0.0.1:18080`; no volume deletion or normal-stack operation occurred.
- Raw test and Compose output remain outside the repository; the references above contain only synthetic fixture identifiers and durable contracts.

Next step: review the draft PR; do not merge without explicit approval.
