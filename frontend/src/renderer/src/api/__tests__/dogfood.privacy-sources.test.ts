import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sensitiveRendererSources = [
  '../../components/cards/GenericCardEditor.vue',
  '../../components/editors/CodeMirrorEditor.vue',
  '../../composables/useAssistantStreamMessageOps.ts',
  '../../../../main/index.ts',
  '../../../../preload/index.ts',
]

describe('DOGFOOD-01 renderer privacy boundary', () => {
  it('does not leave browser console calls on prompt, assistant, editor, or IPC paths', () => {
    for (const relativePath of sensitiveRendererSources) {
      const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')
      expect(source).not.toMatch(/\bconsole\.(?:log|debug|info|warn|error)\s*\(/)
    }
  })
})
