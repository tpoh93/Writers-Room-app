import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  listWorkflows: vi.fn(),
}))

vi.mock('../request', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
  },
  API_BASE_URL: '/api',
}))

vi.mock('../workflows', () => ({
  listWorkflows: mocks.listWorkflows,
}))

import {
  clearSelectionPipelineWorkflowCache,
  startSelectionPipeline,
  streamSelectionPipeline,
} from '../selectionPipelines'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  readonly url: string
  readyState = 1
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close = vi.fn(() => {
    this.readyState = 2
  })

  constructor(url: string | URL) {
    this.url = String(url)
    FakeEventSource.instances.push(this)
  }

  emit(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>)
  }
}

describe('selection pipeline API', () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.post.mockReset()
    mocks.listWorkflows.mockReset()
    clearSelectionPipelineWorkflowCache()
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  })

  it('resolves the exact workflow name and persists all three model IDs', async () => {
    mocks.listWorkflows.mockResolvedValue([
      { id: 2, name: 'Thinking porn', is_active: true },
      { id: 7, name: 'Thinking p*rn', is_active: true },
    ])
    mocks.post.mockResolvedValue({ workflow_id: 7, run_id: 91, status: 'queued' })

    const result = await startSelectionPipeline({
      sourceText: 'Źródło',
      brief: 'Brief',
      kimiLlmConfigId: 11,
      grokLlmConfigId: 12,
      aionLlmConfigId: 13,
      idempotencyKey: 'fixture:hash',
      scope: { project_id: 3 },
    })

    expect(result).toEqual({ workflowId: 7, runId: 91 })
    expect(mocks.post).toHaveBeenCalledWith(
      '/workflows/7/runs',
      {
        scope_json: { project_id: 3 },
        params_json: {
          source_text: 'Źródło',
          brief: 'Brief',
          kimi_llm_config_id: 11,
          grok_llm_config_id: 12,
          aion_llm_config_id: 13,
        },
        idempotency_key: 'fixture:hash',
      },
      '/api',
      { showLoading: false }
    )
  })

  it('uses the pre-created run for first execution and resume for retry', () => {
    const first = streamSelectionPipeline(7, 91, {})
    const firstSource = FakeEventSource.instances[0]
    expect(firstSource.url).toBe('/api/workflows/7/execute-stream?run_id=91')
    first.close()

    const retry = streamSelectionPipeline(7, 91, {}, true)
    const retrySource = FakeEventSource.instances[1]
    expect(retrySource.url).toContain('run_id=91')
    expect(retrySource.url).toContain('resume=true')
    retry.close()
  })

  it('loads persisted node states after end and exposes Aion text verbatim', async () => {
    mocks.get.mockResolvedValue([
      {
        node_id: 'kimi', node_type: 'AI.TextGenerate', status: 'success', progress: 100,
        outputs_json: { text: 'Kimi' },
      },
      {
        node_id: 'grok', node_type: 'AI.TextGenerate', status: 'success', progress: 100,
        outputs_json: { text: 'Grok' },
      },
      {
        node_id: 'aion', node_type: 'AI.TextGenerate', status: 'success', progress: 100,
        outputs_json: { text: '  Finalny tekst dokładnie.  ' },
      },
    ])
    const onFinished = vi.fn()
    const onEnd = vi.fn()

    streamSelectionPipeline(7, 91, { onFinished, onEnd })
    FakeEventSource.instances[0].emit({ type: 'end' })
    await vi.waitFor(() => expect(onFinished).toHaveBeenCalledOnce())

    expect(mocks.get).toHaveBeenCalledWith(
      '/workflows/runs/91/node-states',
      undefined,
      '/api',
      { showLoading: false }
    )
    expect(onFinished.mock.calls[0][0].finalReplacement).toBe(
      '  Finalny tekst dokładnie.  '
    )
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('closes EventSource and suppresses final callbacks after manual closure', async () => {
    mocks.get.mockResolvedValue([])
    const onFinished = vi.fn()
    const stream = streamSelectionPipeline(7, 91, { onFinished })
    const source = FakeEventSource.instances[0]

    stream.close()
    source.emit({ type: 'end' })
    await Promise.resolve()

    expect(source.close).toHaveBeenCalledOnce()
    expect(onFinished).not.toHaveBeenCalled()
  })
})
