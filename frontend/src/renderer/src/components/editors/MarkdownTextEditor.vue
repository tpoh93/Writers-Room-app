<template>
  <div class="markdown-text-editor">
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-segmented v-model="mode" :options="modeOptions" size="small" />
      </div>
      <div class="toolbar-right">
        <span class="char-count">{{ t('editor.characterCount', { count: charCount }) }}</span>
      </div>
    </div>

    <div class="editor-body" v-if="mode === 'edit'">
      <el-input
        v-model="textContent"
        type="textarea"
        :rows="24"
        resize="none"
        :placeholder="t('editor.markdownPlaceholder')"
        class="markdown-textarea"
      />
    </div>

    <div class="preview-body" v-else>
      <XMarkdown
        :markdown="textContent || t('editor.noContent')"
        :default-theme-mode="isDarkMode ? 'dark' : 'light'"
        class="markdown-preview"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { XMarkdown } from 'vue-element-plus-x'
import type { CardRead } from '@renderer/api/cards'
import { useAppStore } from '@renderer/stores/useAppStore'
import { getCardContextTemplates, type ContextTemplates } from '@renderer/services/contextSlots'
import type { WriterSnapshot } from '@renderer/services/writerSnapshot'

const { t } = useI18n()

const props = defineProps<{
  card: CardRead
  contextTemplates?: ContextTemplates
}>()

const emit = defineEmits<{
  (e: 'update:dirty', value: boolean): void
  (e: 'manual-save'): void
}>()

const appStore = useAppStore()
const isDarkMode = computed(() => appStore.isDarkMode)

const mode = ref<'edit' | 'preview'>('preview')
const modeOptions = [
  { label: t('common.edit'), value: 'edit' },
  { label: t('editor.preview'), value: 'preview' },
]

const textContent = ref('')
const originalContent = ref('')
const charCount = computed(() => {
  const text = textContent.value || ''
  const normalized = text.replace(/\s+/g, '')
  return normalized.length
})

function extractText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object' && typeof content.content === 'string') return content.content
  return ''
}

watch(
  () => props.card,
  (nextCard) => {
    const text = extractText(nextCard?.content)
    textContent.value = text
    originalContent.value = text
    emit('update:dirty', false)
  },
  { immediate: true, deep: true }
)

watch(textContent, (next) => {
  emit('update:dirty', next !== originalContent.value)
})

function getSnapshot(): WriterSnapshot {
  return {
    projectId: props.card.project_id,
    cardId: props.card.id,
    title: props.card.title,
    content: {
      ...(typeof props.card.content === 'object' && props.card.content ? props.card.content : {}),
      content: textContent.value,
    },
    contextTemplates: props.contextTemplates ?? getCardContextTemplates(props.card),
  }
}

function setSavedBaseline(snapshot: WriterSnapshot): void {
  originalContent.value = extractText(snapshot.content)
  emit('update:dirty', false)
}

function setSnapshot(snapshot: WriterSnapshot): void {
  const text = extractText(snapshot.content)
  textContent.value = text
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    emit('manual-save')
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

defineExpose({
  getSnapshot,
  setSavedBaseline,
  setSnapshot,
})
</script>

<style scoped>
.markdown-text-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
}

.char-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.editor-body,
.preview-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
}

.markdown-textarea {
  height: 100%;
}

.markdown-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 100% !important;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
  caret-color: var(--el-color-primary);
}

.markdown-textarea :deep(.el-textarea__inner::placeholder) {
  color: var(--el-text-color-placeholder);
}

.preview-body {
  overflow: auto;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
}

.markdown-preview {
  min-height: 100%;
  color: var(--el-text-color-primary);
}

.markdown-preview :deep(.markdown-body) {
  background: transparent;
  color: inherit;
}
</style>
