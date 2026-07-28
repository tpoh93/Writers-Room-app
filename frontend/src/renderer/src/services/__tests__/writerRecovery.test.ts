import { describe, expect, it } from 'vitest'
import { compareRecoveryDraft } from '../writerRecovery'
import { fingerprintWriterSnapshot, type WriterSnapshot } from '../writerSnapshot'
import { recordVersionIfEligible } from '../versionService'

const canonical: WriterSnapshot = {
  projectId: 1, cardId: 2, title: 'Scena', content: { content: 'A' }, contextTemplates: { generation: 'G', review: 'R' },
}
const changed: WriterSnapshot = { ...canonical, content: { content: 'B' } }
const canonicalFingerprint = fingerprintWriterSnapshot(canonical)
const changedFingerprint = fingerprintWriterSnapshot(changed)

describe('compareRecoveryDraft', () => {
  it('classifies redundant, ordinary and both canonical-divergence variants', () => {
    expect(compareRecoveryDraft({ ...changed, draftFingerprint: canonicalFingerprint, savedCardFingerprint: canonicalFingerprint, capturedAt: '', reason: 'local-idle' }, canonical).kind).toBe('redundant')
    expect(compareRecoveryDraft({ ...changed, draftFingerprint: changedFingerprint, savedCardFingerprint: canonicalFingerprint, capturedAt: '', reason: 'local-idle' }, canonical).kind).toBe('ordinary')
    expect(compareRecoveryDraft({ ...changed, draftFingerprint: changedFingerprint, savedCardFingerprint: changedFingerprint, capturedAt: '', reason: 'local-idle' }, canonical).kind).toBe('conflict')
    expect(compareRecoveryDraft({ ...changed, draftFingerprint: changedFingerprint, savedCardFingerprint: 'another-base', capturedAt: '', reason: 'local-idle' }, canonical).kind).toBe('conflict')
  })
})

describe('writer version history', () => {
  it('deduplicates a legacy version without a stored fingerprint', () => {
    localStorage.clear()
    localStorage.setItem('nf:v1:versions:1', JSON.stringify({ 2: [{ id: 'legacy', cardId: 2, projectId: 1, title: 'Scena', content: { content: 'A' }, ai_context_template: 'G', ai_context_template_review: 'R', createdAt: '' }] }))
    expect(recordVersionIfEligible(1, { cardId: 2, projectId: 1, title: 'Scena', content: { content: 'A' }, ai_context_template: 'G', ai_context_template_review: 'R' }, 'manual')).toBe(false)
    expect(recordVersionIfEligible(1, { cardId: 2, projectId: 1, title: 'Scena', content: { content: 'B' }, ai_context_template: 'G', ai_context_template_review: 'R' }, 'autosave')).toBe(false)
  })
})
