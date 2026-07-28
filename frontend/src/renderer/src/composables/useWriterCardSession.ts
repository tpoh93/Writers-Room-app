import { getCurrentInstance, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { updateWriterCard, type CardRead, type CardUpdate } from '@renderer/api/cards'
import { buildContextTemplateUpdatePayload } from '@renderer/services/contextSlots'
import { RecoveryDraftStore, type RecoveryDraftReason } from '@renderer/services/recoveryDraftStore'
import {
  type WriterFlushReason,
  type WriterSaveResult,
  type WriterSaveState,
  WriterSaveCoordinator,
} from '@renderer/services/writerSaveCoordinator'
import type { WriterSnapshot } from '@renderer/services/writerSnapshot'
import { recordVersionIfEligible } from '@renderer/services/versionService'
import { useEditorStore } from '@renderer/stores/useEditorStore'
import { compareRecoveryDraft, type RecoveryComparison } from '@renderer/services/writerRecovery'

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

export function useWriterCardSession(card: Ref<CardRead>, adapter: Ref<WriterEditorAdapter | null>): WriterCardSession {
  const state = ref<WriterSaveState>('saved')
  const error = ref<Error | null>(null)
  let coordinator: WriterSaveCoordinator | null = null
  let disposed = false
  let generation = 0
  let activeToken = 0
  let registeredFlush: ((reason: WriterFlushReason) => Promise<WriterSaveResult>) | null = null
  let recovery: RecoveryComparison | null = null
  const editorStore = useEditorStore()
  const handleBeforeUnload = () => persistRecoveryDraft('force-close')

  function createCoordinator(): WriterSaveCoordinator | null {
    if (!adapter.value) return null
    coordinator?.dispose()
    disposed = false
    const token = ++generation
    activeToken = token
    coordinator = new WriterSaveCoordinator({
      initial: adapter.value.getSnapshot(),
      drafts: new RecoveryDraftStore(localStorage, () => new Date()),
      now: () => new Date(),
      save: async (snapshot) => {
        const payload: CardUpdate = {
          title: snapshot.title,
          content: snapshot.content as CardUpdate['content'],
          ...buildContextTemplateUpdatePayload(snapshot.contextTemplates),
          needs_confirmation: false,
        }
        const saved = await updateWriterCard(snapshot.cardId, payload)
        return { ...snapshot, title: saved.title, content: (saved.content ?? snapshot.content) as WriterSnapshot['content'] }
      },
      onStateChange: (nextState, nextError) => {
        if (disposed || activeToken !== token) return
        state.value = nextState
        error.value = nextError
      },
      onHistoryEligible: (snapshot, reason) => {
        if (disposed || activeToken !== token) return
        recordVersionIfEligible(snapshot.projectId, {
          cardId: snapshot.cardId,
          projectId: snapshot.projectId,
          title: snapshot.title,
          content: snapshot.content,
          ai_context_template: snapshot.contextTemplates.generation,
          ai_context_template_review: snapshot.contextTemplates.review,
        }, reason)
      },
    })
    registeredFlush = async (reason) => {
      if (disposed || activeToken !== token) return { ok: false, error: new Error('Writer session is disposed') }
      return flush(reason)
    }
    editorStore.setActiveWriterFlush(registeredFlush)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return coordinator
  }

  watch([() => card.value.id, adapter], () => { createCoordinator() }, { immediate: true })

  function requireCoordinator(): WriterSaveCoordinator | null {
    return coordinator ?? createCoordinator()
  }

  function onEditorChange(): void {
    const active = requireCoordinator()
    if (active && adapter.value) active.update(adapter.value.getSnapshot())
  }

  async function manualSave(): Promise<WriterSaveResult> {
    const token = activeToken
    onEditorChange()
    const active = requireCoordinator()
    const result = active ? await active.manualSave() : { ok: false, error: new Error('Writer session is unavailable') }
    if (!disposed && activeToken === token && result.ok && result.snapshot && adapter.value) adapter.value.setSavedBaseline(result.snapshot)
    return result
  }

  async function retry(): Promise<WriterSaveResult> {
    const token = activeToken
    onEditorChange()
    const result = await (requireCoordinator()?.retry() ?? Promise.resolve({ ok: false, error: new Error('Writer session is unavailable') }))
    if (!disposed && activeToken === token && result.ok && result.snapshot && adapter.value) adapter.value.setSavedBaseline(result.snapshot)
    return result
  }

  async function flush(reason: WriterFlushReason): Promise<WriterSaveResult> {
    const token = activeToken
    onEditorChange()
    const result = await (requireCoordinator()?.flush(reason) ?? Promise.resolve({ ok: false, error: new Error('Writer session is unavailable') }))
    if (!disposed && activeToken === token && result.ok && result.snapshot && adapter.value) adapter.value.setSavedBaseline(result.snapshot)
    return result
  }

  function persistRecoveryDraft(reason: RecoveryDraftReason): void {
    onEditorChange()
    requireCoordinator()?.persistRecoveryDraft(reason)
  }

  function checkRecovery(canonical: WriterSnapshot): RecoveryComparison | null {
    const draft = new RecoveryDraftStore(localStorage, () => new Date()).read(canonical.projectId, canonical.cardId)
    if (!draft) return null
    recovery = compareRecoveryDraft(draft, canonical)
    if (recovery.kind === 'redundant') {
      new RecoveryDraftStore(localStorage, () => new Date()).remove(canonical.projectId, canonical.cardId)
      recovery = null
    }
    return recovery
  }

  function recoverDraft(): void {
    if (!recovery || !adapter.value) return
    adapter.value.setSnapshot(recovery.draft)
    requireCoordinator()?.update(adapter.value.getSnapshot())
    recovery = null
  }

  function discardDraft(): void {
    if (!recovery) return
    new RecoveryDraftStore(localStorage, () => new Date()).remove(recovery.draft.projectId, recovery.draft.cardId)
    recovery = null
  }

  function cancelRecovery(): void {}

  function dispose(): void {
    disposed = true
    activeToken = ++generation
    coordinator?.dispose()
    coordinator = null
    window.removeEventListener('beforeunload', handleBeforeUnload)
    editorStore.clearActiveWriterFlush(registeredFlush)
    registeredFlush = null
  }

  if (getCurrentInstance()) onBeforeUnmount(dispose)
  return { state, error, onEditorChange, manualSave, retry, flush, persistRecoveryDraft, checkRecovery, recoverDraft, discardDraft, cancelRecovery, dispose }
}
