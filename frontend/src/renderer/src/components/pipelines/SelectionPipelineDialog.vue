<template>
  <el-dialog
    :model-value="visible"
    :title="t('selectionPipeline.title')"
    width="min(960px, 94vw)"
    destroy-on-close
    @update:model-value="handleVisibility"
  >
    <div class="selection-pipeline-dialog">
      <el-alert
        v-if="conflict"
        data-test="conflict-alert"
        type="error"
        :closable="false"
        show-icon
        :title="t('selectionPipeline.conflictTitle')"
        :description="conflict"
      />
      <el-alert
        v-else-if="runError"
        data-test="run-error"
        type="error"
        :closable="false"
        show-icon
        :title="t('selectionPipeline.stoppedTitle')"
        :description="runError"
      />

      <section class="pipeline-setup">
        <label class="field-label" for="pipeline-brief">{{ t('selectionPipeline.brief') }}</label>
        <el-input
          id="pipeline-brief"
          v-model="brief"
          data-test="brief-input"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 5 }"
          :placeholder="t('selectionPipeline.briefPlaceholder')"
          :disabled="running"
        />

        <div class="model-grid">
          <label v-for="step in orderedSteps" :key="step.key" class="model-field">
            <span>{{ step.label }}</span>
            <el-select
              v-model="selectedModels[step.key]"
              :data-test="`${step.key}-model`"
              :disabled="running"
              :placeholder="t('selectionPipeline.selectConfiguration')"
            >
              <el-option
                v-for="option in modelOptions"
                :key="option.id"
                :label="option.display_name"
                :value="option.id"
              />
            </el-select>
          </label>
        </div>

        <el-button
          data-test="start"
          type="primary"
          :loading="running && !runId"
          :disabled="running || !canStart"
          @click="start"
        >
          {{ t('selectionPipeline.start') }}
        </el-button>
      </section>

      <section class="pipeline-status" :aria-label="t('selectionPipeline.stages')">
        <div
          v-for="step in orderedSteps"
          :key="step.key"
          class="status-row"
          :data-test="`step-${step.key}`"
        >
          <strong>{{ step.label }}</strong>
          <el-tag :type="tagType(steps[step.key].status)">
            {{ statusLabel(steps[step.key].status) }}
          </el-tag>
        </div>
      </section>

      <el-collapse v-if="hasAnyOutput" class="pipeline-outputs">
        <el-collapse-item
          v-for="step in orderedSteps"
          :key="step.key"
          :title="t('selectionPipeline.resultTitle', { step: step.label })"
          :name="step.key"
          :disabled="!steps[step.key].output"
        >
          <pre :data-test="`${step.key}-output`">{{ steps[step.key].output || t('selectionPipeline.noResult') }}</pre>
        </el-collapse-item>
      </el-collapse>

      <section class="comparison" :aria-label="t('selectionPipeline.comparisonAria')">
        <div class="comparison-header">
          <strong>{{ t('selectionPipeline.comparison') }}</strong>
          <span data-test="change-summary">
            {{ changedLineLabel }} · {{ wordDeltaLabel }}
          </span>
        </div>
        <div class="comparison-grid">
          <article>
            <h4>{{ t('selectionPipeline.original') }}</h4>
            <pre data-test="source-text" class="word-diff"><template v-for="(segment, index) in sourceWordDiff" :key="index"><mark v-if="segment.changed">{{ segment.text }}</mark><span v-else>{{ segment.text }}</span></template></pre>
          </article>
          <article>
            <h4>{{ t('selectionPipeline.aionVersion') }}</h4>
            <pre data-test="final-text" class="word-diff"><template v-for="(segment, index) in finalWordDiff" :key="index"><mark v-if="segment.changed">{{ segment.text }}</mark><span v-else>{{ segment.text }}</span></template></pre>
          </article>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="dialog-actions">
        <el-button data-test="close" @click="closeDialog">{{ t('selectionPipeline.close') }}</el-button>
        <el-button data-test="reject" @click="reject">{{ t('selectionPipeline.reject') }}</el-button>
        <el-button
          data-test="retry"
          :disabled="!canRetry"
          :loading="running"
          @click="retry"
        >
          {{ t('selectionPipeline.retryFailed') }}
        </el-button>
        <el-button
          data-test="accept"
          type="primary"
          :disabled="acceptDisabled"
          @click="accept"
        >
          {{ t('selectionPipeline.apply') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  startSelectionPipeline,
  streamSelectionPipeline,
  type PipelineNodeState,
  type PipelineStepName,
  type PipelineStepStatus,
  type SelectionPipelineStream,
} from '@renderer/api/selectionPipelines'

export interface PipelineModelOption {
  id: number
  display_name: string
}

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  sourceText: string
  modelOptions: PipelineModelOption[]
  conflict?: string
  idempotencyKey?: string
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'accept', replacement: string): void
  (event: 'reject'): void
  (event: 'close'): void
}>()

interface StepViewState {
  status: PipelineStepStatus
  output: string
  error: string
}

const orderedSteps: Array<{ key: PipelineStepName; label: string }> = [
  { key: 'kimi', label: t('selectionPipeline.kimiStep') },
  { key: 'grok', label: t('selectionPipeline.grokStep') },
  { key: 'aion', label: t('selectionPipeline.aionStep') },
]

const brief = ref('')
const running = ref(false)
const runId = ref<number | null>(null)
const workflowId = ref<number | null>(null)
const runError = ref('')
let stream: SelectionPipelineStream | null = null

const selectedModels = reactive<Record<PipelineStepName, number | null>>({
  kimi: null,
  grok: null,
  aion: null,
})

const steps = reactive<Record<PipelineStepName, StepViewState>>({
  kimi: { status: 'idle', output: '', error: '' },
  grok: { status: 'idle', output: '', error: '' },
  aion: { status: 'idle', output: '', error: '' },
})

function closeStream(): void {
  stream?.close()
  stream = null
}

function resetStepStates(): void {
  for (const step of orderedSteps) {
    steps[step.key].status = 'idle'
    steps[step.key].output = ''
    steps[step.key].error = ''
  }
}

function preferredModelId(keyword: string, fallbackIndex: number): number | null {
  const normalized = keyword.toLowerCase()
  const preferred = props.modelOptions.find(option =>
    option.display_name.toLowerCase().includes(normalized)
  )
  return preferred?.id ?? props.modelOptions[fallbackIndex]?.id ?? null
}

function selectDefaultModels(): void {
  selectedModels.kimi = preferredModelId('kimi', 0)
  selectedModels.grok = preferredModelId('grok', 1)
  selectedModels.aion = preferredModelId('aion', 2)
}

function resetDialog(): void {
  closeStream()
  running.value = false
  runId.value = null
  workflowId.value = null
  runError.value = ''
  brief.value = ''
  resetStepStates()
  selectDefaultModels()
}

watch(
  () => props.visible,
  visible => {
    if (visible) resetDialog()
    else closeStream()
  },
  { immediate: true }
)

watch(
  () => props.modelOptions,
  () => {
    if (!running.value && runId.value == null) selectDefaultModels()
  },
  { deep: true }
)

const canStart = computed(() => {
  const ids = [selectedModels.kimi, selectedModels.grok, selectedModels.aion]
  return ids.every(id => typeof id === 'number' && id > 0)
    && new Set(ids).size === 3
    && props.sourceText.trim().length > 0
})

const finalText = computed(() => steps.aion.output)
const hasAnyOutput = computed(() => orderedSteps.some(step => steps[step.key].output))
const canRetry = computed(() =>
  !running.value
  && runId.value != null
  && workflowId.value != null
  && orderedSteps.some(step => steps[step.key].status === 'error')
)
const acceptDisabled = computed(() =>
  running.value
  || steps.aion.status !== 'success'
  || !finalText.value.trim()
  || Boolean(runError.value)
  || Boolean(props.conflict)
)

function tokenize(value: string): string[] {
  return value.match(/\s+|[^\s]+/g) ?? []
}

function wordDiff(
  current: string,
  other: string
): Array<{ text: string; changed: boolean }> {
  const currentTokens = tokenize(current)
  const otherTokens = tokenize(other)
  let prefix = 0
  while (
    prefix < currentTokens.length
    && prefix < otherTokens.length
    && currentTokens[prefix] === otherTokens[prefix]
  ) prefix += 1

  let suffix = 0
  while (
    suffix < currentTokens.length - prefix
    && suffix < otherTokens.length - prefix
    && currentTokens[currentTokens.length - 1 - suffix]
      === otherTokens[otherTokens.length - 1 - suffix]
  ) suffix += 1

  return currentTokens.map((text, index) => ({
    text,
    changed: index >= prefix && index < currentTokens.length - suffix,
  }))
}

const sourceWordDiff = computed(() => wordDiff(props.sourceText, finalText.value))
const finalWordDiff = computed(() => wordDiff(finalText.value, props.sourceText))
const changedLineCount = computed(() => {
  const sourceLines = props.sourceText.split('\n')
  const finalLines = finalText.value.split('\n')
  const count = Math.max(sourceLines.length, finalLines.length)
  let changed = 0
  for (let index = 0; index < count; index += 1) {
    if ((sourceLines[index] ?? '') !== (finalLines[index] ?? '')) changed += 1
  }
  return changed
})
const changedLineLabel = computed(() => t('selectionPipeline.changedLines', changedLineCount.value))
const wordDeltaLabel = computed(() => {
  const sourceWords = props.sourceText.trim() ? props.sourceText.trim().split(/\s+/).length : 0
  const finalWords = finalText.value.trim() ? finalText.value.trim().split(/\s+/).length : 0
  const delta = finalWords - sourceWords
  return t(
    'selectionPipeline.wordDelta',
    { count: `${delta >= 0 ? '+' : ''}${delta}` },
    Math.abs(delta),
  )
})

function tagType(status: PipelineStepStatus): 'info' | 'warning' | 'success' | 'danger' {
  if (status === 'success') return 'success'
  if (status === 'error') return 'danger'
  if (status === 'running') return 'warning'
  return 'info'
}

function statusLabel(status: PipelineStepStatus): string {
  return {
    idle: t('selectionPipeline.idle'),
    queued: t('selectionPipeline.queued'),
    running: t('selectionPipeline.running'),
    success: t('selectionPipeline.success'),
    error: t('selectionPipeline.error'),
  }[status]
}

function syncNodeStates(states: PipelineNodeState[]): void {
  for (const state of states) {
    if (state.node_id !== 'kimi' && state.node_id !== 'grok' && state.node_id !== 'aion') {
      continue
    }
    const step = state.node_id
    steps[step].status = state.status === 'success'
      ? 'success'
      : state.status === 'error'
        ? 'error'
        : state.status === 'running'
          ? 'running'
          : 'queued'
    const output = state.outputs_json?.text
    if (typeof output === 'string') steps[step].output = output
    steps[step].error = state.error_message ?? ''
  }
}

function openStream(resume: boolean): void {
  if (workflowId.value == null || runId.value == null) return
  closeStream()
  running.value = true
  runError.value = ''

  stream = streamSelectionPipeline(
    workflowId.value,
    runId.value,
    {
      onStepStart(step) {
        steps[step].status = 'running'
        steps[step].error = ''
      },
      onStepComplete(step, output) {
        steps[step].status = 'success'
        if (typeof output === 'string') steps[step].output = output
      },
      onStepError(step, message) {
        steps[step].status = 'error'
        steps[step].error = message
      },
      onFinished(result) {
        syncNodeStates(result.states)
        if (!result.finalReplacement.trim()) {
          runError.value = t('selectionPipeline.noFinalText')
        }
      },
      onError(message) {
        runError.value = message
      },
      onEnd() {
        running.value = false
        stream = null
      },
    },
    resume
  )
}

async function start(): Promise<void> {
  if (!canStart.value) return
  resetStepStates()
  for (const step of orderedSteps) steps[step.key].status = 'queued'
  runError.value = ''
  running.value = true

  try {
    const started = await startSelectionPipeline({
      sourceText: props.sourceText,
      brief: brief.value.trim() || 'Popraw zaznaczenie, zachowując sens, fakty i punkt widzenia.',
      kimiLlmConfigId: selectedModels.kimi as number,
      grokLlmConfigId: selectedModels.grok as number,
      aionLlmConfigId: selectedModels.aion as number,
      idempotencyKey: props.idempotencyKey,
    })
    runId.value = started.runId
    workflowId.value = started.workflowId
    openStream(false)
  } catch (error) {
    running.value = false
    runError.value = error instanceof Error ? error.message : t('selectionPipeline.startError')
  }
}

function retry(): void {
  if (!canRetry.value) return
  for (const step of orderedSteps) {
    if (steps[step.key].status === 'error') {
      steps[step.key].status = 'queued'
      steps[step.key].error = ''
    }
  }
  openStream(true)
}

function accept(): void {
  if (acceptDisabled.value) return
  emit('accept', finalText.value)
}

function reject(): void {
  emit('reject')
  emit('update:visible', false)
  closeStream()
}

function closeDialog(): void {
  emit('close')
  emit('update:visible', false)
  closeStream()
}

function handleVisibility(value: boolean): void {
  if (value) emit('update:visible', true)
  else closeDialog()
}

onBeforeUnmount(closeStream)
</script>

<style scoped>
.selection-pipeline-dialog {
  display: grid;
  gap: 18px;
}

.pipeline-setup {
  display: grid;
  gap: 10px;
}

.field-label,
.model-field span {
  font-weight: 600;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.model-field {
  display: grid;
  gap: 6px;
}

.pipeline-status {
  display: grid;
  gap: 8px;
}

.status-row,
.comparison-header,
.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pipeline-outputs pre,
.comparison pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 280px;
  overflow: auto;
  margin: 0;
}

.comparison {
  display: grid;
  gap: 10px;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.comparison article {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.comparison h4 {
  margin: 0 0 10px;
}

.word-diff mark {
  background: var(--el-color-warning-light-7);
  color: inherit;
  border-radius: 3px;
}

@media (max-width: 760px) {
  .model-grid,
  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .dialog-actions {
    flex-wrap: wrap;
  }
}
</style>
