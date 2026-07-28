import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryDraftStore } from '../recoveryDraftStore'
import {
  type WriterHistoryReason,
  type WriterSaveState,
  WriterSaveCoordinator,
} from '../writerSaveCoordinator'
import type { WriterSnapshot } from '../writerSnapshot'

const initial: WriterSnapshot = {
  projectId: 1,
  cardId: 2,
  title: 'T',
  content: { content: 'A' },
  contextTemplates: { generation: 'G', review: 'R' },
}

function changed(review = 'R2'): WriterSnapshot {
  return { ...initial, content: { content: 'B' }, contextTemplates: { generation: 'G', review } }
}

function createCoordinator(save = vi.fn(async (snapshot: WriterSnapshot) => snapshot)) {
  const states: WriterSaveState[] = []
  const history: WriterHistoryReason[] = []
  const drafts = new RecoveryDraftStore(localStorage, () => new Date())
  const coordinator = new WriterSaveCoordinator({
    initial,
    save,
    drafts,
    now: () => new Date(),
    onStateChange: (state) => states.push(state),
    onHistoryEligible: (_snapshot, reason) => history.push(reason),
  })
  return { coordinator, drafts, history, save, states }
}

describe('WriterSaveCoordinator atomic canonical save', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('saves the complete snapshot atomically and becomes saved only after confirmation', async () => {
    const { coordinator, save, states, history } = createCoordinator()
    coordinator.update(changed())

    await expect(coordinator.manualSave()).resolves.toMatchObject({ ok: true, snapshot: changed() })

    expect(save).toHaveBeenCalledWith(changed())
    expect(states).toEqual(['dirty', 'saving', 'saved'])
    expect(history).toEqual(['manual'])
  })

  it('keeps the complete local draft and reports save-error when the atomic PUT rejects', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('template PUT rejected'))
    const { coordinator, drafts, states } = createCoordinator(save)
    const snapshot = changed()
    coordinator.update(snapshot)

    await expect(coordinator.manualSave()).resolves.toMatchObject({ ok: false, error: expect.any(Error) })

    expect(states.at(-1)).toBe('save-error')
    expect(drafts.read(1, 2)).toMatchObject({
      content: snapshot.content,
      contextTemplates: snapshot.contextTemplates,
      reason: 'failed-save',
    })
  })

  it.each([
    ['manual', (coordinator: WriterSaveCoordinator) => coordinator.manualSave(), 'manual', true],
    ['recovered draft', (coordinator: WriterSaveCoordinator) => coordinator.flush('recovered-draft'), 'recovered-draft', true],
    ['restored version', (coordinator: WriterSaveCoordinator) => coordinator.flush('restored-version'), 'restored-version', true],
    ['technical flush', (coordinator: WriterSaveCoordinator) => coordinator.flush('card-change'), 'technical-flush', false],
  ] as const)('keeps %s history intent when Retry succeeds', async (_label, begin, expectedReason, createsHistory) => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(async (snapshot: WriterSnapshot) => snapshot)
    const { coordinator, history } = createCoordinator(save)
    coordinator.update(changed())

    await begin(coordinator)
    await coordinator.retry()

    expect(history).toEqual(createsHistory ? [expectedReason] : [])
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('refuses duplicate in-flight retry commands', async () => {
    let resolveSave: ((snapshot: WriterSnapshot) => void) | undefined
    const save = vi.fn(() => new Promise<WriterSnapshot>((resolve) => { resolveSave = resolve }))
    const { coordinator, history } = createCoordinator(save)
    coordinator.update(changed())

    const pending = coordinator.manualSave()
    await expect(coordinator.retry()).resolves.toMatchObject({ ok: false })
    resolveSave?.(changed())
    await pending

    expect(save).toHaveBeenCalledTimes(1)
    expect(history).toEqual(['manual'])
  })
})
