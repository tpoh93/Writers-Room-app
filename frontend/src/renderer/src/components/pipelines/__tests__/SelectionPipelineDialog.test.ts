import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SelectionPipelineDialog from '../SelectionPipelineDialog.vue'
import type { PipelineEventHandlers } from '@renderer/api/selectionPipelines'

const startSelectionPipeline = vi.fn()
const streamSelectionPipeline = vi.fn()
let activeHandlers: PipelineEventHandlers | null = null

vi.mock('@renderer/api/selectionPipelines', () => ({
  startSelectionPipeline: (...args: unknown[]) => startSelectionPipeline(...args),
  streamSelectionPipeline: (
    workflowId: number,
    runId: number,
    handlers: PipelineEventHandlers,
    resume: boolean
  ) => {
    activeHandlers = handlers
    return streamSelectionPipeline(workflowId, runId, handlers, resume)
  },
}))

const ElDialog = defineComponent({
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () => props.modelValue
      ? h('section', { 'data-test': 'dialog' }, [slots.default?.(), slots.footer?.()])
      : null
  },
})

const ElInput = defineComponent({
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () => h('textarea', {
      ...attrs,
      value: props.modelValue,
      disabled: props.disabled,
      onInput: (event: Event) => emit(
        'update:modelValue',
        (event.target as HTMLTextAreaElement).value
      ),
    })
  },
})

const ElButton = defineComponent({
  props: { disabled: Boolean, loading: Boolean },
  emits: ['click'],
  setup(props, { emit, slots, attrs }) {
    return () => h('button', {
      ...attrs,
      disabled: props.disabled || props.loading,
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

const ElSelect = defineComponent({
  props: { modelValue: [String, Number], disabled: Boolean },
  emits: ['update:modelValue'],
  setup(_props, { slots, attrs }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const passthrough = defineComponent({
  setup(_props, { slots, attrs }) {
    return () => h('div', attrs, slots.default?.())
  },
})

function mountDialog(conflict = '') {
  return mount(SelectionPipelineDialog, {
    props: {
      visible: true,
      sourceText: 'Oryginalny fragment.',
      modelOptions: [
        { id: 11, display_name: 'Kimi - scene architect' },
        { id: 12, display_name: 'Grok - continuity' },
        { id: 13, display_name: 'Aion - final polish' },
      ],
      conflict,
      idempotencyKey: 'fixture:1',
    },
    global: {
      stubs: {
        ElDialog,
        ElInput,
        ElButton,
        ElSelect,
        ElOption: passthrough,
        ElAlert: passthrough,
        ElTag: passthrough,
        ElCollapse: passthrough,
        ElCollapseItem: passthrough,
      },
    },
  })
}

async function startAndFinish(wrapper: ReturnType<typeof mountDialog>) {
  await wrapper.get('[data-test="start"]').trigger('click')
  await flushPromises()
  expect(startSelectionPipeline).toHaveBeenCalledWith({
    sourceText: 'Oryginalny fragment.',
    brief: 'Popraw zaznaczenie, zachowując sens, fakty i punkt widzenia.',
    kimiLlmConfigId: 11,
    grokLlmConfigId: 12,
    aionLlmConfigId: 13,
    idempotencyKey: 'fixture:1',
  })
  expect(activeHandlers).not.toBeNull()

  activeHandlers?.onStepStart?.('kimi')
  activeHandlers?.onStepComplete?.('kimi', 'Wersja Kimi')
  activeHandlers?.onStepStart?.('grok')
  activeHandlers?.onStepComplete?.('grok', 'Wersja Groka')
  activeHandlers?.onStepStart?.('aion')
  activeHandlers?.onStepComplete?.('aion', 'Finalny tekst Aiona.')
  activeHandlers?.onFinished?.({
    runId: 91,
    states: [
      {
        node_id: 'kimi', node_type: 'AI.TextGenerate', status: 'success', progress: 100,
        outputs_json: { text: 'Wersja Kimi' },
      },
      {
        node_id: 'grok', node_type: 'AI.TextGenerate', status: 'success', progress: 100,
        outputs_json: { text: 'Wersja Groka' },
      },
      {
        node_id: 'aion', node_type: 'AI.TextGenerate', status: 'success', progress: 100,
        outputs_json: { text: 'Finalny tekst Aiona.' },
      },
    ],
    outputs: {
      kimi: 'Wersja Kimi',
      grok: 'Wersja Groka',
      aion: 'Finalny tekst Aiona.',
    },
    finalReplacement: 'Finalny tekst Aiona.',
  })
  activeHandlers?.onEnd?.()
  await nextTick()
}

beforeEach(() => {
  activeHandlers = null
  startSelectionPipeline.mockReset()
  streamSelectionPipeline.mockReset()
  startSelectionPipeline.mockResolvedValue({ workflowId: 7, runId: 91 })
  streamSelectionPipeline.mockReturnValue({ close: vi.fn() })
})

describe('SelectionPipelineDialog', () => {
  it('shows source text and the three stages in order', () => {
    const wrapper = mountDialog()

    expect(wrapper.get('[data-test="source-text"]').text()).toContain('Oryginalny fragment.')
    const labels = ['kimi', 'grok', 'aion'].map(step =>
      wrapper.get(`[data-test="step-${step}"]`).text()
    )
    expect(labels[0]).toContain('Kimi')
    expect(labels[1]).toContain('Grok')
    expect(labels[2]).toContain('Aion')
  })

  it('disables accept while running and emits the exact Aion replacement after finish', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-test="start"]').trigger('click')
    expect((wrapper.get('[data-test="accept"]').element as HTMLButtonElement).disabled).toBe(true)
    await flushPromises()

    activeHandlers?.onStepComplete?.('aion', 'Finalny tekst Aiona.')
    activeHandlers?.onFinished?.({
      runId: 91,
      states: [{
        node_id: 'aion', node_type: 'AI.TextGenerate', status: 'success', progress: 100,
        outputs_json: { text: 'Finalny tekst Aiona.' },
      }],
      outputs: { aion: 'Finalny tekst Aiona.' },
      finalReplacement: 'Finalny tekst Aiona.',
    })
    activeHandlers?.onEnd?.()
    await nextTick()

    expect(wrapper.get('[data-test="final-text"]').text()).toContain('Finalny tekst Aiona.')
    expect((wrapper.get('[data-test="accept"]').element as HTMLButtonElement).disabled).toBe(false)
    await wrapper.get('[data-test="accept"]').trigger('click')
    expect(wrapper.emitted('accept')).toEqual([['Finalny tekst Aiona.']])
  })

  it('blocks accept in conflict state', async () => {
    const wrapper = mountDialog('Document changed after pipeline launch')
    await startAndFinish(wrapper)

    expect(wrapper.find('[data-test="conflict-alert"]').exists()).toBe(true)
    expect((wrapper.get('[data-test="accept"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('reject emits without a replacement', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-test="reject"]').trigger('click')

    expect(wrapper.emitted('reject')).toEqual([[]])
    expect(wrapper.emitted('accept')).toBeUndefined()
  })

  it('retries the same run with resume enabled after a failed step', async () => {
    const wrapper = mountDialog()
    await wrapper.get('[data-test="start"]').trigger('click')
    await flushPromises()

    activeHandlers?.onStepError?.('grok', 'synthetic failure')
    activeHandlers?.onEnd?.()
    await nextTick()
    expect((wrapper.get('[data-test="retry"]').element as HTMLButtonElement).disabled).toBe(false)

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(streamSelectionPipeline).toHaveBeenLastCalledWith(
      7,
      91,
      expect.any(Object),
      true
    )
  })
})
