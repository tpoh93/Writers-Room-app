import { Transaction } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

import {
  validatePatch,
  type PatchValidation,
  type SelectionSnapshot,
} from './selectionPatch'

export async function applySelectionPipelineReplacement(
  view: EditorView,
  snapshot: SelectionSnapshot,
  replacement: string,
  applied: boolean
): Promise<PatchValidation> {
  const validation = await validatePatch(
    snapshot,
    view.state.doc.toString(),
    replacement,
    applied
  )

  if (validation.status !== 'ok') return validation

  view.dispatch({
    changes: {
      from: snapshot.from,
      to: snapshot.to,
      insert: replacement,
    },
    selection: {
      anchor: snapshot.from + replacement.length,
    },
    annotations: Transaction.userEvent.of('input.selection-pipeline'),
  })

  return validation
}
