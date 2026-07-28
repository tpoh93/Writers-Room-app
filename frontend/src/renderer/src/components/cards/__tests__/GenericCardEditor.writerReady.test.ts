import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { CardRead } from '@renderer/api/cards'
import type { WriterEditorAdapter } from '@renderer/composables/useWriterCardSession'
import type { WriterSnapshot } from '@renderer/services/writerSnapshot'

const { updateWriterCard } = vi.hoisted(() => ({ updateWriterCard: vi.fn() }))
vi.mock('@renderer/api/cards', async () => {
  const actual = await vi.importActual<typeof import('@renderer/api/cards')>('@renderer/api/cards')
  return { ...actual, updateWriterCard }
})

import { useWriterCardSession } from '@renderer/composables/useWriterCardSession'

const snapshot: WriterSnapshot = {
  projectId: 1,
  cardId: 2,
  title: 'Scena',
  content: { content: 'Tekst' },
  contextTemplates: { generation: 'Generowanie', review: 'Redakcja' },
}

describe('GenericCardEditor writer-ready session', () => {
  it.each(['Zapisz + CodeMirror', 'Cmd/Ctrl+S + CodeMirror', 'Zapisz + MarkdownTextEditor', 'Cmd/Ctrl+S + MarkdownTextEditor'])('%s uses one manual save command', async () => {
    updateWriterCard.mockResolvedValueOnce({ id: 2, project_id: 1, title: 'Scena', content: snapshot.content })
    const adapter = ref<WriterEditorAdapter>({
      getSnapshot: () => snapshot,
      setSavedBaseline: vi.fn(),
      setSnapshot: vi.fn(),
    })
    const session = useWriterCardSession(ref({ id: 2, project_id: 1 } as CardRead), adapter)

    await expect(session.manualSave()).resolves.toMatchObject({ ok: true })
    expect(updateWriterCard).toHaveBeenCalledWith(2, expect.objectContaining({
      title: 'Scena',
      content: snapshot.content,
      ai_context_template: 'Generowanie',
      ai_context_template_review: 'Redakcja',
      needs_confirmation: false,
    }))
    expect(adapter.value.setSavedBaseline).toHaveBeenCalledWith(expect.objectContaining(snapshot))
    session.dispose()
  })
})
