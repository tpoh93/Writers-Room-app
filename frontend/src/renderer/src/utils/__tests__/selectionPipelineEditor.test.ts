import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { history, undo } from '@codemirror/commands'
import { afterEach, describe, expect, it } from 'vitest'

import { captureSelection } from '../selectionPatch'
import { applySelectionPipelineReplacement } from '../selectionPipelineEditor'

let view: EditorView | null = null

afterEach(() => {
  view?.destroy()
  view = null
  document.body.innerHTML = ''
})

function createView(text: string): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  view = new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      extensions: [history()],
    }),
  })
  return view
}

describe('selection pipeline editor transaction', () => {
  it('changes only the captured range and undo restores the exact source', async () => {
    const source = 'Przed sceną.\n**Zażółć gęślą jaźń.**\nPo scenie.'
    const selected = 'Zażółć gęślą jaźń.'
    const from = source.indexOf(selected)
    const snapshot = await captureSelection(source, from, from + selected.length)
    const editor = createView(source)

    const result = await applySelectionPipelineReplacement(
      editor,
      snapshot,
      'Nowa wersja.',
      false
    )

    expect(result).toEqual({ status: 'ok' })
    expect(editor.state.doc.toString()).toBe(
      'Przed sceną.\n**Nowa wersja.**\nPo scenie.'
    )
    expect(undo(editor)).toBe(true)
    expect(editor.state.doc.toString()).toBe(source)
  })

  it('rejects a stale snapshot without dispatching a change', async () => {
    const source = 'Przed. Tekst. Po.'
    const from = source.indexOf('Tekst')
    const snapshot = await captureSelection(source, from, from + 'Tekst'.length)
    const editor = createView('Przed! Tekst. Po.')

    const result = await applySelectionPipelineReplacement(
      editor,
      snapshot,
      'Zmiana',
      false
    )

    expect(result.status).toBe('conflict')
    expect(editor.state.doc.toString()).toBe('Przed! Tekst. Po.')
    expect(undo(editor)).toBe(false)
  })

  it('blocks a second accept without changing the document', async () => {
    const source = 'Ala ma kota.'
    const snapshot = await captureSelection(source, 0, 3)
    const editor = createView(source)

    const result = await applySelectionPipelineReplacement(
      editor,
      snapshot,
      'Ola',
      true
    )

    expect(result.status).toBe('already_applied')
    expect(editor.state.doc.toString()).toBe(source)
  })
})
