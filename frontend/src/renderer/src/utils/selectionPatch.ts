export interface SelectionSnapshot {
  from: number
  to: number
  text: string
  documentHash: string
}

export type PatchValidation =
  | { status: 'ok' }
  | { status: 'conflict'; reason: string }
  | { status: 'already_applied' }

function hasValidRange(document: string, from: number, to: number): boolean {
  return Number.isInteger(from)
    && Number.isInteger(to)
    && from >= 0
    && to > from
    && to <= document.length
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function captureSelection(
  document: string,
  from: number,
  to: number
): Promise<SelectionSnapshot> {
  if (!hasValidRange(document, from, to)) {
    throw new RangeError('Invalid selection range')
  }

  return {
    from,
    to,
    text: document.slice(from, to),
    documentHash: await sha256(document)
  }
}

export async function validatePatch(
  snapshot: SelectionSnapshot,
  currentDocument: string,
  replacement: string,
  applied: boolean
): Promise<PatchValidation> {
  if (applied) {
    return { status: 'already_applied' }
  }

  if (!replacement.trim()) {
    return { status: 'conflict', reason: 'Replacement is empty' }
  }

  if (!hasValidRange(currentDocument, snapshot.from, snapshot.to)) {
    return { status: 'conflict', reason: 'Selection snapshot range is invalid' }
  }

  if (await sha256(currentDocument) !== snapshot.documentHash) {
    return { status: 'conflict', reason: 'Document changed after pipeline launch' }
  }

  if (currentDocument.slice(snapshot.from, snapshot.to) !== snapshot.text) {
    return { status: 'conflict', reason: 'Selected text no longer matches' }
  }

  return { status: 'ok' }
}
