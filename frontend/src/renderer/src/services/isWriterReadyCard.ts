import type { CardRead } from '@renderer/api/cards'

export function isWriterReadyCard(card: CardRead): boolean {
  const cardType = card.card_type
  return (
    (cardType?.name === '章节正文' && cardType.editor_component === 'CodeMirrorEditor') ||
    (cardType?.name === '通用文本' && cardType.editor_component === 'MarkdownTextEditor')
  )
}
