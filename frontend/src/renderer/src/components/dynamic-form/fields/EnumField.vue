<template>
  <el-form-item :label="label" :prop="prop">
    <el-select
      :model-value="modelValue"
      @update:modelValue="emit('update:modelValue', $event)"
      :placeholder="placeholder"
      :loading="isLoading"
      :no-data-text="noDataText"
      clearable
      style="width: 100%"
    >
      <el-option
        v-for="item in resolvedOptions"
        :key="String(item)"
        :label="getOptionLabel(item)"
        :value="item"
      />
    </el-select>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { JSONSchema } from '@renderer/api/schema'
import { resolveKnowledgeOptions } from '@renderer/services/knowledgeOptionResolver'
import { getSchemaDisplayText } from '@renderer/i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string | number | undefined
  label: string
  prop: string
  schema: JSONSchema
}>()

const emit = defineEmits(['update:modelValue'])
const knowledgeOptions = ref<Array<string | number>>([])
const isLoading = ref(false)

const ENTITY_TYPE_LABELS: Record<string, string> = {
  character: t('dynamicForm.entityCharacter'),
  scene: t('dynamicForm.entityScene'),
  organization: t('dynamicForm.entityOrganization'),
  item: t('dynamicForm.entityItem'),
  concept: t('dynamicForm.entityConcept'),
}

watch(
  () => props.schema['x-knowledge-source'],
  async (knowledgeName) => {
    if (!knowledgeName) {
      knowledgeOptions.value = []
      return
    }

    isLoading.value = true
    knowledgeOptions.value = await resolveKnowledgeOptions(knowledgeName)
    isLoading.value = false
  },
  { immediate: true }
)

const resolvedOptions = computed(() => {
  const baseOptions = (props.schema.enum && props.schema.enum.length > 0)
    ? props.schema.enum
    : knowledgeOptions.value

  if (
    props.modelValue !== undefined
    && props.modelValue !== null
    && props.modelValue !== ''
    && !baseOptions.includes(props.modelValue)
  ) {
    return [props.modelValue, ...baseOptions]
  }

  return baseOptions
})

const placeholder = computed(() => {
  return getSchemaDisplayText(props.schema.description)
    || t('dynamicForm.selectPlaceholder', { label: props.label })
})

const noDataText = computed(() => {
  if (isLoading.value) {
    return t('dynamicForm.loadingOptions')
  }
  if (props.schema['x-knowledge-source']) {
    return t('dynamicForm.knowledgeOptionsEmpty')
  }
  return t('dynamicForm.noOptions')
})

function getOptionLabel(item: string | number): string {
  const raw = String(item)
  if (props.prop === 'entity_type') {
    return ENTITY_TYPE_LABELS[raw] || raw
  }
  return raw
}
</script>
