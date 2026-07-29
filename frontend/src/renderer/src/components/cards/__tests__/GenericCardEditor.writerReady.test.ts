import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import type { CardRead } from '@renderer/api/cards'
import type { WriterEditorAdapter } from '@renderer/composables/useWriterCardSession'
import type { WriterSnapshot } from '@renderer/services/writerSnapshot'

const { updateWriterCard, getCardsForProject, resolveContentEditor, writerEditorApi } = vi.hoisted(() => ({
  updateWriterCard: vi.fn(),
  getCardsForProject: vi.fn(),
  resolveContentEditor: vi.fn(),
  writerEditorApi: { applyContent: null as null | ((content: string) => void), useRealEditors: false },
}))
vi.mock('vue-element-plus-x', () => ({ XMarkdown: { template: '<div />' } }))
vi.mock('@renderer/api/schema', () => ({ schemaService: { loadSchemas: vi.fn(), refreshSchemas: vi.fn(), getSchema: vi.fn() } }))
vi.mock('@renderer/api/ai', () => ({ getAIConfigOptions: vi.fn().mockResolvedValue({ llm_configs: [], prompts: [] }) }))
vi.mock('@renderer/api/setting', () => ({ getCardAIParams: vi.fn().mockResolvedValue({}), getCardSchema: vi.fn().mockResolvedValue(null) }))
vi.mock('@renderer/api/cards', async () => {
  const actual = await vi.importActual<typeof import('@renderer/api/cards')>('@renderer/api/cards')
  return { ...actual, updateWriterCard, getCardsForProject }
})

vi.mock('@renderer/components/editors/contentEditorRegistry', async () => {
  const { defineComponent, h, ref, watch } = await import('vue')
  const { default: CodeMirrorEditor } = await vi.importActual<typeof import('@renderer/components/editors/CodeMirrorEditor.vue')>('@renderer/components/editors/CodeMirrorEditor.vue')
  const { default: MarkdownTextEditor } = await vi.importActual<typeof import('@renderer/components/editors/MarkdownTextEditor.vue')>('@renderer/components/editors/MarkdownTextEditor.vue')
  const WriterEditorStub = defineComponent({
    name: 'WriterEditorStub',
    props: {
      card: { type: Object, required: true },
      contextTemplates: { type: Object, required: false },
    },
    emits: ['update:dirty', 'manual-save', 'writer-change'],
    setup(props, { emit, expose }) {
      const currentSnapshot = ref({
        projectId: (props.card as any).project_id,
        cardId: (props.card as any).id,
        title: (props.card as any).title,
        content: (props.card as any).content,
        contextTemplates: props.contextTemplates ?? { generation: '', review: '' },
      })
      watch([() => props.card, () => props.contextTemplates], () => {
        currentSnapshot.value = {
          projectId: (props.card as any).project_id,
          cardId: (props.card as any).id,
          title: (props.card as any).title,
          content: (props.card as any).content,
          contextTemplates: props.contextTemplates ?? { generation: '', review: '' },
        }
      }, { deep: true })
      const getSnapshot = () => currentSnapshot.value
      expose({
        getSnapshot,
        setSavedBaseline: () => emit('update:dirty', false),
        setSnapshot: (nextSnapshot: WriterSnapshot) => { currentSnapshot.value = nextSnapshot },
        applyEditorContent: (content: string) => {
          currentSnapshot.value = {
            ...currentSnapshot.value,
            content: { ...currentSnapshot.value.content, content },
          }
          emit('writer-change', currentSnapshot.value)
        },
      })
      writerEditorApi.applyContent = (content: string) => {
        currentSnapshot.value = {
          ...currentSnapshot.value,
          content: { ...currentSnapshot.value.content, content },
        }
        emit('writer-change', currentSnapshot.value)
      }
      return () => h('div', { 'data-test': 'writer-editor-stub' })
    },
  })
  return {
    resolveContentEditor: (editorName: string) => {
      resolveContentEditor(editorName)
      if (writerEditorApi.useRealEditors) {
        return editorName === 'CodeMirrorEditor'
          ? CodeMirrorEditor
          : editorName === 'MarkdownTextEditor'
            ? MarkdownTextEditor
            : null
      }
      return editorName === 'MarkdownTextEditor' || editorName === 'CodeMirrorEditor' ? WriterEditorStub : null
    },
  }
})

import { useWriterCardSession } from '@renderer/composables/useWriterCardSession'
import { useEditorStore } from '@renderer/stores/useEditorStore'
import CodeMirrorEditor from '@renderer/components/editors/CodeMirrorEditor.vue'
import MarkdownTextEditor from '@renderer/components/editors/MarkdownTextEditor.vue'
import GenericCardEditor from '../GenericCardEditor.vue'
import WriterRecoveryDialog from '../WriterRecoveryDialog.vue'
import { RecoveryDraftStore } from '@renderer/services/recoveryDraftStore'
import { fingerprintWriterSnapshot } from '@renderer/services/writerSnapshot'
import { listVersions } from '@renderer/services/versionService'
import i18n, { elementPlusLocale } from '@renderer/i18n'

const snapshot: WriterSnapshot = {
  projectId: 1,
  cardId: 2,
  title: 'Scena',
  content: { content: 'Tekst' },
  contextTemplates: { generation: 'Generowanie', review: 'Redakcja' },
}

const WriterHeaderStateProbe = defineComponent({
  name: 'WriterHeaderStateProbe',
  props: {
    dirty: { type: Boolean, required: true },
    canSave: { type: Boolean, required: true },
  },
  setup(props) {
    return () => h('div', [
      h('span', { 'data-test': 'writer-save-status' }, props.dirty ? 'Niezapisane' : 'Zapisano'),
      h('button', { 'data-test': 'writer-save-button', disabled: !props.canSave }, 'Zapisz'),
    ])
  },
})

async function waitForWriterEditorStub(wrapper: ReturnType<typeof mount>): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await flushPromises()
    await nextTick()
    if (wrapper.find('[data-test="writer-editor-stub"]').exists()) return
  }
  throw new Error('Writer editor stub did not resolve')
}

describe('GenericCardEditor writer-ready session', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    writerEditorApi.applyContent = null
    writerEditorApi.useRealEditors = false
    getCardsForProject.mockResolvedValue([])
    localStorage.clear()
  })

  it.each(['Zapisz + CodeMirror', 'Cmd/Ctrl+S + CodeMirror', 'Zapisz + MarkdownTextEditor', 'Cmd/Ctrl+S + MarkdownTextEditor'])('%s uses one manual save command', async () => {
    const changedSnapshot = { ...snapshot, content: { content: 'Tekst po edycji' } }
    updateWriterCard.mockResolvedValueOnce({ id: 2, project_id: 1, title: 'Scena', content: changedSnapshot.content })
    let currentSnapshot = snapshot
    const adapter = ref<WriterEditorAdapter>({
      getSnapshot: () => currentSnapshot,
      setSavedBaseline: vi.fn(),
      setSnapshot: vi.fn(),
    })
    const session = useWriterCardSession(ref({ id: 2, project_id: 1 } as CardRead), adapter)

    currentSnapshot = changedSnapshot
    session.onEditorChange()
    await expect(session.manualSave()).resolves.toMatchObject({ ok: true })
    expect(updateWriterCard).toHaveBeenCalledWith(2, expect.objectContaining({
      title: 'Scena',
      content: changedSnapshot.content,
      ai_context_template: 'Generowanie',
      ai_context_template_review: 'Redakcja',
      needs_confirmation: false,
    }))
    expect(adapter.value.setSavedBaseline).toHaveBeenCalledWith(expect.objectContaining(changedSnapshot))
    session.dispose()
  })

  it.each(['CodeMirrorEditor', 'MarkdownTextEditor'])('%s forwards each post-edit snapshot to recovery and autosave without manual save', async (editorComponent) => {
    vi.useFakeTimers()
    const changedContent = 'Tekst po zmianie bez ręcznego zapisu'
    updateWriterCard.mockResolvedValueOnce({ id: 2, project_id: 1, title: 'Scena', content: { content: changedContent } })
    const wrapper = mount(GenericCardEditor, {
      props: {
        card: {
          id: 2,
          project_id: 1,
          title: 'Scena',
          content: snapshot.content,
          ai_context_template: 'Generowanie',
          ai_context_template_review: 'Redakcja',
          card_type: {
            id: 1,
            name: editorComponent === 'CodeMirrorEditor' ? '章节正文' : '通用文本',
            editor_component: editorComponent,
          },
        } as CardRead,
      },
      global: {
        plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]],
        stubs: {
          AIPerCardParams: true, CardReferenceSelectorDialog: true, CardVersionsDialog: true,
          ContextDrawer: true, EditorHeader: true, GenerationPanel: true, InitialPromptDialog: true,
          ModelDrivenForm: true, SchemaStudio: true, SectionedForm: true, SimpleMarkdown: true,
        },
      },
    })
    await waitForWriterEditorStub(wrapper)

    expect(writerEditorApi.applyContent).toEqual(expect.any(Function))
    writerEditorApi.applyContent?.(changedContent)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(new RecoveryDraftStore(localStorage, () => new Date()).read(1, 2)).toMatchObject({
      content: { content: changedContent },
      contextTemplates: snapshot.contextTemplates,
      reason: 'local-idle',
    })

    await vi.advanceTimersByTimeAsync(27_000)
    expect(updateWriterCard).toHaveBeenCalledWith(2, expect.objectContaining({
      title: 'Scena',
      content: { content: changedContent },
      ai_context_template: 'Generowanie',
      ai_context_template_review: 'Redakcja',
    }))

    wrapper.unmount()
    vi.useRealTimers()
  })

  it.each([
    ['CodeMirrorEditor', CodeMirrorEditor],
    ['MarkdownTextEditor', MarkdownTextEditor],
  ] as const)('%s emits the complete post-edit writer snapshot', async (_name, Editor) => {
    const card = {
      id: 2,
      project_id: 1,
      title: 'Scena',
      content: { content: 'Tekst' },
      card_type_id: 1,
      created_at: '2026-07-29T00:00:00Z',
      display_order: 0,
      ai_modified: false,
      needs_confirmation: false,
      ai_context_template: 'Generowanie',
      ai_context_template_review: 'Redakcja',
      card_type: {
        id: 1,
        name: _name === 'CodeMirrorEditor' ? '章节正文' : '通用文本',
        editor_component: _name,
        is_ai_enabled: false,
        is_singleton: false,
        built_in: true,
      },
    } as CardRead
    const wrapper = mount(Editor, {
      props: { card, contextTemplates: snapshot.contextTemplates },
      global: { plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]] },
    })
    await flushPromises()
    await nextTick()
    if (_name === 'CodeMirrorEditor') {
      expect(wrapper.find('.cm-content').exists()).toBe(true)
    }

    const changedContent = `Tekst po zmianie ${_name}`
    ;(wrapper.vm as any).setSnapshot({ ...snapshot, content: { content: changedContent } })
    await flushPromises()

    expect(wrapper.emitted('writer-change')?.at(-1)).toEqual([
      expect.objectContaining({ content: expect.objectContaining({ content: changedContent }) }),
    ])
  })

  it.each([
    ['CodeMirrorEditor', CodeMirrorEditor],
    ['MarkdownTextEditor', MarkdownTextEditor],
  ] as const)('%s carries the real post-edit snapshot through GenericCardEditor recovery and autosave', async (editorComponent, Editor) => {
    vi.useFakeTimers()
    writerEditorApi.useRealEditors = true
    const changedContent = `Tekst integracyjny ${editorComponent}`
    updateWriterCard.mockResolvedValueOnce({ id: 2, project_id: 1, title: 'Scena', content: { content: changedContent } })
    const wrapper = mount(GenericCardEditor, {
      props: {
        card: {
          id: 2, project_id: 1, title: 'Scena', content: snapshot.content,
          ai_context_template: 'Generowanie', ai_context_template_review: 'Redakcja',
          card_type: { id: 1, name: editorComponent === 'CodeMirrorEditor' ? '章节正文' : '通用文本', editor_component: editorComponent },
        } as CardRead,
      },
      global: {
        plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]],
        stubs: {
          AIPerCardParams: true, CardReferenceSelectorDialog: true, CardVersionsDialog: true,
          ContextDrawer: true, EditorHeader: true, GenerationPanel: true, InitialPromptDialog: true,
          ModelDrivenForm: true, SchemaStudio: true, SectionedForm: true, SimpleMarkdown: true,
        },
      },
    })
    for (let attempt = 0; attempt < 10 && !wrapper.findComponent(Editor).exists(); attempt += 1) {
      await flushPromises()
      await nextTick()
    }
    const editor = wrapper.findComponent(Editor)
    expect(editor.exists()).toBe(true)
    await nextTick()
    ;(editor.vm as any).setSnapshot({ ...snapshot, content: { content: changedContent } })
    await flushPromises()

    await vi.advanceTimersByTimeAsync(3_000)
    expect(new RecoveryDraftStore(localStorage, () => new Date()).read(1, 2)).toMatchObject({
      content: { content: changedContent },
      contextTemplates: snapshot.contextTemplates,
      reason: 'local-idle',
    })
    await vi.advanceTimersByTimeAsync(27_000)
    expect(updateWriterCard.mock.calls.map(([, payload]) => (payload as any).content)).toEqual([
      expect.objectContaining({ content: changedContent }),
    ])
    expect(updateWriterCard).toHaveBeenCalledWith(2, expect.objectContaining({
      content: expect.objectContaining({ content: changedContent }),
      ai_context_template: 'Generowanie',
      ai_context_template_review: 'Redakcja',
    }))
    wrapper.unmount()
    vi.useRealTimers()
  })

  it.each([
    ['CodeMirrorEditor', CodeMirrorEditor],
    ['MarkdownTextEditor', MarkdownTextEditor],
  ] as const)('%s reconciles the visible saved state and editor baseline after autosave', async (editorComponent, Editor) => {
    vi.useFakeTimers()
    writerEditorApi.useRealEditors = true
    const changedContent = `Tekst po autosave ${editorComponent}`
    updateWriterCard.mockImplementationOnce((_cardId, payload) => Promise.resolve({
      id: 2,
      project_id: 1,
      title: 'Scena',
      content: (payload as { content: WriterSnapshot['content'] }).content,
    }))
    const wrapper = mount(GenericCardEditor, {
      props: {
        card: {
          id: 2, project_id: 1, title: 'Scena', content: snapshot.content,
          ai_context_template: 'Generowanie', ai_context_template_review: 'Redakcja',
          card_type: { id: 1, name: editorComponent === 'CodeMirrorEditor' ? '章节正文' : '通用文本', editor_component: editorComponent },
        } as CardRead,
      },
      global: {
        plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]],
        stubs: {
          AIPerCardParams: true, CardReferenceSelectorDialog: true, CardVersionsDialog: true,
          ContextDrawer: true, EditorHeader: WriterHeaderStateProbe, GenerationPanel: true, InitialPromptDialog: true,
          ModelDrivenForm: true, SchemaStudio: true, SectionedForm: true, SimpleMarkdown: true,
        },
      },
    })
    for (let attempt = 0; attempt < 10 && !wrapper.findComponent(Editor).exists(); attempt += 1) {
      await flushPromises()
      await nextTick()
    }
    const editor = wrapper.findComponent(Editor)
    expect(editor.exists()).toBe(true)
    await nextTick()

    ;(editor.vm as any).setSnapshot({ ...snapshot, content: { content: changedContent } })
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-test="writer-save-status"]').text()).toBe('Niezapisane')
    expect(wrapper.get('[data-test="writer-save-button"]').attributes('disabled')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(3_000)
    await vi.advanceTimersByTimeAsync(27_000)
    await flushPromises()
    await nextTick()

    expect(updateWriterCard).toHaveBeenCalledWith(2, expect.objectContaining({
      content: expect.objectContaining({ content: changedContent }),
      ai_context_template: 'Generowanie',
      ai_context_template_review: 'Redakcja',
    }))
    expect((editor.vm as any).getSnapshot()).toMatchObject({ content: expect.objectContaining({ content: changedContent }) })
    const statusAfterAutosave = wrapper.get('[data-test="writer-save-status"]').text()
    const saveDisabledAfterAutosave = wrapper.get('[data-test="writer-save-button"]').attributes('disabled')

    ;(editor.vm as any).setSnapshot({ ...snapshot, content: { content: `${changedContent} ponownie` } })
    await flushPromises()
    await nextTick()
    const statusAfterNewEdit = wrapper.get('[data-test="writer-save-status"]').text()
    const saveDisabledAfterNewEdit = wrapper.get('[data-test="writer-save-button"]').attributes('disabled')

    wrapper.unmount()
    vi.useRealTimers()
    expect(statusAfterAutosave).toBe('Zapisano')
    expect(saveDisabledAfterAutosave).toBeDefined()
    expect(statusAfterNewEdit).toBe('Niezapisane')
    expect(saveDisabledAfterNewEdit).toBeUndefined()
  })

  it.each(['CodeMirrorEditor', 'MarkdownTextEditor'])('%s keeps newer C visibly dirty when delayed B confirms', async () => {
    let resolveB: ((card: Partial<CardRead>) => void) | undefined
    const B = { ...snapshot, content: { content: 'B' }, contextTemplates: { generation: 'G-B', review: 'R-B' } }
    const C = { ...B, content: { content: 'C' }, contextTemplates: { generation: 'G-C', review: 'R-C' } }
    let current = snapshot
    const setSavedBaseline = vi.fn()
    updateWriterCard
      .mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve }))
      .mockResolvedValueOnce({ id: 2, project_id: 1, title: C.title, content: C.content })
    const adapter = ref<WriterEditorAdapter>({
      getSnapshot: () => current,
      setSavedBaseline,
      setSnapshot: vi.fn(),
    })
    const session = useWriterCardSession(ref({ id: 2, project_id: 1 } as CardRead), adapter)

    current = B
    session.onEditorChange()
    const savingB = session.manualSave()
    current = C
    session.onEditorChange()
    resolveB?.({ id: 2, project_id: 1, title: B.title, content: B.content })
    const result = await savingB

    expect(session.state.value).toBe('dirty')
    expect(result).toMatchObject({ ok: true })
    expect(setSavedBaseline).not.toHaveBeenCalled()
    expect(current).toEqual(C)
    expect(new RecoveryDraftStore(localStorage, () => new Date()).read(1, 2)).toMatchObject({
      content: C.content,
      contextTemplates: C.contextTemplates,
      savedCardFingerprint: fingerprintWriterSnapshot(B),
    })

    await expect(session.flush('card-change')).resolves.toMatchObject({ ok: true, snapshot: C })
    expect(updateWriterCard).toHaveBeenLastCalledWith(2, expect.objectContaining({
      content: C.content,
      ai_context_template: C.contextTemplates.generation,
      ai_context_template_review: C.contextTemplates.review,
    }))
    session.dispose()
  })

  it('tears down a dirty writer session before switching to an unsupported card', async () => {
    vi.useFakeTimers()
    const writerCard = ref({ id: 2, project_id: 1 } as CardRead)
    const adapter = ref<WriterEditorAdapter | null>({
      getSnapshot: () => ({ ...snapshot, content: { content: 'Niezapisany tekst' } }),
      setSavedBaseline: vi.fn(),
      setSnapshot: vi.fn(),
    })
    const session = useWriterCardSession(writerCard, adapter)
    const editorStore = useEditorStore()
    session.onEditorChange()

    writerCard.value = { id: 3, project_id: 1, card_type: { name: 'Inna karta', editor_component: 'UnsupportedEditor' } } as CardRead
    adapter.value = null
    await nextTick()

    expect(editorStore.activeWriterFlushRef).toBeNull()
    await expect(editorStore.flushActiveWriter('card-change')).resolves.toMatchObject({ ok: true })
    expect(updateWriterCard).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('beforeunload'))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(new RecoveryDraftStore(localStorage, () => new Date()).read(1, 2)).toBeNull()

    session.dispose()
    vi.useRealTimers()
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

    const wrapper = mount(GenericCardEditor, {
      props: {
        card: {
          id: 2, project_id: 1, title: 'Scena', content: snapshot.content,
          ai_context_template: 'Generowanie', ai_context_template_review: 'Redakcja',
          card_type: { id: 1, name: '通用文本', editor_component: 'MarkdownTextEditor' },
        } as CardRead,
      },
      global: {
        plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]],
        stubs: {
          AIPerCardParams: true,
          CardReferenceSelectorDialog: true,
          CardVersionsDialog: true,
          ContextDrawer: true,
          EditorHeader: true,
          GenerationPanel: true,
          InitialPromptDialog: true,
          ModelDrivenForm: true,
          SchemaStudio: true,
          SectionedForm: true,
          SimpleMarkdown: true,
        },
      },
    })

    await waitForWriterEditorStub(wrapper)

    expect(resolveContentEditor).toHaveBeenCalledWith('MarkdownTextEditor')
    expect(wrapper.find('[data-test="writer-editor-stub"]').exists()).toBe(true)
    const dialog = wrapper.findComponent(WriterRecoveryDialog)
    expect(dialog.exists()).toBe(true)
    expect(dialog.props('canonical')).toMatchObject(snapshot)
    expect(dialog.props('comparison')).toMatchObject({ kind: 'ordinary', draft })
  })

  it.each(['CodeMirrorEditor', 'MarkdownTextEditor'])('%s restores a complete writer version through restored-version save intent', async (editorComponent) => {
    const restored = {
      title: 'Przywrócona scena',
      content: { content: 'Przywrócony tekst' },
      ai_context_template: 'Przywrócone generowanie',
      ai_context_template_review: 'Przywrócona redakcja',
    }
    updateWriterCard.mockResolvedValueOnce({ id: 2, project_id: 1, title: restored.title, content: restored.content })
    const wrapper = mount(GenericCardEditor, {
      props: {
        card: {
          id: 2, project_id: 1, title: 'Scena', content: snapshot.content,
          ai_context_template: 'Generowanie', ai_context_template_review: 'Redakcja',
          card_type: { id: 1, name: editorComponent === 'CodeMirrorEditor' ? '章节正文' : '通用文本', editor_component: editorComponent },
        } as CardRead,
      },
      global: {
        plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]],
        stubs: {
          AIPerCardParams: true, CardReferenceSelectorDialog: true, CardVersionsDialog: true,
          ContextDrawer: true, EditorHeader: true, GenerationPanel: true, InitialPromptDialog: true,
          ModelDrivenForm: true, SchemaStudio: true, SectionedForm: true, SimpleMarkdown: true,
        },
      },
    })
    await waitForWriterEditorStub(wrapper)

    await (wrapper.vm as any).handleRestoreVersion(restored)

    expect(updateWriterCard).toHaveBeenCalledWith(2, expect.objectContaining({
      title: restored.title,
      content: restored.content,
      ai_context_template: restored.ai_context_template,
      ai_context_template_review: restored.ai_context_template_review,
    }))
    expect(listVersions(1, 2)).toHaveLength(1)
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
