import type { WriterSnapshot } from '../services/writerSnapshot'

export const WRITER_READY_FIXTURE = {
  project: {
    name: 'WRITER-READY Fixture',
    description: 'Synthetic writer acceptance data',
  } as const,
  cardTypes: {
    chapter: {
      name: '章节正文',
      editor_component: 'CodeMirrorEditor',
    } as const,
    markdown: {
      name: '通用文本',
      editor_component: 'MarkdownTextEditor',
    } as const,
    // author CJK
    authorCJK: {
      name: '场景卡',
      editor_component: 'GenericCardEditor',
    } as const,
  } as const,
  cards: {
    chapter: {
      id: 1,
      title: 'Scena główna',
      content: { content: 'Syntetyczny akapit.' },
      ai_context_template: 'Szablon generowania',
      ai_context_template_review: 'Szablon recenzji',
      parent_id: null,
      display_order: 10,
    } as const,
    markdown: {
      id: 2,
      title: 'Scena poboczna',
      content: { content: 'Drugi syntetyczny akapit.' },
      ai_context_template: 'Szablon generowania',
      ai_context_template_review: 'Szablon recenzji',
      parent_id: 1,
      display_order: 20,
    } as const,
    authorCJK: {
      id: 3,
      title: '中文作者',
      content: { content: '中文作者内容' },
      ai_context_template: '中文模板',
      ai_context_template_review: '中文评论',
      parent_id: 1,
      display_order: 30,
    } as const,
  } as const,
} as const

export type WriterReadyCardId = keyof typeof WRITER_READY_FIXTURE.cards
