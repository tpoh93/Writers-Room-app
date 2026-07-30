import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCodeWorkflowStream } from '../workflows'

const PRIVATE_MARKER = 'DOGFOOD01_PRIVATE_MARKER_7f4c'

class MockEventSource {
  static instances: MockEventSource[] = []
  static readonly CLOSED = 2

  readyState = 1
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this)
  }

  close() {
    this.readyState = MockEventSource.CLOSED
  }
}

describe('workflow stream privacy', () => {
  afterEach(() => {
    MockEventSource.instances = []
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('never writes private stream data to browser console on success or error', async () => {
    vi.stubGlobal('EventSource', MockEventSource)
    const consoleCalls = vi.spyOn(console, 'log')
    const consoleDebug = vi.spyOn(console, 'debug')
    const consoleInfo = vi.spyOn(console, 'info')
    const consoleWarnings = vi.spyOn(console, 'warn')
    const consoleErrors = vi.spyOn(console, 'error')

    const stream = await runCodeWorkflowStream(7, {})
    const source = MockEventSource.instances[0]

    source.onmessage?.({ data: JSON.stringify({
      type: 'complete',
      statement: { variable: 'result', code: PRIVATE_MARKER },
      result: PRIVATE_MARKER,
    }) } as MessageEvent<string>)
    source.onmessage?.({ data: JSON.stringify({
      type: 'error',
      statement: { variable: 'result', code: PRIVATE_MARKER },
      error: PRIVATE_MARKER,
    }) } as MessageEvent<string>)
    source.onerror?.()

    expect(stream.runId.value).toBe(0)
    const renderedConsole = [consoleCalls, consoleDebug, consoleInfo, consoleWarnings, consoleErrors]
      .flatMap(spy => spy.mock.calls)
      .flat()
      .join(' ')
    expect(renderedConsole).not.toContain(PRIVATE_MARKER)
  })
})
