import { describe, expect, it } from 'vitest'

import { captureSelection, validatePatch } from '../selectionPatch'

describe('selection patch safety', () => {
  it('accepts an unchanged Polish selection', async () => {
    const doc = 'Przed. Zażółć gęślą jaźń. Po.'
    const from = doc.indexOf('Zażółć')
    const to = from + 'Zażółć gęślą jaźń'.length
    const snapshot = await captureSelection(doc, from, to)

    expect(await validatePatch(snapshot, doc, 'Nowy tekst', false)).toEqual({ status: 'ok' })
  })

  it('captures JavaScript UTF-16 ranges containing emoji', async () => {
    const doc = 'A🙂B'
    const snapshot = await captureSelection(doc, 1, 3)

    expect(snapshot.text).toBe('🙂')
    expect(await validatePatch(snapshot, doc, '🌙', false)).toEqual({ status: 'ok' })
  })

  it('blocks any document change during Sprint 0', async () => {
    const doc = 'Ala ma kota.'
    const snapshot = await captureSelection(doc, 0, 3)

    expect(
      (await validatePatch(snapshot, 'Ala ma dwa koty.', 'Ola', false)).status
    ).toBe('conflict')
  })

  it('blocks duplicate application', async () => {
    const doc = '**tekst**'
    const snapshot = await captureSelection(doc, 2, 7)

    expect((await validatePatch(snapshot, doc, 'nowy', true)).status).toBe('already_applied')
  })

  it('blocks an empty replacement', async () => {
    const doc = 'Ala ma kota.'
    const snapshot = await captureSelection(doc, 0, 3)

    expect((await validatePatch(snapshot, doc, '   ', false)).status).toBe('conflict')
  })

  it('rejects invalid capture ranges', async () => {
    await expect(captureSelection('tekst', 3, 2)).rejects.toThrow(RangeError)
    await expect(captureSelection('tekst', 0, 8)).rejects.toThrow(RangeError)
  })

  it('blocks a forged snapshot even when the document hash matches', async () => {
    const doc = 'Ala ma kota.'
    const snapshot = await captureSelection(doc, 0, 3)
    const forged = { ...snapshot, text: 'Ola' }

    expect((await validatePatch(forged, doc, 'Ela', false)).status).toBe('conflict')
  })
})
