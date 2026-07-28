import { fingerprintWriterSnapshot, snapshotsEqual, type WriterSnapshot } from './writerSnapshot'
import { type RecoveryDraftReason, type RecoveryDraftStore } from './recoveryDraftStore'

export type WriterSaveState = 'saved' | 'dirty' | 'saving' | 'save-error'
export type WriterFlushReason = 'manual' | 'retry' | 'card-change' | 'project-change' | 'export' | 'controlled-close' | 'recovered-draft' | 'restored-version'
export type WriterHistoryReason = 'manual' | 'recovered-draft' | 'restored-version' | 'autosave' | 'technical-flush'

export interface WriterSaveAttempt {
  historyReason: WriterHistoryReason
  flushReason: WriterFlushReason | null
}

export interface WriterSaveResult {
  ok: boolean
  snapshot?: WriterSnapshot
  error?: Error
}

export function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export interface WriterSaveCoordinatorOptions {
  initial: WriterSnapshot
  drafts: RecoveryDraftStore
  now: () => Date
  save?: (snapshot: WriterSnapshot) => Promise<WriterSnapshot>
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
  onStateChange?: (state: WriterSaveState, error: Error | null) => void
  onHistoryEligible?: (snapshot: WriterSnapshot, reason: WriterHistoryReason) => void
}

export class WriterSaveCoordinator {
  private readonly setTimer: typeof setTimeout
  private readonly clearTimer: typeof clearTimeout
  private current: WriterSnapshot
  private confirmed: WriterSnapshot
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null
  private state: WriterSaveState = 'saved'
  private inFlight = false
  private failedAttempt: WriterSaveAttempt | null = null

  constructor(private readonly options: WriterSaveCoordinatorOptions) {
    this.current = options.initial
    this.confirmed = options.initial
    this.setTimer = options.setTimeoutFn ?? setTimeout
    this.clearTimer = options.clearTimeoutFn ?? clearTimeout
  }

  update(snapshot: WriterSnapshot): void {
    this.current = snapshot
    if (snapshotsEqual(snapshot, this.confirmed)) {
      this.clearRecoveryTimers()
      this.clearAutosaveTimer()
      this.setState('saved', null)
      return
    }

    if (!this.inFlight) this.setState('dirty', null)
    this.scheduleAutosave()
    if (this.idleTimer !== null) this.clearTimer(this.idleTimer)
    this.idleTimer = this.setTimer(() => this.persistRecoveryDraft('local-idle'), 3_000)

    if (this.maxWaitTimer === null) {
      this.maxWaitTimer = this.setTimer(() => this.persistRecoveryDraft('local-idle'), 15_000)
    }
  }

  persistRecoveryDraft(reason: RecoveryDraftReason): void {
    if (snapshotsEqual(this.current, this.confirmed)) {
      this.clearRecoveryTimers()
      return
    }

    this.options.drafts.write({
      ...this.current,
      savedCardFingerprint: fingerprintWriterSnapshot(this.confirmed),
      draftFingerprint: fingerprintWriterSnapshot(this.current),
      capturedAt: this.options.now().toISOString(),
      reason,
    })
    this.clearRecoveryTimers()
  }

  async manualSave(): Promise<WriterSaveResult> {
    return this.saveLatest({ historyReason: 'manual', flushReason: 'manual' })
  }

  async flush(reason: WriterFlushReason): Promise<WriterSaveResult> {
    if (reason === 'manual') return this.manualSave()
    const historyReason: WriterHistoryReason = reason === 'recovered-draft'
      ? 'recovered-draft'
      : reason === 'restored-version'
        ? 'restored-version'
        : 'technical-flush'
    return this.saveLatest({ historyReason, flushReason: reason })
  }

  async retry(): Promise<WriterSaveResult> {
    if (this.inFlight || this.failedAttempt === null) {
      return { ok: false, error: new Error('No retryable save') }
    }
    return this.saveLatest(this.failedAttempt)
  }

  dispose(): void {
    this.clearRecoveryTimers()
    this.clearAutosaveTimer()
  }

  private async saveLatest(attempt: WriterSaveAttempt): Promise<WriterSaveResult> {
    if (this.inFlight) return { ok: false, error: new Error('Writer save already in flight') }
    const save = this.options.save
    if (!save) return { ok: false, error: new Error('Writer save is not configured') }

    const requestSnapshot = this.current
    this.inFlight = true
    this.setState('saving', null)
    try {
      const confirmed = await save(requestSnapshot)
      this.confirmed = confirmed
      this.failedAttempt = null
      if (attempt.historyReason !== 'autosave' && attempt.historyReason !== 'technical-flush') {
        this.options.onHistoryEligible?.(confirmed, attempt.historyReason)
      }
      if (snapshotsEqual(this.current, confirmed)) {
        this.options.drafts.remove(this.current.projectId, this.current.cardId)
        this.clearRecoveryTimers()
        this.clearAutosaveTimer()
        this.setState('saved', null)
      } else {
        this.persistRecoveryDraft('local-idle')
        this.setState('dirty', null)
        this.scheduleAutosave()
      }
      return { ok: true, snapshot: confirmed }
    } catch (error) {
      const saveError = asError(error)
      this.failedAttempt = attempt
      this.persistRecoveryDraft('failed-save')
      this.setState('save-error', saveError)
      this.scheduleAutosave()
      return { ok: false, error: saveError }
    } finally {
      this.inFlight = false
    }
  }

  private setState(state: WriterSaveState, error: Error | null): void {
    if (this.state === state && error === null) return
    this.state = state
    this.options.onStateChange?.(state, error)
  }

  private clearRecoveryTimers(): void {
    if (this.idleTimer !== null) this.clearTimer(this.idleTimer)
    if (this.maxWaitTimer !== null) this.clearTimer(this.maxWaitTimer)
    this.idleTimer = null
    this.maxWaitTimer = null
  }

  private scheduleAutosave(): void {
    if (this.autosaveTimer !== null || snapshotsEqual(this.current, this.confirmed)) return
    this.autosaveTimer = this.setTimer(async () => {
      this.autosaveTimer = null
      if (!snapshotsEqual(this.current, this.confirmed) && !this.inFlight) {
        await this.saveLatest({ historyReason: 'autosave', flushReason: null })
      }
      if (!snapshotsEqual(this.current, this.confirmed)) this.scheduleAutosave()
    }, 30_000)
  }

  private clearAutosaveTimer(): void {
    if (this.autosaveTimer !== null) this.clearTimer(this.autosaveTimer)
    this.autosaveTimer = null
  }
}
