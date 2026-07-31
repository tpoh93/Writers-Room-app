import { describe, expect, it } from 'vitest'

import { buildAuthorContextPreview } from '@renderer/services/contextPreview'

describe('buildAuthorContextPreview', () => {
  it('renders Polish sections while preserving author excerpts verbatim', () => {
    const raw = {
      fact_summaries: ['Autorska notatka 中文 pozostaje bez zmian.'],
      relation_summaries: [{
        a: 'Ala', b: 'Bartek', kind: '同盟', stance: '友好',
        description: 'Wspólnie strzegą mapy.',
        recent_dialogues: ['Nie zgub mapy.'],
      }],
      item_summaries: [{ name: 'Mapa', description: 'Prowadzi do miasta.', owner_hint: 'Ala' }],
    }

    const preview = buildAuthorContextPreview(raw, 'raw_template: @self.content.secret')

    expect(preview.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Kluczowe fakty', entries: ['Autorska notatka 中文 pozostaje bez zmian.'] }),
      expect.objectContaining({ title: 'Podsumowanie relacji', entries: expect.arrayContaining(['Ala ↔ Bartek · Sojusz · Przyjazne', 'Opis: Wspólnie strzegą mapy.', 'Przykłady rozmów: Nie zgub mapy.']) }),
      expect.objectContaining({ title: 'Podsumowanie przedmiotów', entries: expect.arrayContaining(['Mapa', 'Opis: Prowadzi do miasta.', 'Właściciel: Ala']) }),
    ]))
    expect(preview.technicalText).toBe('raw_template: @self.content.secret')
  })

  it('does not mutate the assembled payload and keeps raw output out of the author view', () => {
    const raw = { fact_summaries: ['Fakt'], relation_summaries: [] }
    const before = JSON.stringify(raw)

    const preview = buildAuthorContextPreview(raw, 'internal_id=42')

    expect(JSON.stringify(raw)).toBe(before)
    expect(JSON.stringify(preview.sections)).not.toContain('internal_id')
    expect(preview.technicalText).toBe('internal_id=42')
  })
})
