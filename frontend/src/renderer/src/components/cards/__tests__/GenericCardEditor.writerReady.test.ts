import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import type { CardRead } from '@renderer/api/cards'
import type { WriterEditorAdapter } from '@renderer/composables/useWriterCardSession'
import type { WriterSnapshot } from '@renderer/services/writerSnapshot'

const { updateWriterCard } = vi.hoisted(() => ({ updateWriterCard: vi.fn() }))
vi.mock('vue-element-plus-x', () => ({ XMarkdown: { template: '<div />' } }))
vi.mock('@renderer/api/schema', () => ({ schemaService: { loadSchemas: vi.fn(), refreshSchemas: vi.fn(), getSchema: vi.fn() } }))
vi.mock('@renderer/api/ai', () => ({ getAIConfigOptions: vi.fn().mockResolvedValue({ llm_configs: [], prompts: [] }) }))
vi.mock('@renderer/api/setting', () => ({ getCardAIParams: vi.fn().mockResolvedValue({}), getCardSchema: vi.fn().mockResolvedValue(null) }))
vi.mock('@renderer/api/cards', async () => {
  const actual = await vi.importActual<typeof import('@renderer/api/cards')>('@renderer/api/cards')
  return { ...actual, updateWriterCard }
})

import { useWriterCardSession } from '@renderer/composables/useWriterCardSession'
import { useEditorStore } from '@renderer/stores/useEditorStore'
import GenericCardEditor from '../GenericCardEditor.vue'
import WriterRecoveryDialog from '../WriterRecoveryDialog.vue'
import { RecoveryDraftStore } from '@renderer/services/recoveryDraftStore'
import { fingerprintWriterSnapshot } from '@renderer/services/writerSnapshot'
import i18n, { elementPlusLocale } from '@renderer/i18n'

const snapshot: WriterSnapshot = {
  projectId: 1,
  cardId: 2,
  title: 'Scena',
  content: { content: 'Tekst' },
  contextTemplates: { generation: 'Generowanie', review: 'Redakcja' },
}

describe('GenericCardEditor writer-ready session', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })
  it.each(['Zapisz + CodeMirror', 'Cmd/Ctrl+S + CodeMirror', 'Zapisz + MarkdownTextEditor', 'Cmd/Ctrl+S + MarkdownTextEditor'])('%s uses one manual save command', async () => {
    updateWriterCard.mockResolvedValueOnce({ id: 2, project_id: 1, title: 'Scena', content: snapshot.content })
    const adapter = ref<WriterEditorAdapter>({
      getSnapshot: () => snapshot,
      setSavedBaseline: vi.fn(),
      setSnapshot: vi.fn(),
    })
    const session = useWriterCardSession(ref({ id: 2, project_id: 1 } as CardRead), adapter)

    await expect(session.manualSave()).resolves.toMatchObject({ ok: true })
    expect(updateWriterCard).toHaveBeenCalledWith(2, expect.objectContaining({
      title: 'Scena',
      content: snapshot.content,
      ai_context_template: 'Generowanie',
      ai_context_template_review: 'Redakcja',
      needs_confirmation: false,
    }))
    expect(adapter.value.setSavedBaseline).toHaveBeenCalledWith(expect.objectContaining(snapshot))
    session.dispose()
  })

  it('isolates a delayed save from a disposed session and preserves the newer flush owner', async () => {
    let resolveOldSave: ((card: Partial<CardRead>) => void) | undefined
    updateWriterCard.mockImplementationOnce(() => new Promise((resolve) => { resolveOldSave = resolve }))
    const A2 = { ...snapshot, content: { content: 'A2' } }
    const adapterA = ref<WriterEditorAdapter>({ getSnapshot: () => A2, setSavedBaseline: vi.fn(), setSnapshot: vi.fn() })
    const sessionA = useWriterCardSession(ref({ id: 2, project_id: 1 } as CardRead), adapterA)
    const pending = sessionA.manualSave()

    const adapterB = ref<WriterEditorAdapter>({
      getSnapshot: () => ({ ...snapshot, cardId: 3, content: { content: 'B' } }),
      setSavedBaseline: vi.fn(),
      setSnapshot: vi.fn(),
    })
    const sessionB = useWriterCardSession(ref({ id: 3, project_id: 1 } as CardRead), adapterB)
    const editorStore = useEditorStore()
    const bFlush = editorStore.activeWriterFlushRef

    sessionA.dispose()
    resolveOldSave?.({ id: 2, project_id: 1, title: 'Scena', content: A2.content })
    await pending
    await Promise.resolve()

    expect(sessionB.state.value).toBe('saved')
    expect(adapterB.value.setSavedBaseline).not.toHaveBeenCalled()
    expect(adapterB.value.setSnapshot).not.toHaveBeenCalled()
    expect(editorStore.activeWriterFlushRef).toBe(bFlush)
    expect(localStorage.getItem('nf:v1:versions:1')).toBeNull()
    sessionB.dispose()
  })

  it('opens recovery UI when a mounted writer card has an ordinary local draft', async () => {
    const draft = { ...snapshot, content: { content: 'Lokalny draft' } }
    new RecoveryDraftStore(localStorage, () => new Date()).write({
      ...draft,
      savedCardFingerprint: fingerprintWriterSnapshot(snapshot),
      draftFingerprint: fingerprintWriterSnapshot(draft),
      capturedAt: new Date().toISOString(),
      reason: 'local-idle',
    })

    const wrapper = shallowMount(GenericCardEditor, {
      props: {
        card: {
          id: 2, project_id: 1, title: 'Scena', content: snapshot.content,
          ai_context_template: 'Generowanie', ai_context_template_review: 'Redakcja',
          card_type: { id: 1, name: '通用文本', editor_component: 'MarkdownTextEditor' },
        } as CardRead,
      },
      global: { plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]] },
    })

    const setupState = (wrapper.vm as any).$.setupState
    setupState.contentEditorRef = {
      getSnapshot: () => snapshot,
      setSavedBaseline: vi.fn(),
      setSnapshot: vi.fn(),
    }
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await flushPromises()
    expect(wrapper.findComponent(WriterRecoveryDialog).exists()).toBe(true)
  })

  it('keeps canonical content for redundant drafts and supports recover, discard, and cancel without a PUT', () => {
    const store = new RecoveryDraftStore(localStorage, () => new Date())
    const adapter = ref<WriterEditorAdapter>({ getSnapshot: () => snapshot, setSavedBaseline: vi.fn(), setSnapshot: vi.fn() })
    const session = useWriterCardSession(ref({ id: 2, project_id: 1 } as CardRead), adapter)
    store.write({ ...snapshot, savedCardFingerprint: fingerprintWriterSnapshot(snapshot), draftFingerprint: fingerprintWriterSnapshot(snapshot), capturedAt: '', reason: 'local-idle' })
    expect(session.checkRecovery(snapshot)).toBeNull()
    expect(store.read(1, 2)).toBeNull()

    const draft = { ...snapshot, title: 'Odzyskana', content: { content: 'Lokalny' }, contextTemplates: { generation: 'G2', review: 'R2' } }
    store.write({ ...draft, savedCardFingerprint: fingerprintWriterSnapshot(snapshot), draftFingerprint: fingerprintWriterSnapshot(draft), capturedAt: '', reason: 'local-idle' })
    expect(session.checkRecovery(snapshot)?.kind).toBe('ordinary')
    session.cancelRecovery()
    expect(store.read(1, 2)?.title).toBe('Odzyskana')
    session.recoverDraft()
    expect(adapter.value.setSnapshot).toHaveBeenCalledWith(expect.objectContaining(draft))
    expect(updateWriterCard).not.toHaveBeenCalled()

    expect(session.checkRecovery(snapshot)?.kind).toBe('ordinary')
    session.discardDraft()
    expect(store.read(1, 2)).toBeNull()
    session.dispose()
  })

  it.each([
    ['same saved base and draft', (draft: WriterSnapshot) => fingerprintWriterSnapshot(draft)],
    ['three distinct fingerprints', () => 'different-saved-base'],
  ])('shows conflict recovery without automatic deletion when %s', (_label, savedFingerprint) => {
    const store = new RecoveryDraftStore(localStorage, () => new Date())
    const draft = { ...snapshot, content: { content: 'Konflikt' } }
    const adapter = ref<WriterEditorAdapter>({ getSnapshot: () => snapshot, setSavedBaseline: vi.fn(), setSnapshot: vi.fn() })
    const session = useWriterCardSession(ref({ id: 2, project_id: 1 } as CardRead), adapter)
    store.write({ ...draft, savedCardFingerprint: savedFingerprint(draft), draftFingerprint: fingerprintWriterSnapshot(draft), capturedAt: '', reason: 'local-idle' })

    expect(session.checkRecovery(snapshot)?.kind).toBe('conflict')
    expect(store.read(1, 2)?.content).toEqual(draft.content)
    expect(updateWriterCard).not.toHaveBeenCalled()
    session.dispose()
  })
})
