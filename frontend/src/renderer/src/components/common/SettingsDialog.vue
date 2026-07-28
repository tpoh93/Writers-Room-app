<script setup lang="ts">
import { ref } from 'vue'
import LLMConfigManager from '../setting/LLMConfigManager.vue'
import Versions from '../Versions.vue'
import PromptWorkshop from '../setting/PromptWorkshop.vue'
import CardTypeManager from '../setting/CardTypeManager.vue'
import KnowledgeManager from '../setting/KnowledgeManager.vue'
import AssistantSettings from '../setting/AssistantSettings.vue'
import { useUpdateStore } from '@renderer/stores/useUpdateStore'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ modelValue: boolean }>()
const { t } = useI18n()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; 'close': [] }>()

const activeTab = ref('llm')
// 读取全局 store 预设的初始 tab
import { useAppStore } from '@renderer/stores/useAppStore'
const appStore = useAppStore()
const updateStore = useUpdateStore()
activeTab.value = appStore.settingsInitialTab || 'llm'

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}

// 当切到 LLM 标签或首次显示时，让子组件刷新
import { onMounted, watch, nextTick } from 'vue'
const llmManagerRef = ref()
function emitRefreshIfLLM() {
  if (activeTab.value === 'llm' && llmManagerRef.value?.refresh) {
    llmManagerRef.value.refresh()
  }
}
onMounted(() => emitRefreshIfLLM())
watch(() => activeTab.value, () => emitRefreshIfLLM())
// 对话框每次打开也刷新一次（等待子组件渲染完成）
watch(() => props.modelValue, async (open) => { if (open) { await nextTick(); emitRefreshIfLLM() } })
</script>

<template>
  <el-dialog 
    :model-value="modelValue" 
    @update:model-value="(val) => emit('update:modelValue', val)"
    :title="t('settings.title')"
    width="85%" 
    top="4vh"
    @close="handleClose"
  >
    <div class="settings-container">
      <el-tabs v-model="activeTab" tab-position="left" class="settings-tabs">
        <el-tab-pane :label="t('settings.llm')" name="llm">
          <LLMConfigManager ref="llmManagerRef" />
        </el-tab-pane>
        <el-tab-pane :label="t('settings.knowledge')" name="knowledge">
          <KnowledgeManager />
        </el-tab-pane>
        <el-tab-pane :label="t('settings.prompts')" name="prompts">
          <PromptWorkshop />
        </el-tab-pane>
        <el-tab-pane :label="t('settings.cardTypes')" name="card-types">
          <CardTypeManager />
        </el-tab-pane>
        <el-tab-pane :label="t('settings.assistant')" name="assistant">
          <AssistantSettings />
        </el-tab-pane>
        <el-tab-pane name="about">
          <template #label>
            <el-badge :is-dot="updateStore.hasUpdate" type="warning">
              <span>{{ t('settings.about') }}</span>
            </el-badge>
          </template>
          <Versions />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<style scoped>
.settings-container { height: 78vh; }
.settings-tabs { height: 100%; }
:deep(.el-dialog__body) { padding-top: 8px; }
:deep(.el-tabs__content) { height: 100%; overflow-y: auto; }
</style> 
