# Task 6 Review

## Verdict

LOOKS GOOD.

## Scope reviewed

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/renderer/src/utils/selectionPatch.ts`
- `frontend/src/renderer/src/utils/__tests__/selectionPatch.test.ts`
- `backend/app/services/text_patch_service.py`
- `backend/tests/services/test_text_patch_service.py`
- `.github/workflows/task-6-selection-safety.yml`
- Task 6 requirements from `docs/superpowers/plans/2026-07-25-sprint-0-foundation-spike.md`

## Review findings and resolutions

### Resolved P1

- JavaScript and CodeMirror use UTF-16 code-unit offsets while Python normally indexes Unicode code points. A direct Python slice would target the wrong selection after astral characters such as emoji. The backend mirror now validates and slices UTF-16 code units exactly, rejecting ranges that split surrogate pairs.

### Resolved P2

- The initial frontend dependency update did not yet have a synchronized committed lockfile. A one-shot, same-repository workflow generated and committed only `frontend/package-lock.json`; that write-enabled workflow was removed immediately afterward. Permanent CI now uses `npm ci` and verifies the committed lock.
- Deserialized or forged snapshots could bypass capture-time range validation. Both frontend and backend validation paths independently re-check the snapshot range and original selected text before approving a patch.

## Contract verified

- selection capture stores `from`, `to`, original text, and SHA-256 of the complete document;
- document changes after launch produce `conflict`;
- empty replacement produces `conflict`;
- changed selected text produces `conflict`;
- an invalid or forged snapshot produces `conflict`;
- a second application produces `already_applied`;
- Polish diacritics and emoji preserve cross-language selection semantics;
- backend aliases serialize to the frontend field names `from`, `to`, and `documentHash`.

## Hard evidence

GitHub Actions run `30179003465` completed successfully.

- committed npm lock installed with `npm ci`: PASS
- frontend selection safety tests: PASS
- full frontend typecheck: PASS
- backend selection safety tests: PASS

Sprint 0 Foundation run `30179003423` also completed successfully, including frontend build, backend tests, Docker image, and full Compose persistence smoke tests.

## Acceptance boundary

This task proves the pure patch-safety contract. Gate D4 through D6 remain `NOT RUN` until the workflow UI and CodeMirror transaction path exercise accept, reject, duplicate apply, and changed-document conflict end to end.

## Final assessment

Task 6 establishes a strict, cross-language selected-text safety boundary with no open Critical, P1, or P2 findings.