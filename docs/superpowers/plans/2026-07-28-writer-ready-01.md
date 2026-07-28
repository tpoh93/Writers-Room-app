# WRITER-READY-01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing card-based writer journey durable, recoverable, and export-safe without changing the SQLite card schema or introducing a `Scene` domain model.

**Architecture:** Keep `Card` and `PUT /api/cards/{card_id}` as the canonical persistence path. Add a focused frontend writer layer: deterministic snapshots, local recovery storage, one save coordinator, and a session adapter used by `GenericCardEditor`, both text editors, navigation, and export. Keep formatting and deterministic ordering in the existing backend `CardExportService`.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest 3 with jsdom/fake timers, FastAPI, SQLModel/SQLite, pytest 8, Docker Compose.

## Global Constraints

- SQLite remains the canonical source of truth for saved writing; browser recovery data is never canonical.
- Use only existing `Card` records and `PUT /api/cards/{card_id}`; create no `Scene` table, entity, or migration.
- Apply the contract only to existing `CodeMirrorEditor` and `MarkdownTextEditor` writing cards; `SceneCard` remains a reference card.
- A local recovery record uses `nf:v1:writer-recovery:{projectId}:{cardId}`, never makes a backend request, writes at exactly 3 seconds idle and at most 15 seconds after the prior successful local snapshot or first dirty edit.
- Backend autosave first runs at 30 seconds dirty and then every 30 seconds while dirty; it skips confirmed, queued, and in-flight equivalent fingerprints.
- A manual save command means either visible Polish **Zapisz** or `Cmd/Ctrl+S`; both use the same coordinator and identical error/history semantics.
- A stale response may not mark newer editor content saved. For A → B save → C edit, retain C and rebase the recovery record base fingerprint to B.
- Recovery cases A/B/C use deterministic writer-visible fingerprints; timestamps are informational only.
- Cases A, B, and C are exhaustive: draft equals canonical is A; otherwise matching saved base is B; otherwise it is C.
- Automatic save and technical flush create no version-history entry. Manual save, confirmed recovered-draft save, and confirmed historical-version save create one non-duplicate entry; retain the existing 20-entry limit.
- Failed flush blocks scene/card navigation, project navigation, controlled view close, and export. Browser-tab close, kill, crash, and power loss rely on the local recovery record and have no backend-flush claim.
- TXT and Markdown generated NovelForge copy is Polish and contains no CJK. Author content is preserved without translation or alphabet filtering and may contain CJK.
- A full-artifact CJK count of zero is required only for the controlled Polish fixture whose author content contains no CJK.
- Do not add multi-session synchronization, concurrency tokens, AI behavior, Visual Language work, Code Wiki work, unrelated dependency changes, or a general card-system refactor.
- Use only synthetic prose in fixtures, screenshots, logs, acceptance records, and pull-request text. Never commit credentials, private writing, database files, backups, raw provider payloads, or sensitive screenshots.

---

## Repository map and responsibility boundaries

### Existing files to modify

| File | Responsibility in this work |
|---|---|
| `frontend/src/renderer/src/components/cards/GenericCardEditor.vue` | Own one writer session per active supported writing card; route header Save, recovery decisions, version restore, and editor adapter events through it. |
| `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue` | Expose the current writer snapshot and apply a session-provided saved baseline; route `Mod-s` to the parent manual save command. |
| `frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue` | Provide the same snapshot/baseline adapter contract as CodeMirror. |
| `frontend/src/renderer/src/components/common/EditorHeader.vue` | Render `saved`, `dirty`, `saving`, and `save-error`; expose Retry beside the existing visible **Zapisz** control. |
| `frontend/src/renderer/src/components/cards/CardExportDialog.vue` | Await a supplied flush callback before calling the existing export API; keep the dialog open with a Polish error on failure. |
| `frontend/src/renderer/src/views/Editor.vue` | Flush active writer work before card selection, cross-project jumps, and opening export; pass the export guard to the dialog. |
| `frontend/src/renderer/src/App.vue` | Flush before controlled return to dashboard and before selecting another project. |
| `frontend/src/renderer/src/stores/useEditorStore.ts` | Hold the active writer-session flush registration, following the existing active-chapter registration pattern. |
| `frontend/src/renderer/src/services/versionService.ts` | Preserve 20-entry storage while making history creation reason-aware and fingerprint-deduplicated. |
| `frontend/src/renderer/src/i18n/locales/pl.ts` | Add Polish writer-save, recovery, flush, and export error labels. |
| `backend/app/services/card_export_service.py` | Keep current scopes/order and replace generated TXT/Markdown labels with Polish copy without touching author fields. |

### Files to create

| File | Responsibility |
|---|---|
| `frontend/src/renderer/src/services/writerSnapshot.ts` | Deterministic writer-visible snapshot canonicalization and fingerprinting. |
| `frontend/src/renderer/src/services/recoveryDraftStore.ts` | Project/card-keyed local recovery records only. |
| `frontend/src/renderer/src/services/writerRecovery.ts` | Pure recovery A/B/C comparison and result types. |
| `frontend/src/renderer/src/services/writerSaveCoordinator.ts` | Per-card save state machine, manual save, autosave, retry, flush, and stale-response rebase. |
| `frontend/src/renderer/src/composables/useWriterCardSession.ts` | Vue adapter between supported editor snapshots, coordinator, recovery store, header, and lifecycle registration. |
| `frontend/src/renderer/src/components/cards/WriterRecoveryDialog.vue` | Explicit Recover / Discard / Cancel UI for cases B and C. |
| `frontend/src/renderer/src/services/__tests__/writerSnapshot.test.ts` | Unit tests for canonical serialization and deterministic fingerprints. |
| `frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts` | Fake-timer and local-storage tests for 3-second/15-second records. |
| `frontend/src/renderer/src/services/__tests__/writerRecovery.test.ts` | Exhaustive case A/B/C and rebase classification tests. |
| `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts` | Fake-clock state, autosave, duplicate suppression, stale response, flush, and history-reason tests. |
| `frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts` | Manual-save controls, UI states, recovery decision, and version-policy component tests. |
| `frontend/src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts` | Flush-before-export and blocked-download component tests. |
| `frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts` | Card/project navigation and controlled-close flush integration tests. |
| `backend/tests/services/test_card_export_service.py` | Scope/order/format and generated-copy versus author-content export tests. |
| `backend/tests/api/test_cards_writer_ready.py` | Existing card API persistence and export endpoint integration tests using a disposable SQLite path. |
| `frontend/src/renderer/src/test-support/writerReadyFixtures.ts` | Disposable Polish project/card, canonical/draft, and CJK-author fixture builders. |
| `docs/acceptance/writer-ready-01.md` | Final WR-01…WR-25 evidence record, created only in the closure task. |

### Boundary rules

- **Editor adapter:** `useWriterCardSession` receives current data from `CodeMirrorEditor` or `MarkdownTextEditor`; editors do not call `cardStore.modifyCard` for writer saves after this work.
- **Save coordinator:** only `WriterSaveCoordinator` calls its injected `save(snapshot)` function and decides `saved`, `dirty`, `saving`, or `save-error`.
- **Fingerprint:** only `writerSnapshot.ts` canonicalizes writer-visible fields; version metadata, timers, and timestamps never enter a fingerprint.
- **Recovery storage/comparison:** `RecoveryDraftStore` owns localStorage I/O; `writerRecovery.ts` remains pure and contains no Vue, API, or storage access.
- **Navigation/flush:** `useEditorStore.flushActiveWriter()` is the sole cross-view entry point; callers may continue only after it resolves `{ ok: true }`.
- **History:** `versionService.ts` receives a reason; no caller may append history directly after coordinator adoption.
- **Export:** frontend flushes before the existing endpoint; backend remains responsible for deterministic card order and generated artifact copy.
- **Fixtures/evidence:** fixtures are code/test support; the final evidence document records observed results and never contains private data.

## Exact interfaces

```ts
// frontend/src/renderer/src/services/writerSnapshot.ts
export interface WriterSnapshot { projectId: number; cardId: number; title: string; content: Record<string, unknown> }
export function createWriterSnapshot(card: Pick<CardRead, 'id' | 'project_id' | 'title' | 'content'>): WriterSnapshot
export function canonicalizeWriterSnapshot(snapshot: WriterSnapshot): string
export function fingerprintWriterSnapshot(snapshot: WriterSnapshot): string
export function snapshotsEqual(left: WriterSnapshot, right: WriterSnapshot): boolean

// frontend/src/renderer/src/services/recoveryDraftStore.ts
export type RecoveryDraftReason = 'local-idle' | 'failed-save' | 'network-error' | 'controlled-close' | 'export'
export interface RecoveryDraftRecord extends WriterSnapshot { savedCardFingerprint: string; draftFingerprint: string; capturedAt: string; reason: RecoveryDraftReason }
export class RecoveryDraftStore {
  constructor(storage: Storage, now: () => Date)
  key(projectId: number, cardId: number): string
  read(projectId: number, cardId: number): RecoveryDraftRecord | null
  write(record: RecoveryDraftRecord): void
  remove(projectId: number, cardId: number): void
}

// frontend/src/renderer/src/services/writerRecovery.ts
export type RecoveryKind = 'redundant' | 'ordinary' | 'conflict'
export interface RecoveryComparison { kind: RecoveryKind; canonicalFingerprint: string; draft: RecoveryDraftRecord }
export function compareRecoveryDraft(draft: RecoveryDraftRecord, canonical: WriterSnapshot): RecoveryComparison

// frontend/src/renderer/src/services/writerSaveCoordinator.ts
export type WriterSaveState = 'saved' | 'dirty' | 'saving' | 'save-error'
export type WriterSaveReason = 'manual' | 'autosave' | 'retry' | 'flush' | 'recovered-draft' | 'restored-version'
export interface WriterSaveResult { ok: boolean; snapshot?: WriterSnapshot; error?: Error }
export interface WriterSaveCoordinatorOptions { initial: WriterSnapshot; save: (snapshot: WriterSnapshot) => Promise<WriterSnapshot>; drafts: RecoveryDraftStore; now: () => Date; setTimeoutFn: typeof setTimeout; clearTimeoutFn: typeof clearTimeout; onStateChange: (state: WriterSaveState, error?: Error) => void; onHistoryEligible: (snapshot: WriterSnapshot, reason: WriterSaveReason) => void }
export class WriterSaveCoordinator { update(snapshot: WriterSnapshot): void; manualSave(reason?: 'manual' | 'recovered-draft' | 'restored-version'): Promise<WriterSaveResult>; retry(): Promise<WriterSaveResult>; flush(reason: RecoveryDraftReason): Promise<WriterSaveResult>; persistRecoveryDraft(reason: RecoveryDraftReason): void; dispose(): void }

// frontend/src/renderer/src/composables/useWriterCardSession.ts
export interface WriterEditorAdapter { getSnapshot(): WriterSnapshot; setSavedBaseline(snapshot: WriterSnapshot): void; setSnapshot(snapshot: WriterSnapshot): void }
export interface WriterCardSession { state: Ref<WriterSaveState>; error: Ref<Error | null>; onEditorChange(): void; manualSave(): Promise<WriterSaveResult>; retry(): Promise<WriterSaveResult>; flush(reason: RecoveryDraftReason): Promise<WriterSaveResult>; checkRecovery(canonical: WriterSnapshot): RecoveryComparison | null; recoverDraft(): void; discardDraft(): void; cancelRecovery(): void; dispose(): void }
export function useWriterCardSession(card: Ref<CardRead>, adapter: Ref<WriterEditorAdapter | null>): WriterCardSession

// frontend/src/renderer/src/services/versionService.ts
export type VersionWriteReason = 'manual' | 'recovered-draft' | 'restored-version' | 'autosave' | 'flush'
export function recordVersionIfEligible(projectId: number, snapshot: Omit<CardVersionSnapshot, 'id' | 'createdAt'>, reason: VersionWriteReason, fingerprint: string): boolean

// frontend/src/renderer/src/stores/useEditorStore.ts additions
setActiveWriterFlush(fn: ((reason: RecoveryDraftReason) => Promise<WriterSaveResult>) | null): void
flushActiveWriter(reason: RecoveryDraftReason): Promise<WriterSaveResult>
```

## Wave strategy

| Wave | Tasks | Entry criterion | Exit criterion | Allowed areas | Required checks | Review point |
|---|---:|---|---|---|---|---|
| Foundation | 1–2 | `main` clean; existing editor/save tests pass before change | Snapshot and local draft tests are green | new frontend services/tests only | focused Vitest + `git diff --check` | fingerprints and timer semantics |
| Persistence and recovery | 3–5 | Foundation has zero failures | coordinator, autosave, manual save, recovery UI, history tests are green | frontend services, editor adapters, header, versions, tests | focused Vitest plus frontend typecheck | stale-response and data-loss review |
| Navigation and export | 6–8 | persistence/recovery wave green | navigation/export tests and backend export tests are green | Editor/App/export/UI/backend service/tests/i18n | Vitest, pytest, typecheck, `git diff --check` | flush blocking and author-copy review |
| Integration and browser QA | 9–10 | navigation/export wave has zero failures | synthetic runtime proves all executable WR rows | test support, API tests, operations/evidence prep | focused backend/frontend tests, Compose health | fixture and browser-script review |
| Closure | 11–12 | all automated checks green | WR-01…WR-25 evidence is PASS with zero FAIL and zero NOT VERIFIED | acceptance document and evidence scripts only | full targeted suites, Compose/backup operational checks | owner acceptance review |

Do not begin a later wave while the current wave has a FAIL or NOT VERIFIED result.

## Tasks

### Task 1: Deterministic writer snapshots and fingerprints

**Files:**
- Create: `frontend/src/renderer/src/services/writerSnapshot.ts`
- Test: `frontend/src/renderer/src/services/__tests__/writerSnapshot.test.ts`

**Interfaces:** Produces `WriterSnapshot`, `createWriterSnapshot`, `canonicalizeWriterSnapshot`, `fingerprintWriterSnapshot`, and `snapshotsEqual` for Tasks 2–8. Consumes existing `CardRead` only as a type import.

- [ ] **Step 1: Write failing fingerprint tests.**

```ts
it('is stable when JSON key order differs', () => {
  expect(fingerprintWriterSnapshot(a)).toBe(fingerprintWriterSnapshot(b))
})
it('changes when writer-visible title or content changes', () => {
  expect(fingerprintWriterSnapshot(a)).not.toBe(fingerprintWriterSnapshot(changed))
})
```

- [ ] **Step 2: Run the RED test.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSnapshot.test.ts`

Expected: FAIL because `writerSnapshot.ts` does not exist.

- [ ] **Step 3: Implement canonical snapshot construction.**

```ts
export function canonicalizeWriterSnapshot(snapshot: WriterSnapshot): string {
  return JSON.stringify(sortKeys({ title: snapshot.title, content: snapshot.content }))
}
export function fingerprintWriterSnapshot(snapshot: WriterSnapshot): string {
  return canonicalizeWriterSnapshot(snapshot)
}
```

Use the canonical serialization string as the deterministic fingerprint in this first slice; do not add a dependency or a cryptographic API.

- [ ] **Step 4: Run GREEN and regression checks.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSnapshot.test.ts`

Expected: PASS, including timestamp exclusion and semantic key-order equality.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/writerSnapshot.ts frontend/src/renderer/src/services/__tests__/writerSnapshot.test.ts && git commit -m "feat: add deterministic writer snapshots"`

### Task 2: Local recovery-draft storage and exact timers

**Files:**
- Create: `frontend/src/renderer/src/services/recoveryDraftStore.ts`
- Create: `frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`
- Create: `frontend/src/renderer/src/services/writerSaveCoordinator.ts` (timer-capable skeleton expanded in Task 3)

**Interfaces:** Consumes Task 1 snapshots/fingerprints. Produces `RecoveryDraftStore`, `RecoveryDraftRecord`, and timer behavior called by Task 3's `WriterSaveCoordinator`.

- [ ] **Step 1: Write failing fake-timer tests.**

```ts
vi.useFakeTimers()
coordinator.update(snapshotB)
await vi.advanceTimersByTimeAsync(2999)
expect(storage.setItem).not.toHaveBeenCalled()
await vi.advanceTimersByTimeAsync(1)
expect(store.read(1, 2)?.draftFingerprint).toBe(fingerprintWriterSnapshot(snapshotB))

for (let second = 0; second < 15; second += 1) { coordinator.update(nextSnapshot(second)); await vi.advanceTimersByTimeAsync(1000) }
expect(store.read(1, 2)).not.toBeNull()
```

- [ ] **Step 2: Run the RED test.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`

Expected: FAIL because the recovery store and 3-second/15-second scheduler do not exist.

- [ ] **Step 3: Implement storage and scheduling primitives.**

```ts
write(record: RecoveryDraftRecord): void { this.storage.setItem(this.key(record.projectId, record.cardId), JSON.stringify(record)) }
read(projectId: number, cardId: number): RecoveryDraftRecord | null { /* parse only this key; return null on malformed data */ }
persistRecoveryDraft(reason: RecoveryDraftReason): void { /* write newest snapshot; never call save() */ }
```

Maintain a 3,000 ms idle timeout and a 15,000 ms maximum timeout from the last successful local write, or from first dirty when no write exists.

- [ ] **Step 4: Run GREEN and local-storage failure regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`

Expected: PASS; a throwing `Storage.setItem` retains in-memory dirty content and does not call the backend save stub.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/recoveryDraftStore.ts frontend/src/renderer/src/services/writerSaveCoordinator.ts frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts && git commit -m "feat: add writer recovery draft storage"`

### Task 3: Save coordinator state machine and immediate manual save

**Files:**
- Modify: `frontend/src/renderer/src/services/writerSaveCoordinator.ts`
- Create: `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`
- Modify: `frontend/src/renderer/src/stores/useEditorStore.ts`

**Interfaces:** Consumes Tasks 1–2. Produces `WriterSaveCoordinator`, `WriterSaveState`, `WriterSaveResult`, and `useEditorStore.flushActiveWriter()` for Tasks 4–8.

- [ ] **Step 1: Write failing state and manual-save tests.**

```ts
expect(state).toBe('saved')
coordinator.update(snapshotB)
expect(state).toBe('dirty')
await coordinator.manualSave('manual')
expect(save).toHaveBeenCalledWith(snapshotB)
expect(state).toBe('saved')

save.mockRejectedValueOnce(new Error('offline'))
await coordinator.manualSave('manual')
expect(state).toBe('save-error')
expect(drafts.read(1, 2)?.draftFingerprint).toBe(fingerprintWriterSnapshot(snapshotB))
```

- [ ] **Step 2: Run the RED test.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Expected: FAIL because state transitions and immediate save operations are absent.

- [ ] **Step 3: Implement the serialized save path.**

```ts
async manualSave(reason: 'manual' | 'recovered-draft' | 'restored-version' = 'manual') { return this.saveLatest(reason) }
async retry() { return this.saveLatest('retry') }
async flush(reason: RecoveryDraftReason) { return this.saveLatest('flush', reason) }
```

`saveLatest` captures the newest snapshot, sets `saving`, waits for the injected existing-card API adapter, then enters `saved` only if the current fingerprint still equals the acknowledged fingerprint.

- [ ] **Step 4: Register the active flush contract in the existing store.**

```ts
function setActiveWriterFlush(fn: ((reason: RecoveryDraftReason) => Promise<WriterSaveResult>) | null) { activeWriterFlush.value = fn }
async function flushActiveWriter(reason: RecoveryDraftReason): Promise<WriterSaveResult> { return activeWriterFlush.value ? activeWriterFlush.value(reason) : { ok: true } }
```

- [ ] **Step 5: Run GREEN and focused regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Run: `npm --prefix frontend run test -- src/renderer/src/utils/__tests__/selectionPatch.test.ts`

Expected: PASS; retry does not clear a failed draft, and unrelated editor-store behavior remains green.

- [ ] **Step 6: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/writerSaveCoordinator.ts frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts frontend/src/renderer/src/stores/useEditorStore.ts && git commit -m "feat: add writer save coordinator"`

### Task 4: Guaranteed autosave and stale-response rebase

**Files:**
- Modify: `frontend/src/renderer/src/services/writerSaveCoordinator.ts`
- Modify: `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`
- Modify: `frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`

**Interfaces:** Uses Task 3 coordinator. Produces the exact 30-second autosave and A→B→C rebase behavior consumed by Tasks 5 and 7.

- [ ] **Step 1: Write failing fake-clock tests.**

```ts
coordinator.update(B)
await vi.advanceTimersByTimeAsync(30_000)
expect(save).toHaveBeenCalledTimes(1)
coordinator.update(C)
await vi.advanceTimersByTimeAsync(30_000)
expect(save).toHaveBeenLastCalledWith(C)

resolveSaveB(B)
await flushPromises()
expect(coordinator.state).toBe('dirty')
expect(drafts.read(1, 2)).toMatchObject({ savedCardFingerprint: fingerprintWriterSnapshot(B), draftFingerprint: fingerprintWriterSnapshot(C) })
```

- [ ] **Step 2: Run the RED test.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Expected: FAIL because autosave cadence, equivalence suppression, and rebase are not implemented.

- [ ] **Step 3: Implement cadence and stale acknowledgement handling.**

```ts
private scheduleAutosave(): void { /* first due at 30_000; repeat only while dirty */ }
private acknowledge(snapshot: WriterSnapshot): void { /* saved only when current fingerprint equals snapshot; otherwise rebase draft base fingerprint */ }
```

Suppress a request when its fingerprint equals the last confirmed fingerprint or an already queued/in-flight fingerprint. Do not delay `manualSave`, `retry`, or `flush`.

- [ ] **Step 4: Run GREEN and timer regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`

Expected: PASS for first 30 seconds, repeated dirty intervals, no duplicate requests, B confirmation after C, and C reopening against B as ordinary recovery.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/writerSaveCoordinator.ts frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts && git commit -m "feat: schedule writer autosave safely"`

### Task 5: Supported-editor session adapter, header state, and both manual-save inputs

**Files:**
- Create: `frontend/src/renderer/src/composables/useWriterCardSession.ts`
- Modify: `frontend/src/renderer/src/components/cards/GenericCardEditor.vue`
- Modify: `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue`
- Modify: `frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue`
- Modify: `frontend/src/renderer/src/components/common/EditorHeader.vue`
- Modify: `frontend/src/renderer/src/i18n/locales/pl.ts`
- Create: `frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

**Interfaces:** Consumes Tasks 1–4. Produces `WriterEditorAdapter`, `useWriterCardSession`, header state props, and one `manualSave()` used by **Zapisz** and `Mod-s`.

- [ ] **Step 1: Write failing component tests.**

```ts
await wrapper.get('[data-test="writer-save"]').trigger('click')
expect(saveSpy).toHaveBeenCalledTimes(1)
await triggerCodeMirrorModS(wrapper)
expect(saveSpy).toHaveBeenCalledTimes(2)
expect(wrapper.text()).toContain('Niezapisane zmiany')
```

Also assert `Zapisywanie` and a persistent Polish error with Retry after a rejected save.

- [ ] **Step 2: Run the RED test.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Expected: FAIL because neither editor delegates a common writer session.

- [ ] **Step 3: Add adapter methods and wire the parent session.**

```ts
// each supported editor expose
getWriterSnapshot(): WriterSnapshot
setWriterSavedBaseline(snapshot: WriterSnapshot): void
setWriterSnapshot(snapshot: WriterSnapshot): void

// GenericCardEditor
async function handleSave() { await writerSession.manualSave() }
```

Replace direct writer-content calls to `cardStore.modifyCard` in `handleSave` and CodeMirror `Mod-s` with this session. Retain the existing non-writing form editor behavior unchanged.

- [ ] **Step 4: Render required save states and retry.**

```vue
<el-tag :type="writerStatus.type">{{ writerStatus.label }}</el-tag>
<el-button v-if="saveState === 'save-error'" @click="$emit('retry')">{{ t('common.retry') }}</el-button>
```

Add Polish keys for saved, unsaved, saving, save error, recovery actions, and flush-blocked action messages.

- [ ] **Step 5: Run GREEN, typecheck, and localization regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts src/renderer/src/components/__tests__/localization.test.ts`

Run: `npm --prefix frontend run typecheck`

Expected: PASS; button and shortcut share one coordinator, show the same failure state, and no i18n key is rendered.

- [ ] **Step 6: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/composables/useWriterCardSession.ts frontend/src/renderer/src/components/cards/GenericCardEditor.vue frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue frontend/src/renderer/src/components/common/EditorHeader.vue frontend/src/renderer/src/i18n/locales/pl.ts frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts && git commit -m "feat: unify writer manual save controls"`

### Task 6: Recovery comparison, dialog, and version-history policy

**Files:**
- Create: `frontend/src/renderer/src/services/writerRecovery.ts`
- Create: `frontend/src/renderer/src/services/__tests__/writerRecovery.test.ts`
- Create: `frontend/src/renderer/src/components/cards/WriterRecoveryDialog.vue`
- Modify: `frontend/src/renderer/src/components/cards/GenericCardEditor.vue`
- Modify: `frontend/src/renderer/src/services/versionService.ts`
- Modify: `frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

**Interfaces:** Consumes recovery records from Task 2 and session from Task 5. Produces `compareRecoveryDraft`, explicit recovery UI, and `recordVersionIfEligible` for Tasks 7–8.

- [ ] **Step 1: Write failing comparison and version tests.**

```ts
expect(compareRecoveryDraft(redundant, canonical).kind).toBe('redundant')
expect(compareRecoveryDraft(ordinary, canonical).kind).toBe('ordinary')
expect(compareRecoveryDraft({ ...conflict, draftFingerprint: conflict.savedCardFingerprint }, canonical).kind).toBe('conflict')
expect(recordVersionIfEligible(1, snapshot, 'autosave', fingerprint)).toBe(false)
expect(recordVersionIfEligible(1, snapshot, 'manual', fingerprint)).toBe(true)
expect(recordVersionIfEligible(1, snapshot, 'manual', fingerprint)).toBe(false)
```

- [ ] **Step 2: Run the RED tests.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerRecovery.test.ts src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Expected: FAIL because recovery classification/dialog behavior and reason-aware history do not exist.

- [ ] **Step 3: Implement pure A/B/C classification and explicit dialog actions.**

```ts
export function compareRecoveryDraft(draft: RecoveryDraftRecord, canonical: WriterSnapshot): RecoveryComparison {
  if (draft.draftFingerprint === fingerprintWriterSnapshot(canonical)) return { kind: 'redundant', canonicalFingerprint: fingerprintWriterSnapshot(canonical), draft }
  if (draft.savedCardFingerprint === fingerprintWriterSnapshot(canonical)) return { kind: 'ordinary', canonicalFingerprint: fingerprintWriterSnapshot(canonical), draft }
  return { kind: 'conflict', canonicalFingerprint: fingerprintWriterSnapshot(canonical), draft }
}
```

Case A deletes only the matching local key without a dialog. Case B/C show canonical and draft text; Recover loads dirty without SQLite write, Discard removes only the matching key, Cancel changes neither storage nor editor.

- [ ] **Step 4: Apply the history policy.**

```ts
export function recordVersionIfEligible(projectId, snapshot, reason, fingerprint): boolean {
  if (!['manual', 'recovered-draft', 'restored-version'].includes(reason)) return false
  if (latestVersion(projectId, snapshot.cardId)?.fingerprint === fingerprint) return false
  // append, retaining existing 20-entry cap
}
```

Extend `CardVersionSnapshot` with `fingerprint`; old entries without it remain readable.

- [ ] **Step 5: Run GREEN and version regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerRecovery.test.ts src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Expected: PASS for A, B, both C variants, Recover/Discard/Cancel, no autosave/flush history, manual/recovered/restored history, duplicate suppression, and 20-entry retention.

- [ ] **Step 6: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/writerRecovery.ts frontend/src/renderer/src/services/__tests__/writerRecovery.test.ts frontend/src/renderer/src/components/cards/WriterRecoveryDialog.vue frontend/src/renderer/src/components/cards/GenericCardEditor.vue frontend/src/renderer/src/services/versionService.ts frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts && git commit -m "feat: add writer recovery decisions"`

### Task 7: Mandatory flush before card/project navigation and controlled close

**Files:**
- Modify: `frontend/src/renderer/src/views/Editor.vue`
- Modify: `frontend/src/renderer/src/App.vue`
- Modify: `frontend/src/renderer/src/composables/useWriterCardSession.ts`
- Modify: `frontend/src/renderer/src/components/cards/GenericCardEditor.vue`
- Create: `frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

**Interfaces:** Consumes `flushActiveWriter(reason)` from Task 3. Produces guarded card/project/dashboard navigation and force-close local-draft persistence.

- [ ] **Step 1: Write failing navigation tests.**

```ts
flush.mockResolvedValueOnce({ ok: false, error: new Error('offline') })
await wrapper.vm.handleEditCard(22)
expect(cardStore.setActiveCard).not.toHaveBeenCalledWith(22)

flush.mockResolvedValueOnce({ ok: true })
await wrapper.vm.handleEditCard(22)
expect(cardStore.setActiveCard).toHaveBeenCalledWith(22)
```

Cover `handleJumpToCard`, `App.handleProjectSelected`, and `App.handleBackToDashboard` with the same blocked/success behavior.

- [ ] **Step 2: Run the RED test.**

Run: `npm --prefix frontend run test -- src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

Expected: FAIL because current selection and project changes happen immediately.

- [ ] **Step 3: Implement guarded transitions.**

```ts
async function requireWriterFlush(reason: RecoveryDraftReason): Promise<boolean> {
  const result = await editorStore.flushActiveWriter(reason)
  if (!result.ok) ElMessage.error(t('writerReady.flushBlocked'))
  return result.ok
}
```

Call it before `setActiveCard`, `setCurrentProject`, dashboard return, and cross-project jumps. On a failed result keep the current card/project and leave its recovery record intact.

- [ ] **Step 4: Separate controlled and force-close behavior.**

```ts
window.addEventListener('beforeunload', () => writerSession.persistRecoveryDraft('controlled-close'))
```

Do not await or claim backend persistence in `beforeunload`; this is force-close protection. Controlled actions above await `flush('controlled-close')` and may be cancelled on failure.

- [ ] **Step 5: Run GREEN and editor regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/views/__tests__/Editor.writerReady.test.ts src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Expected: PASS for scene/card, project, controlled close, force-close local record, and no false save success.

- [ ] **Step 6: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/views/Editor.vue frontend/src/renderer/src/App.vue frontend/src/renderer/src/composables/useWriterCardSession.ts frontend/src/renderer/src/components/cards/GenericCardEditor.vue frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts && git commit -m "feat: flush writer changes before navigation"`

### Task 8: Export flush gate and Polish generated export copy

**Files:**
- Modify: `frontend/src/renderer/src/components/cards/CardExportDialog.vue`
- Modify: `frontend/src/renderer/src/views/Editor.vue`
- Create: `frontend/src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts`
- Modify: `backend/app/services/card_export_service.py`
- Create: `backend/tests/services/test_card_export_service.py`
- Create: `backend/tests/api/test_cards_writer_ready.py`

**Interfaces:** Consumes Task 3 flush result and existing `exportCardsForProject`. Preserves existing `CardExportRequest`, `CardExportService.export`, all scopes, and formats.

- [ ] **Step 1: Write failing frontend and backend tests.**

```ts
const beforeExport = vi.fn().mockResolvedValue({ ok: false })
await wrapper.get('[data-test="card-export-submit"]').trigger('click')
expect(exportCardsForProject).not.toHaveBeenCalled()
```

```py
assert 'Eksport kart NovelForge' in text
generated = text.replace(author_text, '')
assert not CJK_RE.search(generated)
assert author_text in text
assert cjk_author_text in service.export(project.id, request).content.decode()
```

Define `CJK_RE = re.compile(r'[\u3400-\u9FFF\uF900-\uFAFF]')` at the top of `test_card_export_service.py`.

- [ ] **Step 2: Run the RED tests.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts`

Run: `cd backend && python -m pytest tests/services/test_card_export_service.py -q`

Expected: FAIL because export currently starts without a flush and TXT/Markdown generated labels include Chinese text.

- [ ] **Step 3: Add the frontend gate.**

```ts
const props = defineProps<{ beforeExport?: () => Promise<WriterSaveResult>; /* existing props */ }>()
if (props.beforeExport && !(await props.beforeExport()).ok) { ElMessage.error(t('writerReady.exportBlocked')); return }
```

`Editor.vue` passes `() => editorStore.flushActiveWriter('export')` to the dialog.

- [ ] **Step 4: Localize backend-generated copy while preserving author content.**

Use Polish labels such as `Eksport kart NovelForge`, `Projekt`, `Zakres eksportu`, `Format eksportu`, `Data eksportu`, `Liczba kart`, `Typ`, `Identyfikator`, `Identyfikator rodzica`, and `Data utworzenia`. Do not translate `project.name`, `card.title`, card content, quotations, proper names, or card-type names. Keep JSON technical keys unchanged.

- [ ] **Step 5: Run GREEN across every format and scope.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts`

Run: `cd backend && python -m pytest tests/services/test_card_export_service.py tests/api/test_cards_writer_ready.py -q`

Expected: PASS for all/single/type × txt/md/json, deterministic tree order, failed-flush no-download, zero CJK in generated TXT/Markdown copy, untouched multilingual author content, and full CJK=0 Polish fixture artifacts.

- [ ] **Step 6: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/components/cards/CardExportDialog.vue frontend/src/renderer/src/views/Editor.vue frontend/src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts backend/app/services/card_export_service.py backend/tests/services/test_card_export_service.py backend/tests/api/test_cards_writer_ready.py && git commit -m "feat: protect writer exports"`

### Task 9: Synthetic fixtures and API persistence integration

**Files:**
- Create: `frontend/src/renderer/src/test-support/writerReadyFixtures.ts`
- Modify: `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`
- Modify: `frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts`
- Modify: `backend/tests/api/test_cards_writer_ready.py`

**Interfaces:** Produces `createWriterReadyFixture()` with a Polish project, `Rozdział 1`, nested `Scena 1`, deterministic sibling order, non-writing reference card, canonical A/B/C snapshots, and optional author CJK text.

- [ ] **Step 1: Write failing fixture-shape tests.**

```ts
const fixture = createWriterReadyFixture()
expect(fixture.cards.map(card => card.title)).toEqual(['Rozdział 1', 'Scena 1', 'Scena 2', 'Karta referencyjna'])
expect(fixture.polishAuthorText).not.toMatch(CJK_PATTERN)
```

- [ ] **Step 2: Run the RED test.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

Expected: FAIL because the shared synthetic fixture does not exist.

- [ ] **Step 3: Implement only synthetic fixture builders and disposable SQLite setup.**

```ts
export function createWriterReadyFixture(): WriterReadyFixture { /* fixed ids, Polish prose, A/B/C, deterministic display_order */ }
export const CJK_PATTERN = /[\u3400-\u9FFF\uF900-\uFAFF]/u
```

Backend API tests set `NOVELFORGE_DB_PATH` to pytest `tmp_path / 'writer-ready.db'` before importing `main`, then create only the fixture project/cards.

- [ ] **Step 4: Run GREEN and API persistence checks.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

Run: `cd backend && python -m pytest tests/api/test_cards_writer_ready.py -q`

Expected: PASS for project → writing card → save → fresh API read, with no committed database artifact.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/test-support/writerReadyFixtures.ts frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts backend/tests/api/test_cards_writer_ready.py && git commit -m "test: add writer ready synthetic fixtures"`

### Task 10: Full automated integration gate and browser-QA procedure

**Files:**
- Modify: `docs/operations/local-compose.md`
- Create: `docs/acceptance/writer-ready-01.md` (initial checklist only; final status is written in Task 12)
- Modify: `frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`
- Modify: `backend/tests/services/test_card_export_service.py`

**Interfaces:** No runtime interfaces. Uses all prior fixtures/tests and the existing same-origin Compose workflow.

- [ ] **Step 1: Write failing final-scenario assertions.**

```ts
const beforeExport = vi.fn().mockResolvedValue({ ok: true })
await wrapper.get('[data-test="card-export-submit"]').trigger('click')
expect(beforeExport.mock.invocationCallOrder[0]).toBeLessThan(exportCardsForProject.mock.invocationCallOrder[0])
expect(wrapper.text()).toContain('Nie można wyeksportować: zapis dokumentu się nie powiódł.')
```

```py
assert export_text.count('Eksport kart NovelForge') == 1
assert author_cjk_text in export_text
```

- [ ] **Step 2: Run the RED tests.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Run: `cd backend && python -m pytest tests/services/test_card_export_service.py -q`

Expected: FAIL until the export gate exposes its final Polish failure copy and the test explicitly checks call order.

- [ ] **Step 3: Add the browser-QA procedure to existing Compose operations.**

Document the existing commands exactly: `docker compose up --build -d`, `docker compose ps`, `curl -fsS http://127.0.0.1:8080/healthz/ready`, `docker compose down`, and `docker compose up -d`. Require an isolated synthetic database path, private local screenshots outside Git, and artifact-content inspection for txt/md/json.

- [ ] **Step 4: Execute automated gates, not browser QA.**

Run: `npm --prefix frontend run test`

Run: `npm --prefix frontend run typecheck`

Run: `cd backend && python -m pytest -q`

Expected: PASS. Browser QA remains an execution-phase manual gate using the written procedure.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add docs/operations/local-compose.md docs/acceptance/writer-ready-01.md frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts backend/tests/services/test_card_export_service.py && git commit -m "test: define writer ready acceptance checks"`

### Task 11: Compose restart and guarded backup/restore operational evidence

**Files:**
- Modify: `docs/acceptance/writer-ready-01.md`
- Modify: `docs/operations/local-compose.md`
- Modify: `backend/tests/services/test_backup_service.py`
- Modify: `scripts/tests/test-restore-recovery.sh`

**Interfaces:** Uses existing `create_backup`, `restore_backup`, `scripts/backup.sh`, `scripts/restore.sh`, and named Compose volumes. No product API or schema changes.

- [ ] **Step 1: Write failing operational-test assertions.**

```py
def test_writer_ready_restore_round_trip(tmp_path: Path) -> None:
    db_path = tmp_path / 'writer-ready.db'
    backup_dir = tmp_path / 'backups'
    write_writer_card(db_path, title='Rozdział 1', content='wersja A')
    backup_path = create_backup(db_path, backup_dir, label='writer-ready')
    write_writer_card(db_path, title='Rozdział 1', content='wersja B')
    restore_backup(backup_path, db_path, force=True)
    assert read_writer_card(db_path).content == 'wersja A'
```

Define `write_writer_card(path, title, content)` and `read_writer_card(path)` in this test module using a minimal SQLite table; this preserves the backup service unit boundary without booting FastAPI.

```bash
grep -Fqx "compose up -d backend frontend" "$calls_file"
```

- [ ] **Step 2: Run the RED tests.**

Run: `cd backend && python -m pytest tests/services/test_backup_service.py -q`

Run: `bash scripts/tests/test-restore-recovery.sh`

Expected: FAIL until the writer-card restore scenario and evidence checklist are present.

- [ ] **Step 3: Add the scoped operational checks.**

Use a temporary SQLite path in pytest; prove backup → card mutation → guarded restore returns the backed-up canonical card. Preserve the current safety-backup and restart behavior. In the Compose procedure, use `docker compose down` without `-v`, then `docker compose up -d`, manually reopen the synthetic project/card, and record only redacted results.

- [ ] **Step 4: Run GREEN.**

Run: `cd backend && python -m pytest tests/services/test_backup_service.py -q`

Run: `bash scripts/tests/test-restore-recovery.sh`

Expected: PASS; backup/restore remains separate from unsaved local-draft recovery.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add docs/acceptance/writer-ready-01.md docs/operations/local-compose.md backend/tests/services/test_backup_service.py scripts/tests/test-restore-recovery.sh && git commit -m "test: verify writer ready restore flow"`

### Task 12: WR-01…WR-25 evidence closure

**Files:**
- Modify: `docs/acceptance/writer-ready-01.md`

**Interfaces:** No runtime interface. Consumes all automated output, browser observations, Compose restart evidence, backup/restore evidence, and export artifacts from Tasks 1–11.

- [ ] **Step 1: Create one evidence row per acceptance identifier.**

```markdown
| WR-01 | PASS | synthetic project/card browser recording plus API/SQLite comparison | private evidence reference |
```

Create rows WR-01 through WR-25, each with command or observation, result, artifact location, and reviewer role.

- [ ] **Step 2: Record browser QA with synthetic data only.**

Run: `docker compose up --build -d`

Run: `curl -fsS http://127.0.0.1:8080/healthz/ready`

Expected: ready JSON before browser checks. Record saved/dirty/saving/error, recovery B/C decisions, blocked export, txt/md/json artifact content, force-close recovery, and controlled navigation only after direct observation.

- [ ] **Step 3: Run final automated regressions.**

Run: `npm --prefix frontend run test`

Run: `npm --prefix frontend run typecheck`

Run: `cd backend && python -m pytest -q`

Run: `bash scripts/tests/test-restore-recovery.sh`

Expected: PASS for every command. Do not mark a row PASS from inference.

- [ ] **Step 4: Enforce the acceptance decision.**

```text
READY requires all WR-01…WR-25 = PASS.
Any FAIL or NOT VERIFIED keeps the result NOT READY.
```

Confirm evidence has no credentials, private prose, raw provider content, SQLite files, or backups.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add docs/acceptance/writer-ready-01.md && git commit -m "docs: record writer ready acceptance evidence"`

## Acceptance Coverage Matrix

| Acceptance | Implementation task | Unit test | Integration test | Browser QA / operational evidence | Evidence artifact |
|---|---|---|---|---|---|
| WR-01 | 5, 9 | `GenericCardEditor.writerReady.test.ts` | `test_cards_writer_ready.py` | synthetic project/card selection | `docs/acceptance/writer-ready-01.md` |
| WR-02 | 2 | `recoveryDraftStore.test.ts` fake timers | session persistence path | synthetic idle/continuous typing check | same |
| WR-03 | 4 | `writerSaveCoordinator.test.ts` fake clock | API save call spy | runtime timer observation | same |
| WR-04 | 5 | `GenericCardEditor.writerReady.test.ts` button | existing PUT adapter mock | visible **Zapisz** | same |
| WR-05 | 5 | `GenericCardEditor.writerReady.test.ts` Mod-s | existing PUT adapter mock | keyboard command | same |
| WR-06 | 7 | `Editor.writerReady.test.ts` | card selection with rejected flush | scene/card switch blocked | same |
| WR-07 | 7 | `Editor.writerReady.test.ts` | project selection with rejected flush | project switch blocked | same |
| WR-08 | 7 | session local-record test | no-backend-beforeunload assertion | controlled dashboard return | same |
| WR-09 | 7 | recovery-store persistence test | browser force-close/reopen drill | browser tab/process recovery | same |
| WR-10 | 3 | coordinator rejected-promise test | API timeout mock | Retry state UI | same |
| WR-11 | 3 | coordinator non-success test | API error response test | no false saved UI | same |
| WR-12 | 6 | `writerRecovery.test.ts` no-draft path | fresh API read | reopen canonical card | same |
| WR-13 | 6 | case-A test | matching localStorage key test | no prompt / canonical visible | same |
| WR-14 | 6 | case-B and actions test | recovery session test | Recover/Discard/Cancel | same |
| WR-15 | 6 | both case-C variants test | recovery dialog mount | canonical/draft comparison | same |
| WR-16 | 4, 6 | A→B→C coordinator test | reopen C against B | stale response drill | same |
| WR-17 | 6 | version reason/dedupe test | manual/recovered/restored session saves | version dialog | same |
| WR-18 | 8 | export dialog gate test | `test_card_export_service.py` txt all/single/type | inspect TXT artifact | same |
| WR-19 | 8 | export dialog gate test | service markdown all/single/type | inspect Markdown artifact | same |
| WR-20 | 8 | export dialog gate test | service JSON all/single/type | inspect JSON artifact | same |
| WR-21 | 8, 9 | fixture CJK-pattern test | full artifact CJK scan | Polish fixture download inspection | same |
| WR-22 | 8 | no-download-on-failed-flush test | export endpoint not called | blocked export message | same |
| WR-23 | 11 | backup helper test | Compose data persistence procedure | down/up/reopen | same |
| WR-24 | 11 | `test_backup_service.py` writer card test | `test-restore-recovery.sh` | backup/mutate/restore drill | same |
| WR-25 | 10, 12 | acceptance-row completeness assertion | full frontend/backend suites | final reviewer decision | same |

## Final plan self-review procedure

- Verify every requirement in `docs/superpowers/specs/2026-07-28-writer-ready-01-design.md` is assigned to Tasks 1–12 and every WR-01…WR-25 row above has an owner.
- Verify `WriterSnapshot`, `RecoveryDraftRecord`, `WriterSaveCoordinator`, `WriterCardSession`, `WriterSaveReason`, and `recordVersionIfEligible` names match in every task.
- Run: `rg -n -i 'T[B]D|TO[D]O|placeh[older]' docs/superpowers/plans/2026-07-28-writer-ready-01.md`
- Run: `git diff --check`
- Run: `git status --short`; before staging, the only output must be `?? docs/superpowers/plans/2026-07-28-writer-ready-01.md`.
- Confirm every listed existing file is present before implementation; every other path is explicitly marked Create above.
- Confirm all commands are existing `frontend/package.json` scripts, `pytest` invocations against explicit planned test paths, or documented Compose/restore commands.
- Re-read Tasks 3–8 for data loss: newer C never becomes saved from B, failed save retains the matching recovery record, and failed flush makes no export request.
- Confirm out-of-scope items remain absent: VL-02, VL-03, AI behavior, Code Wiki, scene schema work, multi-session concurrency, dependencies, CI workflows, and general card refactoring.
