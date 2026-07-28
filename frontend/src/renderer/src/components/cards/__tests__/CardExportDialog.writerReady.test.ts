import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import i18n from '@renderer/i18n'

const { exportCardsForProject, messageError, messageSuccess } = vi.hoisted(() => ({
  exportCardsForProject: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
}))

vi.mock('@renderer/api/cards', async () => {
  const actual = await vi.importActual<typeof import('@renderer/api/cards')>('@renderer/api/cards')
  return { ...actual, exportCardsForProject }
})

vi.mock('element-plus', () => ({
  ElMessage: { error: messageError, success: messageSuccess },
}))

import CardExportDialog from '../CardExportDialog.vue'

const cards = [{
  id: 2,
  title: 'Scena testowa',
  content: { content: 'Syntetyczny akapit.' },
  card_type_id: 1,
  card_type: { id: 1, name: 'Typ prozy' },
}]

const stubs = {
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-radio-group': { template: '<div><slot /></div>' },
  'el-radio': { template: '<label><slot /></label>' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option />' },
  'el-alert': { template: '<div />' },
  'el-button': {
    inheritAttrs: false,
    template: '<button :data-test="$attrs[\'data-test\']" @click="$emit(\'click\')"><slot /></button>',
  },
}

function mountDialog(beforeExport: () => Promise<boolean>) {
  return mount(CardExportDialog, {
    props: {
      modelValue: true,
      projectId: 1,
      projectName: 'Projekt testowy',
      cards: cards as any,
      cardTypes: [{ id: 1, name: 'Typ prozy' }] as any,
      beforeExport,
    },
    global: { plugins: [i18n], stubs },
  })
}

describe('CardExportDialog writer-ready flush gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('blocks the export API and download after a failed writer flush with a Polish error', async () => {
    const beforeExport = vi.fn().mockResolvedValue(false)
    const wrapper = mountDialog(beforeExport)

    await wrapper.find('[data-test="card-export-submit"]').trigger('click')
    await flushPromises()

    expect(beforeExport).toHaveBeenCalledOnce()
    expect(exportCardsForProject).not.toHaveBeenCalled()
    expect(messageError).toHaveBeenCalledWith('Eksport został zablokowany: nie udało się zapisać zmian.')
  })

  it('waits for a successful flush before sending the existing export request', async () => {
    const calls: string[] = []
    const beforeExport = vi.fn().mockImplementation(async () => {
      calls.push('flush')
      return true
    })
    exportCardsForProject.mockImplementation(async () => {
      calls.push('export')
      return { blob: new Blob(['plik']), filename: 'test.txt', contentType: 'text/plain' }
    })
    const wrapper = mountDialog(beforeExport)

    await wrapper.find('[data-test="card-export-submit"]').trigger('click')
    await flushPromises()

    expect(calls).toEqual(['flush', 'export'])
    expect(exportCardsForProject).toHaveBeenCalledWith(1, { scope: 'all', format: 'txt' })
  })
})
