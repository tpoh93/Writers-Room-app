import { fingerprintWriterSnapshot, snapshotsEqual, type WriterSnapshot } from './writerSnapshot'
import { type RecoveryDraftReason, type RecoveryDraftStore } from './recoveryDraftStore'

export interface WriterSaveCoordinatorOptions {
  initial: WriterSnapshot
  drafts: RecoveryDraftStore
  now: () => Date
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
}

export class WriterSaveCoordinator {
  private readonly setTimer: typeof setTimeout
  private readonly clearTimer: typeof clearTimeout
  private current: WriterSnapshot
  private readonly confirmed: WriterSnapshot
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null

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
      return
    }

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

  dispose(): void {
    this.clearRecoveryTimers()
  }

  private clearRecoveryTimers(): void {
    if (this.idleTimer !== null) this.clearTimer(this.idleTimer)
    if (this.maxWaitTimer !== null) this.clearTimer(this.maxWaitTimer)
    this.idleTimer = null
    this.maxWaitTimer = null
  }
}
