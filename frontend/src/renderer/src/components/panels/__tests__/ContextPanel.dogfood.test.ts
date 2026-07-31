import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it, vi } from 'vitest'

import ContextPanel from '@renderer/components/panels/ContextPanel.vue'
import i18n, { elementPlusLocale } from '@renderer/i18n'
import type { AssembleContextResponse } from '@renderer/api/ai'

vi.mock('@renderer/api/cards', () => ({
  getCardsForProject: vi.fn().mockResolvedValue([]),
}))

vi.mock('@renderer/api/ai', () => ({
  assembleContext: vi.fn(),
}))

function mountPanel(prefetched: AssembleContextResponse) {
  return mount(ContextPanel, {
    props: { projectId: 3, prefetched },
    global: { plugins: [i18n, [ElementPlus, { locale: elementPlusLocale }]] },
  })
}

describe('ContextPanel author preview', () => {
  it('renders author-facing facts while keeping raw technical text collapsed', async () => {
    const wrapper = mountPanel({
      facts_structured: { fact_summaries: ['Syntetyczny fakt autora'] },
      facts_subgraph: 'internal_id=42',
    })

    await flushPromises()
    expect(wrapper.text()).toContain('Syntetyczny fakt autora')
    expect(wrapper.get('.el-collapse-item').classes()).not.toContain('is-active')
  })

  it('explains an empty structured context instead of hiding the actual absence of facts', async () => {
    const wrapper = mountPanel({
      facts_structured: { fact_summaries: [], relation_summaries: [], item_summaries: [], concept_summaries: [] },
      facts_subgraph: 'technical fallback',
    })

    await flushPromises()
    expect(wrapper.text()).toContain(i18n.global.t('contextPanel.noFacts'))
  })
})
