import request, { API_BASE_URL } from './request'
import { listWorkflows } from './workflows'

export const THINKING_PORN_WORKFLOW_NAME = 'Thinking p*rn'

export type PipelineStepName = 'kimi' | 'grok' | 'aion'
export type PipelineStepStatus = 'idle' | 'queued' | 'running' | 'success' | 'error'

export interface StartSelectionPipelineInput {
  sourceText: string
  brief: string
  kimiLlmConfigId: number
  grokLlmConfigId: number
  aionLlmConfigId: number
  idempotencyKey?: string
  scope?: Record<string, unknown>
}

export interface StartedSelectionPipeline {
  workflowId: number
  runId: number
}

export interface PipelineNodeState {
  node_id: string
  node_type: string
  status: string
  progress: number
  outputs_json?: Record<string, unknown> | null
  error_message?: string | null
}

export interface SelectionPipelineResult {
  runId: number
  states: PipelineNodeState[]
  outputs: Partial<Record<PipelineStepName, string>>
  finalReplacement: string
}

export interface PipelineEventHandlers {
  onRunStarted?: (runId: number) => void
  onStepStart?: (step: PipelineStepName) => void
  onStepComplete?: (step: PipelineStepName, output?: string) => void
  onStepError?: (step: PipelineStepName, message: string) => void
  onFinished?: (result: SelectionPipelineResult) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

export interface SelectionPipelineStream {
  close(): void
}

let cachedWorkflowId: number | null = null

function isPipelineStep(value: unknown): value is PipelineStepName {
  return value === 'kimi' || value === 'grok' || value === 'aion'
}

function eventVariable(data: any): PipelineStepName | null {
  const candidate = data?.statement?.variable ?? data?.node_id ?? data?.variable
  return isPipelineStep(candidate) ? candidate : null
}

function eventOutput(data: any): string | undefined {
  const candidate = data?.result?.text
    ?? data?.result?.outputs?.text
    ?? data?.outputs?.text
    ?? data?.text
  return typeof candidate === 'string' ? candidate : undefined
}

async function resolveThinkingPornWorkflowId(): Promise<number> {
  if (cachedWorkflowId != null) return cachedWorkflowId

  const workflows = await listWorkflows()
  const workflow = workflows.find(item => item.name === THINKING_PORN_WORKFLOW_NAME)
  if (!workflow?.id) {
    throw new Error(`Workflow not found: ${THINKING_PORN_WORKFLOW_NAME}`)
  }
  if (workflow.is_active === false) {
    throw new Error(`Workflow is inactive: ${THINKING_PORN_WORKFLOW_NAME}`)
  }

  cachedWorkflowId = workflow.id
  return workflow.id
}

export function clearSelectionPipelineWorkflowCache(): void {
  cachedWorkflowId = null
}

export async function startSelectionPipeline(
  input: StartSelectionPipelineInput
): Promise<StartedSelectionPipeline> {
  const workflowId = await resolveThinkingPornWorkflowId()
  const response = await request.post<{
    run_id: number
    workflow_id: number
    status: string
  }>(
    `/workflows/${workflowId}/runs`,
    {
      scope_json: input.scope ?? null,
      params_json: {
        source_text: input.sourceText,
        brief: input.brief,
        kimi_llm_config_id: input.kimiLlmConfigId,
        grok_llm_config_id: input.grokLlmConfigId,
        aion_llm_config_id: input.aionLlmConfigId
      },
      idempotency_key: input.idempotencyKey ?? null
    },
    '/api',
    { showLoading: false }
  )

  return {
    workflowId: response.workflow_id,
    runId: response.run_id
  }
}

export async function getSelectionPipelineNodeStates(
  runId: number
): Promise<PipelineNodeState[]> {
  return request.get(
    `/workflows/runs/${runId}/node-states`,
    undefined,
    '/api',
    { showLoading: false }
  )
}

function collectResult(runId: number, states: PipelineNodeState[]): SelectionPipelineResult {
  const outputs: Partial<Record<PipelineStepName, string>> = {}

  for (const state of states) {
    if (!isPipelineStep(state.node_id)) continue
    const text = state.outputs_json?.text
    if (typeof text === 'string') outputs[state.node_id] = text
  }

  return {
    runId,
    states,
    outputs,
    finalReplacement: outputs.aion ?? ''
  }
}

export function streamSelectionPipeline(
  workflowId: number,
  runId: number,
  handlers: PipelineEventHandlers,
  resume = false
): SelectionPipelineStream {
  const query = new URLSearchParams({ run_id: String(runId) })
  if (resume) query.set('resume', 'true')
  const source = new EventSource(
    `${API_BASE_URL}/workflows/${workflowId}/execute-stream?${query.toString()}`
  )
  let closed = false
  let finalized = false

  const close = () => {
    if (closed) return
    closed = true
    source.close()
  }

  const finish = async () => {
    if (finalized || closed) return
    finalized = true
    try {
      const states = await getSelectionPipelineNodeStates(runId)
      if (closed) return
      const result = collectResult(runId, states)
      handlers.onFinished?.(result)
    } catch (error) {
      if (!closed) {
        handlers.onError?.(
          error instanceof Error ? error.message : 'Failed to load pipeline outputs'
        )
      }
    } finally {
      handlers.onEnd?.()
      close()
    }
  }

  source.onmessage = event => {
    if (closed) return
    try {
      const data = JSON.parse(event.data)
      const step = eventVariable(data)

      switch (data.type) {
        case 'run_started':
          handlers.onRunStarted?.(Number(data.run_id) || runId)
          break
        case 'start':
          if (step) handlers.onStepStart?.(step)
          break
        case 'complete':
          if (step) handlers.onStepComplete?.(step, eventOutput(data))
          break
        case 'error': {
          const message = String(data.error || data.message || 'Pipeline step failed')
          if (step) handlers.onStepError?.(step, message)
          handlers.onError?.(message)
          break
        }
        case 'end':
        case 'paused':
          void finish()
          break
      }
    } catch (error) {
      handlers.onError?.(
        error instanceof Error ? error.message : 'Invalid pipeline event'
      )
    }
  }

  source.onerror = () => {
    if (closed || finalized || source.readyState === EventSource.CLOSED) return
    handlers.onError?.('SSE connection error')
    handlers.onEnd?.()
    close()
  }

  return { close }
}
