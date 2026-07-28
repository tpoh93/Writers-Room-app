import { defineAsyncComponent, type Component } from 'vue'

const contentEditors: Record<string, Component> = {
  CodeMirrorEditor: defineAsyncComponent(() => import('./CodeMirrorEditor.vue')),
  MarkdownTextEditor: defineAsyncComponent(() => import('./MarkdownTextEditor.vue')),
}

export function resolveContentEditor(editorName: string | null | undefined): Component | null {
  if (!editorName) return null
  return contentEditors[editorName] ?? null
}
