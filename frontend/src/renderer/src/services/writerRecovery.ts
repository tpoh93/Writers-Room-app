import { type RecoveryDraftRecord } from './recoveryDraftStore'
import { fingerprintWriterSnapshot, type WriterSnapshot } from './writerSnapshot'

export type RecoveryKind = 'redundant' | 'ordinary' | 'conflict'

export interface RecoveryComparison {
  kind: RecoveryKind
  canonicalFingerprint: string
  draft: RecoveryDraftRecord
}

export function compareRecoveryDraft(draft: RecoveryDraftRecord, canonical: WriterSnapshot): RecoveryComparison {
  const canonicalFingerprint = fingerprintWriterSnapshot(canonical)
  if (draft.draftFingerprint === canonicalFingerprint) return { kind: 'redundant', canonicalFingerprint, draft }
  if (draft.savedCardFingerprint === canonicalFingerprint) return { kind: 'ordinary', canonicalFingerprint, draft }
  return { kind: 'conflict', canonicalFingerprint, draft }
}
