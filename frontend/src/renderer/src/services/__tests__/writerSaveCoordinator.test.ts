import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryDraftStore } from '../recoveryDraftStore'
import {
  bindWriterTimerFunctions,
  type WriterHistoryReason,
  type WriterSaveState,
  WriterSaveCoordinator,
} from '../writerSaveCoordinator'
import type { WriterSnapshot } from '../writerSnapshot'
import { WRITER_READY_FIXTURE, createWriterReadySnapshot } from '../../test-support/writerReadyFixtures'

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

  it.each(['card-change', 'project-change', 'export', 'controlled-close'] as const)(
    'does not submit an already confirmed snapshot for %s',
    async (reason) => {
      const { coordinator, save, history, drafts, states } = createCoordinator()

      await expect(coordinator.flush(reason)).resolves.toEqual({ ok: true, snapshot: initial, current: true })

      expect(save).not.toHaveBeenCalled()
      expect(history).toEqual([])
      expect(drafts.read(1, 2)).toBeNull()
      expect(states).toEqual([])
    }
  )

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

describe('WriterSaveCoordinator backend autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => vi.useRealTimers())

  it('runs recovery and autosave through browser-bound timers and cancels them on dispose', async () => {
    const fakeSetTimeout = globalThis.setTimeout.bind(globalThis)
    const fakeClearTimeout = globalThis.clearTimeout.bind(globalThis)
    const timerTarget = {
      setTimeout(this: unknown, callback: () => void, delay?: number) {
        if (this !== timerTarget) throw new TypeError('Illegal invocation')
        return fakeSetTimeout(callback, delay)
      },
      clearTimeout(this: unknown, timer: ReturnType<typeof setTimeout>) {
        if (this !== timerTarget) throw new TypeError('Illegal invocation')
        fakeClearTimeout(timer)
      },
    }
    const save = vi.fn(async (snapshot: WriterSnapshot) => snapshot)
    const drafts = new RecoveryDraftStore(localStorage, () => new Date())
    const coordinator = new WriterSaveCoordinator({
      initial,
      save,
      drafts,
      now: () => new Date(),
      ...bindWriterTimerFunctions(timerTarget),
    })
    const snapshot = changed()

    coordinator.update(snapshot)
    await vi.advanceTimersByTimeAsync(2_999)
    expect(drafts.read(1, 2)).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(drafts.read(1, 2)).toMatchObject({
      content: snapshot.content,
      reason: 'local-idle',
    })

    await vi.advanceTimersByTimeAsync(27_000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenLastCalledWith(snapshot)

    coordinator.update({ ...snapshot, content: { content: 'Anulowana zmiana' } })
    coordinator.dispose()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('saves first at thirty seconds and repeats every thirty seconds while dirty', async () => {
    const save = vi.fn(async (snapshot: WriterSnapshot) => snapshot)
    const { coordinator } = createCoordinator(save)
    const snapshot = changed()
    coordinator.update(snapshot)

    await vi.advanceTimersByTimeAsync(29_999)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenLastCalledWith(snapshot)

    coordinator.update({ ...snapshot, content: { content: 'C' } })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ content: { content: 'C' } }))
  })

  it('does not autosave a snapshot already confirmed or already in flight', async () => {
    let resolveSave: ((snapshot: WriterSnapshot) => void) | undefined
    const save = vi.fn(() => new Promise<WriterSnapshot>((resolve) => { resolveSave = resolve }))
    const { coordinator } = createCoordinator(save)
    const snapshot = changed()
    coordinator.update(snapshot)

    await vi.advanceTimersByTimeAsync(30_000)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(save).toHaveBeenCalledTimes(1)

    resolveSave?.(snapshot)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('rebases the local recovery draft when response B arrives after newer content C', async () => {
    let resolveSave: ((snapshot: WriterSnapshot) => void) | undefined
    const save = vi.fn(() => new Promise<WriterSnapshot>((resolve) => { resolveSave = resolve }))
    const { coordinator, drafts, states } = createCoordinator(save)
    const B = changed()
    const C = { ...B, content: { content: 'C' }, contextTemplates: { generation: 'G-C', review: 'R-C' } }
    coordinator.update(B)

    await vi.advanceTimersByTimeAsync(30_000)
    coordinator.update(C)
    resolveSave?.(B)
    await Promise.resolve()
    await Promise.resolve()

    expect(states.at(-1)).toBe('dirty')
    expect(drafts.read(1, 2)).toMatchObject({
      content: C.content,
      contextTemplates: C.contextTemplates,
      savedCardFingerprint: expect.any(String),
    })

    await vi.advanceTimersByTimeAsync(30_000)
    expect(save).toHaveBeenLastCalledWith(C)
  })
})

describe('WriterSaveCoordinator disposal', () => {
  it('ignores a delayed save completion after dispose', async () => {
    localStorage.clear()
    let resolveSave: ((snapshot: WriterSnapshot) => void) | undefined
    const save = vi.fn(() => new Promise<WriterSnapshot>((resolve) => { resolveSave = resolve }))
    const { coordinator, drafts, history, states } = createCoordinator(save)
    const snapshot = changed()
    coordinator.update(snapshot)
    const pending = coordinator.manualSave()

    coordinator.dispose()
    resolveSave?.(snapshot)
    await pending

    expect(states).toEqual(['dirty', 'saving'])
    expect(history).toEqual([])
    expect(drafts.read(1, 2)).toBeNull()
  })
})

describe('WriterSaveCoordinator writer-ready fixture integration', () => {
  beforeEach(() => localStorage.clear())

  it('saves an ordinary complete Polish fixture snapshot through the real coordinator', async () => {
    const markdown = WRITER_READY_FIXTURE.cards.markdown
    const fixtureInitial = createWriterReadySnapshot({
      cardId: markdown.id,
      title: markdown.title,
      content: markdown.content,
      contextTemplates: {
        generation: markdown.ai_context_template,
        review: markdown.ai_context_template_review,
      },
    })
    const changedFixture = createWriterReadySnapshot({
      cardId: markdown.id,
      title: 'Scena poboczna po zmianie',
      content: { content: 'Drugi syntetyczny akapit po zmianie.' },
      contextTemplates: {
        generation: 'Zmieniony szablon generowania',
        review: 'Zmieniony szablon recenzji',
      },
    })
    const save = vi.fn(async (snapshot: WriterSnapshot) => snapshot)
    const coordinator = new WriterSaveCoordinator({
      initial: fixtureInitial,
      save,
      drafts: new RecoveryDraftStore(localStorage, () => new Date()),
      now: () => new Date(),
    })

    coordinator.update(changedFixture)
    await expect(coordinator.manualSave()).resolves.toMatchObject({ ok: true, snapshot: changedFixture })

    expect(save).toHaveBeenCalledWith(changedFixture)
  })

  it('preserves intentional author-CJK as author content through the real coordinator', async () => {
    const fixtureInitial = createWriterReadySnapshot()
    const authorSnapshot = createWriterReadySnapshot({
      cardId: WRITER_READY_FIXTURE.cards.authorCJK.id,
      title: WRITER_READY_FIXTURE.cards.authorCJK.title,
      content: WRITER_READY_FIXTURE.cards.authorCJK.content,
      contextTemplates: {
        generation: WRITER_READY_FIXTURE.cards.authorCJK.ai_context_template,
        review: WRITER_READY_FIXTURE.cards.authorCJK.ai_context_template_review,
      },
    })
    const save = vi.fn(async (snapshot: WriterSnapshot) => snapshot)
    const coordinator = new WriterSaveCoordinator({
      initial: fixtureInitial,
      save,
      drafts: new RecoveryDraftStore(localStorage, () => new Date()),
      now: () => new Date(),
    })

    coordinator.update(authorSnapshot)
    await coordinator.manualSave()

    expect(save).toHaveBeenCalledWith(authorSnapshot)
    expect(save.mock.calls[0]?.[0]).toMatchObject({
      title: '中文作者',
      content: { content: '中文作者内容' },
      contextTemplates: { generation: '中文模板', review: '中文评论' },
    })
  })
})
