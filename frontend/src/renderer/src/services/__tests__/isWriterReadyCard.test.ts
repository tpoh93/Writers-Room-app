import { describe, expect, it } from 'vitest'
import type { CardRead } from '@renderer/api/cards'
import { isWriterReadyCard } from '../isWriterReadyCard'

function cardWith(name: string, editorComponent: string): CardRead {
  return {
    id: 7,
    project_id: 3,
    title: 'Scena testowa',
    content: { content: 'Tekst' },
    card_type_id: 4,
    card_type: { id: 4, name, editor_component: editorComponent, is_ai_enabled: false, is_singleton: false, built_in: false },
    created_at: '2026-07-28T00:00:00Z',
    display_order: 0,
    ai_modified: false,
    needs_confirmation: false,
  }
}

describe('isWriterReadyCard', () => {
  it.each([
    ['章节正文', 'CodeMirrorEditor', true],
    ['通用文本', 'MarkdownTextEditor', true],
    ['场景卡', 'CodeMirrorEditor', false],
    ['章节正文', 'MarkdownTextEditor', false],
    ['Future prose', 'CodeMirrorEditor', false],
  ])('accepts %s / %s only when explicitly approved', (name, editorComponent, expected) => {
    expect(isWriterReadyCard(cardWith(name, editorComponent))).toBe(expected)
  })
})
