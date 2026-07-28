# WRITER-READY-01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved card-based writer journey: durable complete saves, local crash recovery, safe navigation and export, version history, and operational evidence.

**Architecture:** SQLite and the existing `PUT /api/cards/{card_id}` remain canonical. A focused frontend writer layer owns a complete snapshot, deterministic fingerprinting, a one-card session, local recovery records, and serialized saves; it is enabled only for the two approved writing-card types. The existing export and backup services retain their boundaries, with changes limited to writer-safe data flow and evidence.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest 3/jsdom/fake timers, FastAPI, SQLModel/SQLite, pytest 8, Docker Compose.

## Global Constraints

- SQLite is the sole canonical source for saved writing; local browser recovery records are never canonical.
- Use existing `Card` records and `PUT /api/cards/{card_id}` only. Create no `Scene` entity, table, or migration.
- Enable this contract only for `章节正文` with `CodeMirrorEditor` and `通用文本` with `MarkdownTextEditor`; an editor component alone is insufficient.
- Every writer snapshot contains `projectId`, `cardId`, `title`, `content`, and `contextTemplates.generation` plus `contextTemplates.review`. All writer-visible persisted fields participate in dirty comparison, canonical serialization, fingerprinting, local recovery, all saves, recovery, and version history.
- One atomic writer save sends `title`, `content`, `...buildContextTemplateUpdatePayload(contextTemplates)`, and `needs_confirmation: false` through the existing card PUT. Never issue a separate context-template write and never turn a partial failure into `saved`.
- Local recovery draft scheduling is exactly 3 seconds idle and at most 15 seconds after the last successful local snapshot, or first dirty edit. It makes no backend request.
- Backend autosave is first due exactly 30 seconds after dirty and then every 30 seconds while dirty. It skips an already confirmed, queued, or in-flight equivalent fingerprint.
- The visible Polish **Zapisz** button and `Cmd/Ctrl+S` in both approved editors call the same `writerSession.manualSave()` and have identical error/history behavior.
- A response for an older snapshot cannot mark newer editor content saved. For A → B request → C edit, retain C, retain its local draft, and rebase that record's `savedCardFingerprint` to B.
- Recovery A/B/C is exhaustive and fingerprint-based; timestamps are diagnostic only. Automatic save and technical flush create no version-history entry; manual, confirmed recovered-draft, and confirmed historical-version saves create one non-duplicate entry while preserving the existing 20-entry cap.
- Failed flush blocks card/project navigation, controlled view close, and export. Browser close, kill, crash, and power loss only persist a local `force-close` record and make no backend-flush claim.
- Generated NovelForge TXT/Markdown copy is Polish and has no CJK. Author title/content/quotes/names are unchanged, may use any alphabet, and may be technically escaped only as required by the format. A full-file CJK count of zero applies only to the controlled Polish fixture with no author CJK.
- Do not add multi-session synchronization, concurrency tokens, AI behavior, Visual Language work, Code Wiki work, a general card refactor, unrelated dependency/workflow changes, or private prose in fixtures/evidence.

---

## Repository map and responsibility boundaries

### Existing files to modify

| File | Responsibility |
|---|---|
| `frontend/src/renderer/src/api/cards.ts` | Add a promise-preserving writer PUT wrapper around the existing raw card update; do not route writer saves through error-swallowing store actions. |
| `frontend/src/renderer/src/components/cards/GenericCardEditor.vue` | Create/dispose exactly one session for an eligible active card; route header, recovery, version restore, and adapters through it. |
| `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue` | Implement the common adapter contract and route `Mod-s` to the parent session callback. |
| `frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue` | Implement the same adapter contract and add `Mod-s` routing. |
| `frontend/src/renderer/src/components/common/EditorHeader.vue` | Display `saved`, `dirty`, `saving`, `save-error`, **Zapisz**, and Retry. |
| `frontend/src/renderer/src/components/cards/CardExportDialog.vue` | Await the supplied flush, block download on failure, and display a Polish error. |
| `frontend/src/renderer/src/views/Editor.vue` | Guard card selection, cross-project jump, and export with active-session flush. |
| `frontend/src/renderer/src/App.vue` | Guard controlled dashboard/project changes with active-session flush. |
| `frontend/src/renderer/src/stores/useEditorStore.ts` | Register/unregister the single active writer flush callback. |
| `frontend/src/renderer/src/services/versionService.ts` | Add fingerprint-aware, legacy-compatible version deduplication and reason policy. |
| `frontend/src/renderer/src/i18n/locales/pl.ts` | Add Polish save, recovery, navigation, and export error copy. |
| `backend/app/services/card_export_service.py` | Keep scopes/order/formats and localize only NovelForge-generated TXT/Markdown copy. |
| `backend/tests/services/test_backup_service.py` | Exercise backup/restore against actual NovelForge Project/Card/CardType records. |
| `docs/operations/local-compose.md` | Add the synthetic Compose operational drill without changing product workflow. |

### Files to create

| File | Responsibility |
|---|---|
| `frontend/src/renderer/src/services/isWriterReadyCard.ts` | Strict approved-card predicate. |
| `frontend/src/renderer/src/services/writerSnapshot.ts` | JSON canonicalization, complete snapshots, equality, and fingerprinting. |
| `frontend/src/renderer/src/services/recoveryDraftStore.ts` | Project/card-keyed local recovery record I/O only. |
| `frontend/src/renderer/src/services/writerRecovery.ts` | Pure A/B/C recovery classification. |
| `frontend/src/renderer/src/services/writerSaveCoordinator.ts` | Timers, serialized canonical saves, state machine, rebase, and recovery snapshots. |
| `frontend/src/renderer/src/composables/useWriterCardSession.ts` | Vue lifecycle, atomic PUT construction, active-flush registration, and editor adapter bridge. |
| `frontend/src/renderer/src/components/cards/WriterRecoveryDialog.vue` | Recover / Discard / Cancel UI. |
| `frontend/src/renderer/src/test-support/writerReadyFixtures.ts` | Synthetic Polish project/cards, snapshots, and author-CJK fixture data. |
| `frontend/src/renderer/src/services/__tests__/isWriterReadyCard.test.ts` | Predicate tests. |
| `frontend/src/renderer/src/services/__tests__/writerSnapshot.test.ts` | Canonicalization and complete-field fingerprint tests. |
| `frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts` | Store and fake-timer recovery scheduling tests. |
| `frontend/src/renderer/src/services/__tests__/writerRecovery.test.ts` | A/B/C classification tests. |
| `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts` | Save state, autosave, rebase, and disposal tests. |
| `frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts` | Both editors' manual inputs, UI state, recovery, and history behavior. |
| `frontend/src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts` | Flush-before-export, blocked download, and Polish error tests. |
| `frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts` | Card/project/controlled-close flush guards. |
| `backend/tests/services/test_card_export_service.py` | Scope/order/formats, generated-copy, and author-content export tests. |
| `backend/tests/api/test_cards_writer_ready.py` | Real card PUT/export persistence integration on disposable SQLite. |
| `docs/acceptance/writer-ready-01.md` | Final redacted WR-01…WR-25 evidence record, created only at Closure. |

### Boundaries

- **Policy:** `isWriterReadyCard` decides eligibility from both card-type name and editor component; no other layer infers eligibility from editor name alone.
- **Editor adapter:** both editors expose only `getSnapshot()`, `setSavedBaseline(snapshot)`, and `setSnapshot(snapshot)`. They never independently persist a writer card.
- **Save coordinator:** only `WriterSaveCoordinator` transitions save state, schedules timers, writes recovery records, and invokes its injected canonical save function.
- **Snapshot/fingerprint:** only `writerSnapshot.ts` canonicalizes fields. IDs identify records but do not influence a writer-visible-content fingerprint.
- **Recovery:** store I/O is isolated in `RecoveryDraftStore`; comparison is pure in `writerRecovery.ts`; UI never overwrites SQLite automatically.
- **Navigation/export:** cross-view callers use only `flushActiveWriter(reason)` and proceed solely after `{ ok: true }`.
- **History:** only `recordVersionIfEligible` creates history after coordinator adoption; it computes legacy fingerprints when absent.
- **Fixtures/evidence:** only synthetic data; evidence references redacted artifacts, never database files or private writing.

## Exact interfaces

```ts
// frontend/src/renderer/src/services/isWriterReadyCard.ts
export function isWriterReadyCard(card: CardRead): boolean

// frontend/src/renderer/src/services/writerSnapshot.ts
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export interface WriterContextTemplates { generation: string; review: string }
export interface WriterSnapshot {
  projectId: number
  cardId: number
  title: string
  content: JsonValue
  contextTemplates: WriterContextTemplates
}
export function createWriterSnapshot(card: Pick<CardRead, 'id' | 'project_id' | 'title' | 'content' | 'ai_context_template' | 'ai_context_template_review'>): WriterSnapshot
export function canonicalizeJson(value: JsonValue): JsonValue
export function canonicalizeWriterSnapshot(snapshot: WriterSnapshot): string
export function fingerprintWriterSnapshot(snapshot: WriterSnapshot): string
export function snapshotsEqual(left: WriterSnapshot, right: WriterSnapshot): boolean

// frontend/src/renderer/src/services/recoveryDraftStore.ts
export type RecoveryDraftReason = 'local-idle' | 'failed-save' | 'network-error' | 'force-close'
export interface RecoveryDraftRecord extends WriterSnapshot {
  savedCardFingerprint: string
  draftFingerprint: string
  capturedAt: string
  reason: RecoveryDraftReason
}
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
export type WriterFlushReason = 'manual' | 'retry' | 'card-change' | 'project-change' | 'export' | 'controlled-close' | 'recovered-draft' | 'restored-version'
export type WriterHistoryReason = 'manual' | 'recovered-draft' | 'restored-version' | 'autosave' | 'technical-flush'
export interface WriterSaveResult { ok: boolean; snapshot?: WriterSnapshot; error?: Error }
export interface WriterSaveCoordinatorOptions {
  initial: WriterSnapshot
  save: (snapshot: WriterSnapshot) => Promise<WriterSnapshot>
  drafts: RecoveryDraftStore
  now: () => Date
  setTimeoutFn: typeof setTimeout
  clearTimeoutFn: typeof clearTimeout
  onStateChange: (state: WriterSaveState, error: Error | null) => void
  onHistoryEligible: (snapshot: WriterSnapshot, reason: WriterHistoryReason) => void
}
export class WriterSaveCoordinator {
  update(snapshot: WriterSnapshot): void
  manualSave(): Promise<WriterSaveResult>
  retry(): Promise<WriterSaveResult>
  flush(reason: WriterFlushReason): Promise<WriterSaveResult>
  persistRecoveryDraft(reason: RecoveryDraftReason): void
  dispose(): void
}

// frontend/src/renderer/src/composables/useWriterCardSession.ts
export interface WriterEditorAdapter {
  getSnapshot(): WriterSnapshot
  setSavedBaseline(snapshot: WriterSnapshot): void
  setSnapshot(snapshot: WriterSnapshot): void
}
export interface WriterCardSession {
  state: Ref<WriterSaveState>
  error: Ref<Error | null>
  onEditorChange(): void
  manualSave(): Promise<WriterSaveResult>
  retry(): Promise<WriterSaveResult>
  flush(reason: WriterFlushReason): Promise<WriterSaveResult>
  persistRecoveryDraft(reason: RecoveryDraftReason): void
  checkRecovery(canonical: WriterSnapshot): RecoveryComparison | null
  recoverDraft(): void
  discardDraft(): void
  cancelRecovery(): void
  dispose(): void
}
export function useWriterCardSession(card: Ref<CardRead>, adapter: Ref<WriterEditorAdapter | null>): WriterCardSession

// frontend/src/renderer/src/api/cards.ts
export function updateWriterCard(cardId: number, data: CardUpdate): Promise<CardRead>

// frontend/src/renderer/src/services/versionService.ts
export type VersionWriteReason = WriterHistoryReason
export function fingerprintVersionSnapshot(snapshot: CardVersionSnapshot): string
export function recordVersionIfEligible(projectId: number, snapshot: CardVersionSnapshot, reason: VersionWriteReason): boolean

// frontend/src/renderer/src/stores/useEditorStore.ts
export function setActiveWriterFlush(fn: ((reason: WriterFlushReason) => Promise<WriterSaveResult>) | null): void
export function flushActiveWriter(reason: WriterFlushReason): Promise<WriterSaveResult>
```

The session constructs its sole writer request as follows; the promise must reject to the coordinator if the PUT fails:

```ts
const snapshot = adapter.value!.getSnapshot()
const payload: CardUpdate = {
  title: snapshot.title,
  content: snapshot.content,
  ...buildContextTemplateUpdatePayload(snapshot.contextTemplates),
  needs_confirmation: false,
}
return updateWriterCard(snapshot.cardId, payload)
```

## Wave strategy

| Wave | Tasks | Entry criterion | Exit criterion | Allowed areas | Required checks | Review point |
|---|---:|---|---|---|---|---|
| Foundation | 1–2 | clean branch and existing focused tests pass | policy, complete snapshot, fingerprint, local-draft fake timers green | new frontend services/tests | focused Vitest, typecheck, diff check | writer field completeness and timer contract |
| Persistence and recovery | 3–6 | Foundation has zero failures | coordinator/autosave/session/recovery/history tests green | frontend services, API wrapper, adapters, header, recovery UI, tests | focused Vitest, typecheck, diff check | stale response, atomicity, and data-loss review |
| Navigation and export | 7–8 | prior wave has zero failures | guarded navigation and export tests green | Editor/App/store/export/i18n/backend export/tests | Vitest, pytest, typecheck, diff check | failed flush and author-copy review |
| Integration and browser QA | 9–10 | navigation/export wave has zero failures | Compose synthetic fixture, API integration, browser scenarios, and inspected artifacts are PASS | fixtures, API tests, operations/evidence working matrix | focused suites, Compose ready check, browser QA | every operational row observed and recorded |
| Closure | 11–12 | Integration/browser gate has zero FAIL and zero NOT VERIFIED | final regressions and WR-01…WR-25 evidence are PASS | real-model backup test, operational docs, acceptance evidence | targeted suites, Compose restart/restore drill, diff check | READY / NOT READY decision |

Do not enter a later wave while the current wave has a FAIL or NOT VERIFIED result. A defect found in Task 10 requires a separately authorized fix and a repeat of Task 10 before Closure.

## Tasks

### Task 1: Approved writing-card policy and complete deterministic snapshots

**Files:**
- Create: `frontend/src/renderer/src/services/isWriterReadyCard.ts`
- Create: `frontend/src/renderer/src/services/writerSnapshot.ts`
- Test: `frontend/src/renderer/src/services/__tests__/isWriterReadyCard.test.ts`
- Test: `frontend/src/renderer/src/services/__tests__/writerSnapshot.test.ts`

**Interfaces:** Produces `isWriterReadyCard`, `JsonValue`, `WriterContextTemplates`, `WriterSnapshot`, and all `writerSnapshot.ts` functions for Tasks 2–8.

- [ ] **Step 1: Write failing policy and canonicalization tests.**

```ts
it.each([
  ['章节正文', 'CodeMirrorEditor', true],
  ['通用文本', 'MarkdownTextEditor', true],
  ['场景卡', 'CodeMirrorEditor', false],
  ['章节正文', 'MarkdownTextEditor', false],
])('qualifies %s / %s only when explicitly approved', (name, editor, expected) => {
  expect(isWriterReadyCard(cardWith(name, editor))).toBe(expected)
})
it('sorts nested object keys but preserves arrays and null', () => {
  expect(canonicalizeJson({ z: null, a: [{ b: 2, a: 1 }] })).toEqual({ a: [{ a: 1, b: 2 }], z: null })
})
it('changes fingerprint for either context template but not project/card identity', () => {
  expect(fingerprintWriterSnapshot(withGenerationChanged)).not.toBe(fingerprintWriterSnapshot(base))
  expect(fingerprintWriterSnapshot(withOtherIds)).toBe(fingerprintWriterSnapshot(base))
})
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/isWriterReadyCard.test.ts src/renderer/src/services/__tests__/writerSnapshot.test.ts`

Expected: FAIL because the policy and snapshot modules do not exist.

- [ ] **Step 3: Implement the policy and canonicalization.**

```ts
export function isWriterReadyCard(card: CardRead): boolean {
  return (card.card_type?.name === '章节正文' && card.card_type?.editor_component === 'CodeMirrorEditor') ||
    (card.card_type?.name === '通用文本' && card.card_type?.editor_component === 'MarkdownTextEditor')
}
export function canonicalizeJson(value: JsonValue): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalizeJson(value[key]!)]))
  throw new TypeError('Writer snapshot accepts JSON-compatible values only')
}
export function canonicalizeWriterSnapshot(snapshot: WriterSnapshot): string {
  return JSON.stringify(canonicalizeJson({ title: snapshot.title, content: snapshot.content, contextTemplates: snapshot.contextTemplates }))
}
```

Build `createWriterSnapshot` from both API template fields, and prove title, content, generation, and review each alter equality/fingerprint.

- [ ] **Step 4: Run GREEN and focused regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/isWriterReadyCard.test.ts src/renderer/src/services/__tests__/writerSnapshot.test.ts`

Expected: PASS for unsupported values, object ordering, arrays, null, IDs excluded, and all complete fields.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/isWriterReadyCard.ts frontend/src/renderer/src/services/writerSnapshot.ts frontend/src/renderer/src/services/__tests__/isWriterReadyCard.test.ts frontend/src/renderer/src/services/__tests__/writerSnapshot.test.ts && git commit -m "feat: define writer card snapshots"`

### Task 2: Local recovery records and exact 3-second/15-second scheduling

**Files:**
- Create: `frontend/src/renderer/src/services/recoveryDraftStore.ts`
- Create: `frontend/src/renderer/src/services/writerSaveCoordinator.ts`
- Test: `frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`

**Interfaces:** Consumes Task 1. Produces `RecoveryDraftStore`, `RecoveryDraftRecord`, `RecoveryDraftReason`, and timer portions of `WriterSaveCoordinator` used by Tasks 3–7.

- [ ] **Step 1: Write failing fake-timer/store tests.**

```ts
vi.useFakeTimers()
coordinator.update(withReviewChanged)
await vi.advanceTimersByTimeAsync(2999)
expect(store.read(1, 2)).toBeNull()
await vi.advanceTimersByTimeAsync(1)
expect(store.read(1, 2)?.contextTemplates.review).toBe(withReviewChanged.contextTemplates.review)

for (let elapsed = 0; elapsed < 15; elapsed += 1) {
  coordinator.update(nextCompleteSnapshot(elapsed))
  await vi.advanceTimersByTimeAsync(1000)
}
expect(store.read(1, 2)?.draftFingerprint).toBe(fingerprintWriterSnapshot(nextCompleteSnapshot(14)))
expect(save).not.toHaveBeenCalled()
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`

Expected: FAIL because the local store and scheduler do not exist.

- [ ] **Step 3: Implement keyed records and timers.**

```ts
persistRecoveryDraft(reason: RecoveryDraftReason): void {
  const snapshot = this.current
  this.drafts.write({ ...snapshot, savedCardFingerprint: this.confirmedFingerprint, draftFingerprint: fingerprintWriterSnapshot(snapshot), capturedAt: this.now().toISOString(), reason })
}
```

On each dirty update reset only the 3-second idle timer; retain a 15-second max-wait timer measured from the last successful record or the first dirty update. Store title, content, and both templates. A local storage exception leaves memory dirty and reports no canonical success.

- [ ] **Step 4: Run GREEN and timer regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/recoveryDraftStore.test.ts`

Expected: PASS for 3 seconds exactly, first-dirty 15 seconds, continuous typing max-wait, local-only writes, and complete template records.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/recoveryDraftStore.ts frontend/src/renderer/src/services/writerSaveCoordinator.ts frontend/src/renderer/src/services/__tests__/recoveryDraftStore.test.ts && git commit -m "feat: add writer recovery drafts"`

### Task 3: Atomic canonical save coordinator and state machine

**Files:**
- Modify: `frontend/src/renderer/src/api/cards.ts`
- Modify: `frontend/src/renderer/src/services/writerSaveCoordinator.ts`
- Test: `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

**Interfaces:** Consumes Tasks 1–2. Produces the full `WriterSaveCoordinator`, `WriterSaveState`, `WriterSaveResult`, `WriterFlushReason`, and `updateWriterCard` for Tasks 4–8.

- [ ] **Step 1: Write failing atomic-save/state tests.**

```ts
await coordinator.manualSave()
expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: 'T', content: expect.anything(), contextTemplates: { generation: 'G', review: 'R' } }))
expect(states).toEqual(['saving', 'saved'])

save.mockRejectedValueOnce(new Error('template PUT rejected'))
await expect(coordinator.manualSave()).resolves.toMatchObject({ ok: false })
expect(state()).toBe('save-error')
expect(store.read(1, 2)?.contextTemplates).toEqual({ generation: 'G', review: 'R2' })
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Expected: FAIL because canonical save state and rejection handling are incomplete.

- [ ] **Step 3: Implement promise-preserving complete PUT and state transitions.**

```ts
export async function updateWriterCard(cardId: number, data: CardUpdate): Promise<CardRead> {
  const response = await updateCardRaw(cardId, data)
  return response.data
}
async saveLatest(reason: WriterHistoryReason): Promise<WriterSaveResult> {
  const requestSnapshot = this.current
  this.setState('saving', null)
  try { const confirmed = await this.save(requestSnapshot); return this.acknowledge(requestSnapshot, confirmed, reason) }
  catch (error) { this.persistRecoveryDraft('failed-save'); this.setState('save-error', asError(error)); return { ok: false, error: asError(error) } }
}
```

In the session, construct the single `CardUpdate` shown in Exact interfaces with `buildContextTemplateUpdatePayload`; remove the former separate template store write and its catch-and-ignore path. `saved` is legal only if the confirmed request fingerprint equals the current complete snapshot fingerprint.

- [ ] **Step 4: Run GREEN and API wrapper regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Expected: PASS for `saved`, `dirty`, `saving`, `save-error`, template failure retention, and no partially accepted writer save.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/api/cards.ts frontend/src/renderer/src/services/writerSaveCoordinator.ts frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts && git commit -m "feat: coordinate atomic writer saves"`

### Task 4: Guaranteed backend autosave, duplicate suppression, and stale-response rebase

**Files:**
- Modify: `frontend/src/renderer/src/services/writerSaveCoordinator.ts`
- Test: `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

**Interfaces:** Uses Task 3. Produces exact autosave cadence and rebase behavior for Tasks 5–8.

- [ ] **Step 1: Write failing fake-timer/rebase tests.**

```ts
coordinator.update(B)
await vi.advanceTimersByTimeAsync(30_000)
expect(save).toHaveBeenLastCalledWith(B)
coordinator.update(C)
resolveSave(B)
await flushPromises()
expect(state()).toBe('dirty')
expect(store.read(1, 2)).toMatchObject({ savedCardFingerprint: fingerprintWriterSnapshot(B), draftFingerprint: fingerprintWriterSnapshot(C), content: C.content, contextTemplates: C.contextTemplates })
await vi.advanceTimersByTimeAsync(30_000)
expect(save).toHaveBeenLastCalledWith(C)
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Expected: FAIL because autosave cadence and stale-response rebase are absent.

- [ ] **Step 3: Implement cadence, dedupe, and rebase.**

Start the first 30-second timer when the baseline first becomes dirty. After each tick while dirty, enqueue the newest complete snapshot unless its fingerprint is confirmed, queued, or in-flight; schedule the next tick regardless of continued typing. Immediate manual/retry/flush bypass the timer. On B confirmation with current C, keep C dirty, write C as the local record, set only its `savedCardFingerprint` to B's fingerprint, and never call `setSavedBaseline(C)`.

- [ ] **Step 4: Run GREEN and coordinator regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Expected: PASS for first and repeated 30-second saves, no duplicate fingerprint PUT, B→C rebase, and no stale saved state.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/writerSaveCoordinator.ts frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts && git commit -m "feat: guarantee writer autosave cadence"`

### Task 5: One active writer session, common adapters, and both manual-save inputs

**Files:**
- Create: `frontend/src/renderer/src/composables/useWriterCardSession.ts`
- Modify: `frontend/src/renderer/src/components/cards/GenericCardEditor.vue`
- Modify: `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue`
- Modify: `frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue`
- Modify: `frontend/src/renderer/src/components/common/EditorHeader.vue`
- Modify: `frontend/src/renderer/src/i18n/locales/pl.ts`
- Test: `frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

**Interfaces:** Consumes Tasks 1–4. Produces `WriterEditorAdapter`, `WriterCardSession`, and `useWriterCardSession` exactly as declared above.

- [ ] **Step 1: Write failing component/session tests for all four manual inputs.**

```ts
it.each([
  ['CodeMirrorEditor', 'button'], ['CodeMirrorEditor', 'Mod-s'],
  ['MarkdownTextEditor', 'button'], ['MarkdownTextEditor', 'Mod-s'],
])('%s %s calls the same manualSave command', async (editor, input) => {
  await triggerSave(wrapperFor(editor), input)
  expect(writerSession.manualSave).toHaveBeenCalledTimes(1)
})
it('shows the same save error and history reason for every manual input', async () => {
  await triggerSave(failingWriter, 'Mod-s')
  expect(writerSession.error.value?.message).toBe('PUT failed')
  expect(recordVersionIfEligible).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Expected: FAIL because supported sessions/adapters and Markdown `Mod-s` routing do not exist.

- [ ] **Step 3: Implement the session and adapters.**

```ts
function handleHeaderSave(): Promise<WriterSaveResult> { return writerSession.manualSave() }
function handleEditorManualSave(): Promise<WriterSaveResult> { return writerSession.manualSave() }
defineExpose({ getSnapshot, setSavedBaseline, setSnapshot })
```

Create a session only when `isWriterReadyCard(card)` is true. Its `getSnapshot()` obtains the complete title/content/template snapshot. Both editor key handlers emit the same parent callback; neither invokes a direct card store save. Header **Zapisz** and both editor shortcuts use `writerSession.manualSave()` with the coordinator's `manual` history reason. Expose Retry and all four save states with Polish copy.

- [ ] **Step 4: Run GREEN and typecheck.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Run: `npm --prefix frontend run typecheck`

Expected: PASS for each button/shortcut-editor pair, identical error behavior, `manual` history eligibility, and adapter names.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/composables/useWriterCardSession.ts frontend/src/renderer/src/components/cards/GenericCardEditor.vue frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue frontend/src/renderer/src/components/common/EditorHeader.vue frontend/src/renderer/src/i18n/locales/pl.ts frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts && git commit -m "feat: unify writer manual save controls"`

### Task 6: Recovery A/B/C, session disposal, and legacy-aware version history

**Files:**
- Create: `frontend/src/renderer/src/services/writerRecovery.ts`
- Create: `frontend/src/renderer/src/components/cards/WriterRecoveryDialog.vue`
- Modify: `frontend/src/renderer/src/composables/useWriterCardSession.ts`
- Modify: `frontend/src/renderer/src/stores/useEditorStore.ts`
- Modify: `frontend/src/renderer/src/services/versionService.ts`
- Test: `frontend/src/renderer/src/services/__tests__/writerRecovery.test.ts`
- Test: `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`
- Test: `frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

**Interfaces:** Consumes Tasks 1–5. Produces `compareRecoveryDraft`, recovery UI, lifecycle cleanup, `setActiveWriterFlush`, and legacy-safe version history for Tasks 7–8.

- [ ] **Step 1: Write failing recovery, lifecycle, and legacy history tests.**

```ts
expect(compareRecoveryDraft(draftEqualCanonical, canonical).kind).toBe('redundant')
expect(compareRecoveryDraft(draftWithSavedBaseCanonical, canonical).kind).toBe('ordinary')
expect(compareRecoveryDraft({ ...draft, savedCardFingerprint: draft.draftFingerprint }, canonical).kind).toBe('conflict')
expect(compareRecoveryDraft(allThreeDifferent, canonical).kind).toBe('conflict')
expect(recordVersionIfEligible(1, legacyVersionWithoutFingerprint, 'manual')).toBe(false)

session.dispose()
await vi.advanceTimersByTimeAsync(30_000)
expect(save).not.toHaveBeenCalled()
resolveOldRequest()
expect(newSession.state.value).not.toBe('saved')
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerRecovery.test.ts src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Expected: FAIL because recovery classification, disposal isolation, and legacy deduplication are incomplete.

- [ ] **Step 3: Implement recovery, lifecycle, and history policy.**

```ts
export function compareRecoveryDraft(draft: RecoveryDraftRecord, canonical: WriterSnapshot): RecoveryComparison {
  const canonicalFingerprint = fingerprintWriterSnapshot(canonical)
  if (draft.draftFingerprint === canonicalFingerprint) return { kind: 'redundant', canonicalFingerprint, draft }
  if (draft.savedCardFingerprint === canonicalFingerprint) return { kind: 'ordinary', canonicalFingerprint, draft }
  return { kind: 'conflict', canonicalFingerprint, draft }
}
function handleBeforeUnload(): void { session.persistRecoveryDraft('force-close') }
function dispose(): void {
  coordinator.dispose(); window.removeEventListener('beforeunload', handleBeforeUnload)
  setActiveWriterFlush(null); disposed = true
}
```

On card ID change, dispose the old session before creating the new one. Clear both timers, unregister the named beforeunload handler and store callback, and use a captured session token so a disposed request response cannot write a recovery record, state, or baseline for a new card. Before unload only writes local `force-close`; it makes no PUT. Recovery B offers Recover/Discard/Cancel: Recover sets the full snapshot dirty without SQLite save, Discard removes only that record, Cancel changes nothing. C shows canonical and local content, changes neither automatically, and keeps SQLite unchanged until a normal save. `fingerprintVersionSnapshot` derives a fingerprint from legacy title/content/both templates; use it when an existing history entry lacks a fingerprint. Only manual/recovered/restored reasons append, and equal fingerprints never duplicate history.

- [ ] **Step 4: Run GREEN and focused regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerRecovery.test.ts src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts`

Expected: PASS for A, B, both C variants, Recover/Discard/Cancel, timer/listener cleanup, old-response isolation, force-close local-only behavior, legacy dedupe/read/restore, and 20-entry retention.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/services/writerRecovery.ts frontend/src/renderer/src/components/cards/WriterRecoveryDialog.vue frontend/src/renderer/src/composables/useWriterCardSession.ts frontend/src/renderer/src/stores/useEditorStore.ts frontend/src/renderer/src/services/versionService.ts frontend/src/renderer/src/services/__tests__/writerRecovery.test.ts frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts frontend/src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts && git commit -m "feat: add writer recovery and history policy"`

### Task 7: Mandatory flush for navigation and controlled close

**Files:**
- Modify: `frontend/src/renderer/src/views/Editor.vue`
- Modify: `frontend/src/renderer/src/App.vue`
- Modify: `frontend/src/renderer/src/stores/useEditorStore.ts`
- Modify: `frontend/src/renderer/src/i18n/locales/pl.ts`
- Test: `frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

**Interfaces:** Consumes `flushActiveWriter(reason)` from Task 6 and passes only `card-change`, `project-change`, or `controlled-close` reasons.

- [ ] **Step 1: Write failing flush-gate tests.**

```ts
flushActiveWriter.mockResolvedValueOnce({ ok: false, error: new Error('offline') })
await clickDifferentCard()
expect(cardStore.setActiveCard).not.toHaveBeenCalled()
expect(screen.getByText('Nie można zmienić sceny: zapis się nie powiódł.')).toBeVisible()

await triggerControlledClose()
expect(flushActiveWriter).toHaveBeenCalledWith('controlled-close')
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

Expected: FAIL because navigation proceeds without an awaited writer flush.

- [ ] **Step 3: Implement guarded operations.**

```ts
async function requireWriterFlush(reason: WriterFlushReason): Promise<boolean> {
  const result = await flushActiveWriter(reason)
  if (result.ok) return true
  showPolishFlushError(reason, result.error)
  return false
}
```

Call this before selecting a card, changing project, returning to the dashboard, and controlled view close. Do not add a backend request to browser unload; Task 6 owns its local-only named listener.

- [ ] **Step 4: Run GREEN and regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

Expected: PASS for successful continuation and failed card/project/controlled-close blocking with no false success claim.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/views/Editor.vue frontend/src/renderer/src/App.vue frontend/src/renderer/src/stores/useEditorStore.ts frontend/src/renderer/src/i18n/locales/pl.ts frontend/src/renderer/src/views/__tests__/Editor.writerReady.test.ts && git commit -m "feat: flush writer before context changes"`

### Task 8: Export flush gate and Polish generated copy

**Files:**
- Modify: `frontend/src/renderer/src/components/cards/CardExportDialog.vue`
- Modify: `frontend/src/renderer/src/views/Editor.vue`
- Modify: `frontend/src/renderer/src/i18n/locales/pl.ts`
- Modify: `backend/app/services/card_export_service.py`
- Test: `frontend/src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts`
- Test: `backend/tests/services/test_card_export_service.py`

**Interfaces:** Consumes Task 7's `flushActiveWriter('export')`; preserves existing export request scopes and formats.

- [ ] **Step 1: Write failing export component and service tests.**

```ts
await wrapper.get('[data-test="card-export-submit"]').trigger('click')
expect(flush).toHaveBeenCalledWith('export')
expect(download).not.toHaveBeenCalled()
expect(wrapper.text()).toContain('Eksport zablokowany: zapis zmian się nie powiódł.')

assert '项目' not in txt_generated_copy
assert '章节' not in markdown_generated_copy
assert author_cjk_title in markdown_with_cjk_author
assert cjk_count(polish_fixture_txt) == 0
```

- [ ] **Step 2: Run RED.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts`

Run: `cd backend && python -m pytest tests/services/test_card_export_service.py -q`

Expected: FAIL because export can start before failed flush and generated labels are not fully Polish.

- [ ] **Step 3: Implement safe export and localization.**

Pass one `beforeExport` callback from `Editor.vue` to `CardExportDialog`; it awaits `flushActiveWriter('export')`, returns false on error, and the dialog never calls download/export API then. Keep this selector and all flush/export tests in `CardExportDialog.writerReady.test.ts`, never in `GenericCardEditor` tests. Change only headers, labels, range names, metadata names, messages, and technical copy owned by NovelForge to Polish. Preserve all author fields byte-for-byte except format-required escaping. Preserve JSON technical field names.

- [ ] **Step 4: Run GREEN and export regression.**

Run: `npm --prefix frontend run test -- src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts`

Run: `cd backend && python -m pytest tests/services/test_card_export_service.py -q`

Expected: PASS for flush-before-export order, blocked download, Polish error, TXT/MD/JSON, every existing scope, deterministic order, generated-copy CJK zero, author CJK preservation, and Polish-fixture full CJK zero.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/components/cards/CardExportDialog.vue frontend/src/renderer/src/views/Editor.vue frontend/src/renderer/src/i18n/locales/pl.ts frontend/src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts backend/app/services/card_export_service.py backend/tests/services/test_card_export_service.py && git commit -m "feat: protect writer exports"`

### Task 9: Synthetic fixture and real card API integration

**Files:**
- Create: `frontend/src/renderer/src/test-support/writerReadyFixtures.ts`
- Create: `backend/tests/api/test_cards_writer_ready.py`
- Modify: `frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

**Interfaces:** Produces reusable synthetic fixture builders and API evidence for Tasks 10–12.

- [ ] **Step 1: Write failing real API persistence tests.**

```py
response = client.put(f'/api/cards/{card.id}', json={
    'title': 'Syntetyczna scena', 'content': {'text': 'Bezpieczny tekst'},
    'ai_context_template': 'Szablon generowania', 'ai_context_template_review': 'Szablon recenzji',
    'needs_confirmation': False,
})
assert response.status_code == 200
assert CardService.get_card(card.id).ai_context_template_review == 'Szablon recenzji'
```

- [ ] **Step 2: Run RED.**

Run: `cd backend && python -m pytest tests/api/test_cards_writer_ready.py -q`

Expected: FAIL because the writer-ready API integration fixture/test does not exist.

- [ ] **Step 3: Create only synthetic fixtures and complete-field integration.**

Build one Polish fixture project with an eligible `章节正文` and `通用文本`, nested/deterministic cards, template variants, and a deliberate author-CJK case. Use the existing test database lifecycle and actual Project/Card/CardType models or existing card API; do not create an artificial writer schema.

- [ ] **Step 4: Run GREEN and frontend fixture regression.**

Run: `cd backend && python -m pytest tests/api/test_cards_writer_ready.py -q`

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts`

Expected: PASS for atomic persisted title/content/both templates and reusable synthetic inputs.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add frontend/src/renderer/src/test-support/writerReadyFixtures.ts backend/tests/api/test_cards_writer_ready.py frontend/src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts && git commit -m "test: add writer ready fixtures"`

### Task 10: Integration and browser-QA gate on Compose synthetic data

**Files:**
- Modify: `docs/operations/local-compose.md`
- Create: `docs/acceptance/writer-ready-01-working-matrix.md`

**Interfaces:** Consumes actual fixture/API behavior from Task 9 and all UI flows from Tasks 1–8. Produces observed, redacted PASS/FAIL/NOT VERIFIED records for Closure.

- [ ] **Step 1: Prepare the failing operational matrix before execution.**

Create rows for every executable WR-01…WR-25 scenario, with columns `row`, `scenario`, `observed result`, `artifact reference`, and `status`. Initial status is `NOT VERIFIED`; do not claim readiness.

- [ ] **Step 2: Start Compose and verify readiness on synthetic data.**

Run: `docker compose up --build -d`

Run: `docker compose ps`

Run: `curl --fail http://127.0.0.1:8080/healthz/ready`

Expected: ready endpoint succeeds before browser observations begin.

- [ ] **Step 3: Execute the browser gate and inspect artifacts.**

Using only the synthetic WRITER-READY fixture, observe project → each approved card → edits → 3-second recovery draft → 30-second autosave → both manual inputs → failed flush guards → controlled close → force-close/reopen recovery A/B/C → version history → all export scopes/formats. Open downloaded TXT/Markdown/JSON files and record content checks, including Polish generated copy/CJK and unchanged author CJK. Record each observation in the working matrix without private prose.

- [ ] **Step 4: Enforce the gate.**

Run: `rg -n "\| (FAIL|NOT VERIFIED) \|" docs/acceptance/writer-ready-01-working-matrix.md`

Expected: no output before entering Closure. Any output stops execution; obtain a separately authorized controlled fix, repeat focused automated tests, and repeat this whole Task 10 gate.

- [ ] **Step 5: Check and commit the operational procedure only after PASS.**

Run: `git diff --check`

Run: `git add docs/operations/local-compose.md docs/acceptance/writer-ready-01-working-matrix.md && git commit -m "docs: add writer ready browser gate"`

### Task 11: Real-model Compose restart and guarded backup/restore evidence

**Files:**
- Modify: `backend/tests/services/test_backup_service.py`
- Modify: `scripts/tests/test-restore-recovery.sh`
- Modify: `docs/operations/local-compose.md`

**Interfaces:** Uses existing `create_backup`, `restore_backup`, `Project`, `Card`, `CardType`, card API, and Compose volumes. It does not use a substitute schema as WR-24 evidence.

- [ ] **Step 1: Write failing real-model backup test.**

```py
project, card = create_writer_ready_project_card(session)
backup = create_backup(real_sqlite_path, backup_dir, label='writer-ready')
client.put(f'/api/cards/{card.id}', json=mutated_complete_writer_payload(card))
restore_backup(backup, real_sqlite_path, force=True)
fresh = client.get(f'/api/cards/{card.id}').json()
assert (fresh['title'], fresh['content'], fresh['ai_context_template'], fresh['ai_context_template_review']) == original_fields
```

- [ ] **Step 2: Run RED.**

Run: `cd backend && python -m pytest tests/services/test_backup_service.py -q`

Expected: FAIL because WR-24 lacks a real Project/Card/CardType backup/restore proof.

- [ ] **Step 3: Implement test-only real-model drill and operation instructions.**

Retain any minimal-table test solely as an isolated backup-service unit test; do not cite it for WR-24. Add the real model/API test above, preserve guarded restore and safety backup behavior, and document `docker compose down` (without `-v`) then `docker compose up -d`. The Compose drill creates/uses the synthetic writer fixture, backs up canonical SQLite, mutates through the actual API/app, restores guarded backup, then fresh-reads/reopens and compares title/content/generation/review exactly.

- [ ] **Step 4: Run GREEN and restart regression.**

Run: `cd backend && python -m pytest tests/services/test_backup_service.py -q`

Run: `bash scripts/tests/test-restore-recovery.sh`

Expected: PASS for real canonical model/API restoration and existing restore safeguards.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add backend/tests/services/test_backup_service.py scripts/tests/test-restore-recovery.sh docs/operations/local-compose.md && git commit -m "test: verify writer ready restore flow"`

### Task 12: Acceptance/evidence closure and READY decision

**Files:**
- Create: `docs/acceptance/writer-ready-01.md`
- Modify: `docs/acceptance/writer-ready-01-working-matrix.md`

**Interfaces:** No runtime interface. Consumes Task 10 observed browser/artifact evidence and Task 11 real-model restart/restore evidence.

- [ ] **Step 1: Write the final evidence template with the required verdict rule.**

```md
| WR row | status | automated evidence | browser/operational evidence | artifact reference |
|---|---|---|---|---|
| WR-01 | NOT VERIFIED |  |  |  |

Verdict: NOT READY whenever any row is FAIL or NOT VERIFIED.
```

- [ ] **Step 2: Run final focused regressions.**

Run: `npm --prefix frontend run test -- src/renderer/src/services/__tests__/isWriterReadyCard.test.ts src/renderer/src/services/__tests__/writerSnapshot.test.ts src/renderer/src/services/__tests__/recoveryDraftStore.test.ts src/renderer/src/services/__tests__/writerRecovery.test.ts src/renderer/src/services/__tests__/writerSaveCoordinator.test.ts src/renderer/src/components/cards/__tests__/GenericCardEditor.writerReady.test.ts src/renderer/src/components/cards/__tests__/CardExportDialog.writerReady.test.ts src/renderer/src/views/__tests__/Editor.writerReady.test.ts`

Run: `npm --prefix frontend run typecheck`

Run: `cd backend && python -m pytest tests/api/test_cards_writer_ready.py tests/services/test_card_export_service.py tests/services/test_backup_service.py -q`

Expected: PASS; any failure returns the work to its owning implementation task and requires a repeat of Task 10 when user-visible behavior changed.

- [ ] **Step 3: Compile approved evidence and make the verdict.**

Copy only PASS observations from Task 10 and Task 11 into the final matrix. Recheck generated TXT/Markdown artifact content, force-close recovery, restart, and real backup/mutate/restore results. Record `READY` only when all WR rows are PASS; otherwise record `NOT READY` and stop.

- [ ] **Step 4: Run final evidence gate.**

Run: `rg -n "\| (FAIL|NOT VERIFIED) \|" docs/acceptance/writer-ready-01.md`

Expected: no output for `READY`; output means `NOT READY` and no delivery claim.

- [ ] **Step 5: Check and commit.**

Run: `git diff --check`

Run: `git add docs/acceptance/writer-ready-01.md docs/acceptance/writer-ready-01-working-matrix.md && git commit -m "docs: close writer ready acceptance evidence"`

## Acceptance Coverage Matrix

| WR row | Implementing task | Unit evidence | Integration evidence | Browser/operational evidence | Final artifact |
|---|---:|---|---|---|---|
| WR-01 | 1, 5, 9 | policy/snapshot tests | real approved-card PUT | project → both writing-card types | final matrix row |
| WR-02 | 1, 3 | complete snapshot tests | title/content/template PUT | writing and dirty UI | final matrix row |
| WR-03 | 2 | fake 3-second timer | local storage record inspection | idle draft observation | final matrix row |
| WR-04 | 2 | fake 15-second max-wait | stored complete record | continuous typing observation | final matrix row |
| WR-05 | 3, 4 | state/30-second tests | canonical PUT response | saved/dirty/saving/error | final matrix row |
| WR-06 | 5 | four manual-input tests | complete PUT request | button and both-editor shortcut | final matrix row |
| WR-07 | 3, 4 | duplicate/stale rebase tests | B→C API sequence | latest text remains dirty | final matrix row |
| WR-08 | 7 | navigation guard tests | flush result propagation | card/project/controlled close | final matrix row |
| WR-09 | 6 | force-close no-PUT test | stored `force-close` record | force-close then reopen | final matrix row |
| WR-10 | 6 | A/B/C comparison tests | full draft comparison | A removal, B prompt, C conflict | final matrix row |
| WR-11 | 6 | Recover/Discard/Cancel tests | no automatic PUT assertion | conscious recovery decision | final matrix row |
| WR-12 | 6 | legacy fingerprint/dedupe tests | version persistence read | history/read/restore | final matrix row |
| WR-13 | 6 | autosave/flush no-history tests | version reason calls | manual/recovered/restored entries | final matrix row |
| WR-14 | 7 | failed project/card flush tests | blocked store/API transition | Polish visible block | final matrix row |
| WR-15 | 8 | dialog flush-before-download test | export endpoint after flush | no old-content export | final matrix row |
| WR-16 | 8 | scope/order tests | all export ranges | inspect TXT/MD/JSON | final matrix row |
| WR-17 | 8 | generated-copy/author tests | service artifact assertions | Polish/CJK artifact inspection | final matrix row |
| WR-18 | 5, 6 | adapter/lifecycle tests | session token isolation | change card while request pending | final matrix row |
| WR-19 | 5 | CodeMirror button/shortcut tests | manual API requests | CodeMirror manual saves | final matrix row |
| WR-20 | 5 | Markdown button/shortcut tests | manual API requests | Markdown manual saves | final matrix row |
| WR-21 | 9, 10 | fixture tests | real card API fixture | reopen exact canonical/recovered content | final matrix row |
| WR-22 | 10 | matrix gate check | Compose readiness | browser QA on synthetic fixture | working and final matrices |
| WR-23 | 11 | existing restore safeguard test | Compose down/up persistence | restart/reopen synthetic card | final matrix row |
| WR-24 | 11 | real Project/Card/CardType backup test | backup → mutate API → restore fresh GET | guarded restore/reopen drill | final matrix row |
| WR-25 | 12 | final no-FAIL/no-unverified scan | final targeted suites | evidence review | `docs/acceptance/writer-ready-01.md` |

## Plan self-review checklist

- [ ] Every writer-visible persisted field is present in `WriterSnapshot`, one atomic PUT, recovery records, comparison, and history fingerprinting.
- [ ] The strict card predicate checks both approved type and editor, and no other type becomes eligible from editor component alone.
- [ ] `getSnapshot`, `setSavedBaseline`, and `setSnapshot` are the only adapter names in interfaces, tasks, pseudocode, and tests.
- [ ] Both editors route button and `Cmd/Ctrl+S` input to the same `writerSession.manualSave()` with identical error/history rules.
- [ ] Every session listener is named and removed; disposal clears local/autosave timers, unregisters active flush, and isolates late responses from a new card.
- [ ] `canonicalizeJson` fully defines recursive object ordering, array retention, primitive/null retention, and rejection of non-JSON values.
- [ ] Legacy version entries without a fingerprint are fingerprinted from title/content/generation/review before deduplication and remain readable/restorable.
- [ ] Task 8 completes automatic export implementation/tests; Task 10 performs actual Compose/browser/artifact QA before Closure.
- [ ] WR-24 uses real NovelForge models or the real API, never only an arbitrary SQLite table.
- [ ] Every WR-01…WR-25 row has an implementation owner, unit evidence, integration evidence, browser/operational evidence, and a final artifact.
- [ ] No scope includes VL work, AI work, Code Wiki, multi-session concurrency, a scene model, unrelated refactoring, dependencies, or workflow changes.
- [ ] Run before plan delivery: `git diff --check`, `rg -n -i 'T[B]D|TO[D]O|placeh[older]' docs/superpowers/plans/2026-07-28-writer-ready-01.md`, and `git diff --name-only`.

## DONE criterion

This plan is implementation-ready only when it remains the sole changed file, every named interface and command maps to an existing repository location or an explicitly marked Create file, each task has a RED → GREEN → regression → `git diff --check` → commit gate, and the Acceptance Coverage Matrix assigns all WR-01…WR-25 rows. The implemented feature is READY only when Task 12 records zero FAIL and zero NOT VERIFIED rows; otherwise the verdict is NOT READY.

## Out of Scope

- A new Scene model, table, schema migration, or card-system redesign.
- Multi-tab/window/device/client synchronization, optimistic concurrency, revision tokens, and conflict handling between separate sessions.
- VL-02, VL-03, Visual Language redesign, new AI features, Code Wiki, unrelated backend/frontend changes, CI/workflow changes, and dependency changes.
- Treating SQLite backup/restore as recovery for unsaved browser text.
