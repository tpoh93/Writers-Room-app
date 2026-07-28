import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@renderer/stores/useEditorStore'

describe('writer navigation flush gate', () => {
  it('blocks a transition when the writer flush fails', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    const failure = { ok: false as const, error: new Error('offline') }
    store.setActiveWriterFlush(vi.fn().mockResolvedValue(failure))

    await expect((store as any).requireWriterFlush('card-change')).resolves.toBe(false)
  })
})
