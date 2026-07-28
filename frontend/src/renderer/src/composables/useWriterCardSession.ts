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
  dispose(): void
}

export function useWriterCardSession(card: Ref<CardRead>, adapter: Ref<WriterEditorAdapter | null>): WriterCardSession {
  const state = ref<WriterSaveState>('saved')
  const error = ref<Error | null>(null)
  let coordinator: WriterSaveCoordinator | null = null

  function createCoordinator(): WriterSaveCoordinator | null {
    if (!adapter.value) return null
    coordinator?.dispose()
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
        state.value = nextState
        error.value = nextError
      },
    })
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
    onEditorChange()
    const active = requireCoordinator()
    const result = active ? await active.manualSave() : { ok: false, error: new Error('Writer session is unavailable') }
    if (result.ok && result.snapshot && adapter.value) adapter.value.setSavedBaseline(result.snapshot)
    return result
  }

  async function retry(): Promise<WriterSaveResult> {
    onEditorChange()
    const result = await (requireCoordinator()?.retry() ?? Promise.resolve({ ok: false, error: new Error('Writer session is unavailable') }))
    if (result.ok && result.snapshot && adapter.value) adapter.value.setSavedBaseline(result.snapshot)
    return result
  }

  async function flush(reason: WriterFlushReason): Promise<WriterSaveResult> {
    onEditorChange()
    const result = await (requireCoordinator()?.flush(reason) ?? Promise.resolve({ ok: false, error: new Error('Writer session is unavailable') }))
    if (result.ok && result.snapshot && adapter.value) adapter.value.setSavedBaseline(result.snapshot)
    return result
  }

  function persistRecoveryDraft(reason: RecoveryDraftReason): void {
    onEditorChange()
    requireCoordinator()?.persistRecoveryDraft(reason)
  }

  function dispose(): void {
    coordinator?.dispose()
    coordinator = null
  }

  if (getCurrentInstance()) onBeforeUnmount(dispose)
  return { state, error, onEditorChange, manualSave, retry, flush, persistRecoveryDraft, dispose }
}
