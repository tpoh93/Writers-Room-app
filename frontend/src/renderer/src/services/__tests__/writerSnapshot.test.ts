import { describe, expect, it } from 'vitest'
import type { CardRead } from '@renderer/api/cards'
import {
  canonicalizeJson,
  canonicalizeWriterSnapshot,
  createChapterWriterContent,
  createWriterSnapshot,
  fingerprintWriterSnapshot,
  snapshotsEqual,
  type WriterSnapshot,
} from '../writerSnapshot'

const base: WriterSnapshot = {
  projectId: 1,
  cardId: 2,
  title: 'Tytuł',
  content: { z: null, a: [{ b: 2, a: 1 }] },
  contextTemplates: { generation: 'Generuj', review: 'Sprawdź' },
}

function card(): CardRead {
  return {
    id: 2,
    project_id: 1,
    title: 'Tytuł',
    content: { z: null, a: [{ b: 2, a: 1 }] },
    ai_context_template: 'Generuj',
    ai_context_template_review: 'Sprawdź',
    card_type_id: 4,
    card_type: { id: 4, name: '章节正文', editor_component: 'CodeMirrorEditor', is_ai_enabled: false, is_singleton: false, built_in: false },
    created_at: '2026-07-28T00:00:00Z',
    display_order: 0,
    ai_modified: false,
    needs_confirmation: false,
  }
}

describe('writerSnapshot', () => {
  it('sorts nested object keys while preserving array order and null', () => {
    expect(canonicalizeJson({ z: null, a: [{ b: 2, a: 1 }] })).toEqual({ a: [{ a: 1, b: 2 }], z: null })
  })

  it('uses every writer-visible field but excludes project and card identity from fingerprint', () => {
    const reordered: WriterSnapshot = {
      ...base,
      projectId: 99,
      cardId: 100,
      content: { a: [{ a: 1, b: 2 }], z: null },
    }
    expect(fingerprintWriterSnapshot(reordered)).toBe(fingerprintWriterSnapshot(base))
    expect(fingerprintWriterSnapshot({ ...base, title: 'Inny' })).not.toBe(fingerprintWriterSnapshot(base))
    expect(fingerprintWriterSnapshot({ ...base, content: { content: 'Inny tekst' } })).not.toBe(fingerprintWriterSnapshot(base))
    expect(fingerprintWriterSnapshot({ ...base, contextTemplates: { ...base.contextTemplates, generation: 'Inaczej' } })).not.toBe(fingerprintWriterSnapshot(base))
    expect(fingerprintWriterSnapshot({ ...base, contextTemplates: { ...base.contextTemplates, review: 'Inaczej' } })).not.toBe(fingerprintWriterSnapshot(base))
  })

  it('creates a complete snapshot from the persisted card fields', () => {
    expect(createWriterSnapshot(card())).toEqual(base)
    expect(snapshotsEqual(base, { ...base, projectId: 2, cardId: 3 })).toBe(true)
  })

  it.each([null, undefined])('normalizes %s API templates to complete strings', (missingTemplate) => {
    const persistedCard = {
      ...card(),
      ai_context_template: missingTemplate,
      ai_context_template_review: missingTemplate,
    } as CardRead

    const snapshot = createWriterSnapshot(persistedCard)

    expect(snapshot.contextTemplates).toEqual({ generation: '', review: '' })
    expect(canonicalizeWriterSnapshot(snapshot)).toContain(
      '"contextTemplates":{"generation":"","review":""}',
    )
  })

  it('serializes chapter and markdown boundary content without weakening undefined rejection', () => {
    const chapterContent = createChapterWriterContent({
      content: 'Syntetyczny akapit.',
      word_count: 22,
      volume_number: undefined,
      chapter_number: undefined,
      title: 'Scena główna',
      entity_list: [],
    }, 'Syntetyczny akapit.')
    const chapterSnapshot = { ...base, content: chapterContent }
    const markdownSnapshot = createWriterSnapshot({
      ...card(),
      content: { content: 'Drugi syntetyczny akapit.' },
      ai_context_template: undefined,
      ai_context_template_review: null,
    } as CardRead)

    expect(() => canonicalizeWriterSnapshot(chapterSnapshot)).not.toThrow()
    expect(chapterContent).not.toHaveProperty('volume_number')
    expect(chapterContent).not.toHaveProperty('chapter_number')
    expect(() => canonicalizeWriterSnapshot(markdownSnapshot)).not.toThrow()

    const invalidAuthorContent = createChapterWriterContent({
      content: 'Tekst autora',
      author_metadata: { invalid: undefined } as unknown as WriterSnapshot['content'],
    }, 'Tekst autora')
    expect(() => canonicalizeWriterSnapshot({ ...base, content: invalidAuthorContent })).toThrow(TypeError)
  })

  it('rejects values outside JSON', () => {
    expect(() => canonicalizeJson(new Date() as unknown as WriterSnapshot['content'])).toThrow(TypeError)
  })
})
