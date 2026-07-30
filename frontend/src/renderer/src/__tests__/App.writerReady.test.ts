import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }))

vi.mock('element-plus', () => ({ ElMessage: { error: showError } }))
vi.mock('@renderer/api/schema', () => ({ schemaService: { loadSchemas: vi.fn() } }))
vi.mock('@renderer/stores/useUpdateStore', () => ({
  useUpdateStore: () => ({ autoCheckEnabled: false, hasUpdate: false }),
}))
vi.mock('@renderer/stores/useWorkflowStore', () => ({
  useWorkflowStore: () => ({ setupWorkflowListener: () => () => undefined }),
}))
vi.mock('../views/Dashboard.vue', () => ({ default: { name: 'Dashboard', template: '<div data-test="dashboard" />' } }))
vi.mock('../views/Editor.vue', () => ({ default: { name: 'Editor', template: '<div data-test="editor-mounted" />' } }))
vi.mock('../components/common/SettingsDialog.vue', () => ({ default: { name: 'SettingsDialog', template: '<div />' } }))

type MountedWriterApp = {
  appStore: ReturnType<typeof import('@renderer/stores/useAppStore')['useAppStore']>
  editorStore: ReturnType<typeof import('@renderer/stores/useEditorStore')['useEditorStore']>
  projectStore: ReturnType<typeof import('@renderer/stores/useProjectStore')['useProjectStore']>
  wrapper: VueWrapper
}

let mounted: MountedWriterApp | null = null

async function mountWriterApp(): Promise<MountedWriterApp> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const [{ default: App }, { default: i18n }, { useAppStore }, { useEditorStore }, { useProjectStore }] = await Promise.all([
    import('../App.vue'),
    import('@renderer/i18n'),
    import('@renderer/stores/useAppStore'),
    import('@renderer/stores/useEditorStore'),
    import('@renderer/stores/useProjectStore'),
  ])
  const appStore = useAppStore()
  const editorStore = useEditorStore()
  const projectStore = useProjectStore()
  projectStore.setCurrentProject({ id: 1, name: 'Projekt' } as any)
  appStore.goToEditor()

  mounted = {
    appStore,
    editorStore,
    projectStore,
    wrapper: mount(App, {
      global: {
        plugins: [pinia, i18n],
        stubs: { 'el-icon': true, 'el-button': true, 'el-badge': true },
      },
    }),
  }
  return mounted
}

describe('NovelForge logo route-leave flush gate', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    window.location.hash = ''
  })

  afterEach(() => {
    mounted?.wrapper.unmount()
    mounted = null
  })

  it('waits for a dirty controlled-close flush before the real logo route leaves', async () => {
    const { appStore, editorStore, projectStore, wrapper } = await mountWriterApp()
    let resolveFlush: (result: { ok: true }) => void = () => undefined
    const flush = vi.fn(() => new Promise<{ ok: true }>((resolve) => { resolveFlush = resolve }))
    editorStore.setActiveWriterFlush(flush)

    await wrapper.find('.logo-container').trigger('click')

    expect(flush).toHaveBeenCalledOnce()
    expect(flush).toHaveBeenCalledWith('controlled-close')
    expect(appStore.currentView).toBe('editor')
    expect(projectStore.currentProject).not.toBeNull()
    expect(wrapper.find('[data-test="editor-mounted"]').exists()).toBe(true)

    resolveFlush({ ok: true })
    await flushPromises()

    expect(appStore.currentView).toBe('dashboard')
    expect(projectStore.currentProject).toBeNull()
  })

  it('keeps the editor mounted after failure and permits a later logo retry', async () => {
    const { appStore, editorStore, projectStore, wrapper } = await mountWriterApp()
    const flush = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: new Error('offline') })
      .mockResolvedValueOnce({ ok: true })
    editorStore.setActiveWriterFlush(flush)

    await wrapper.find('.logo-container').trigger('click')
    await flushPromises()

    expect(flush).toHaveBeenCalledTimes(1)
    expect(appStore.currentView).toBe('editor')
    expect(projectStore.currentProject).not.toBeNull()
    expect(wrapper.find('[data-test="editor-mounted"]').exists()).toBe(true)
    expect(showError).toHaveBeenCalledOnce()

    await wrapper.find('.logo-container').trigger('click')
    await flushPromises()

    expect(flush).toHaveBeenCalledTimes(2)
    expect(appStore.currentView).toBe('dashboard')
    expect(projectStore.currentProject).toBeNull()
  })

  it('deduplicates repeated logo clicks while a controlled-close flush is pending', async () => {
    const { appStore, editorStore, projectStore, wrapper } = await mountWriterApp()
    const goToDashboard = vi.spyOn(appStore, 'goToDashboard')
    let resolveFlush: (result: { ok: true }) => void = () => undefined
    const flush = vi.fn(() => new Promise<{ ok: true }>((resolve) => { resolveFlush = resolve }))
    editorStore.setActiveWriterFlush(flush)

    await wrapper.find('.logo-container').trigger('click')
    await wrapper.find('.logo-container').trigger('click')

    expect(flush).toHaveBeenCalledOnce()
    expect(goToDashboard).not.toHaveBeenCalled()

    resolveFlush({ ok: true })
    await flushPromises()

    expect(goToDashboard).toHaveBeenCalledOnce()
    expect(appStore.currentView).toBe('dashboard')
    expect(projectStore.currentProject).toBeNull()
  })

  it('leaves immediately when the active writer flush succeeds immediately', async () => {
    const { appStore, editorStore, projectStore, wrapper } = await mountWriterApp()
    const flush = vi.fn().mockResolvedValue({ ok: true })
    editorStore.setActiveWriterFlush(flush)

    await wrapper.find('.logo-container').trigger('click')
    await flushPromises()

    expect(flush).toHaveBeenCalledOnce()
    expect(appStore.currentView).toBe('dashboard')
    expect(projectStore.currentProject).toBeNull()
  })
})
