import { describe, expect, it } from 'vitest'
import { resolveContentEditor } from '../contentEditorRegistry'

describe('contentEditorRegistry', () => {
  it('returns one stable lazy component for each supported editor and null for unsupported names', () => {
    expect(resolveContentEditor('CodeMirrorEditor')).toBe(resolveContentEditor('CodeMirrorEditor'))
    expect(resolveContentEditor('MarkdownTextEditor')).toBe(resolveContentEditor('MarkdownTextEditor'))
    expect(resolveContentEditor('UnsupportedEditor')).toBeNull()
  })
})
