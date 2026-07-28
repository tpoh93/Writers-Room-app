import type { WriterSnapshot } from './writerSnapshot'

export type RecoveryDraftReason = 'local-idle' | 'failed-save' | 'network-error' | 'force-close'

export interface RecoveryDraftRecord extends WriterSnapshot {
  savedCardFingerprint: string
  draftFingerprint: string
  capturedAt: string
  reason: RecoveryDraftReason
}

export class RecoveryDraftStore {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date
  ) {}

  key(projectId: number, cardId: number): string {
    return `nf:v1:writer-recovery:${projectId}:${cardId}`
  }

  read(projectId: number, cardId: number): RecoveryDraftRecord | null {
    const value = this.storage.getItem(this.key(projectId, cardId))
    if (!value) return null
    try {
      return JSON.parse(value) as RecoveryDraftRecord
    } catch {
      return null
    }
  }

  write(record: RecoveryDraftRecord): void {
    this.storage.setItem(this.key(record.projectId, record.cardId), JSON.stringify(record))
  }

  remove(projectId: number, cardId: number): void {
    this.storage.removeItem(this.key(projectId, cardId))
  }

  timestamp(): string {
    return this.now().toISOString()
  }
}
