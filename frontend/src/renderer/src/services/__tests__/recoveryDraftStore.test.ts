import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryDraftStore } from '../recoveryDraftStore'
import { WriterSaveCoordinator } from '../writerSaveCoordinator'
import type { WriterSnapshot } from '../writerSnapshot'
import { fingerprintWriterSnapshot } from '../writerSnapshot'

const initial: WriterSnapshot = {
  projectId: 1,
  cardId: 2,
  title: 'Scena',
  content: { content: 'A' },
  contextTemplates: { generation: 'G', review: 'R' },
}

function nextSnapshot(content: string): WriterSnapshot {
  return { ...initial, content: { content }, contextTemplates: { generation: `G-${content}`, review: `R-${content}` } }
}

describe('RecoveryDraftStore and local draft scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-28T00:00:00Z'))
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the complete dirty snapshot exactly after three seconds of idle time', async () => {
    const store = new RecoveryDraftStore(localStorage, () => new Date())
    const coordinator = new WriterSaveCoordinator({ initial, drafts: store, now: () => new Date() })
    const changed = nextSnapshot('B')

    coordinator.update(changed)
    await vi.advanceTimersByTimeAsync(2_999)
    expect(store.read(1, 2)).toBeNull()

    await vi.advanceTimersByTimeAsync(1)
    expect(store.read(1, 2)).toMatchObject({
      content: changed.content,
      contextTemplates: changed.contextTemplates,
      draftFingerprint: fingerprintWriterSnapshot(changed),
      savedCardFingerprint: fingerprintWriterSnapshot(initial),
      reason: 'local-idle',
    })
  })

  it('writes the newest complete snapshot at fifteen seconds during continuous typing', async () => {
    const store = new RecoveryDraftStore(localStorage, () => new Date())
    const coordinator = new WriterSaveCoordinator({ initial, drafts: store, now: () => new Date() })
    let latest = initial

    for (let elapsed = 0; elapsed < 15; elapsed += 1) {
      latest = nextSnapshot(String(elapsed))
      coordinator.update(latest)
      await vi.advanceTimersByTimeAsync(1_000)
    }

    expect(store.read(1, 2)).toMatchObject({
      content: latest.content,
      contextTemplates: latest.contextTemplates,
      draftFingerprint: fingerprintWriterSnapshot(latest),
      reason: 'local-idle',
    })
  })

  it('keys recovery records by project and card identity', () => {
    const store = new RecoveryDraftStore(localStorage, () => new Date())
    const snapshot = nextSnapshot('B')
    store.write({
      ...snapshot,
      savedCardFingerprint: fingerprintWriterSnapshot(initial),
      draftFingerprint: fingerprintWriterSnapshot(snapshot),
      capturedAt: new Date().toISOString(),
      reason: 'failed-save',
    })

    expect(store.key(1, 2)).toBe('nf:v1:writer-recovery:1:2')
    expect(store.read(1, 3)).toBeNull()
    expect(store.read(1, 2)?.contextTemplates).toEqual(snapshot.contextTemplates)
  })
})
