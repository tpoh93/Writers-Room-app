<template>
  <div class="llm-config-manager">
    <div class="header">
      <h4>{{ t('settings.llmManagerTitle') }}</h4>
      <el-button type="primary" size="small" @click="openEditDialog()">{{ t('settings.newLlmConfig') }}</el-button>
    </div>

    <el-table :data="llmConfigs" style="width: 100%" size="small">
      <el-table-column prop="display_name" :label="t('settings.displayNameColumn')" width="150" />
      <el-table-column prop="provider" :label="t('settings.provider')" width="120" />
      <el-table-column prop="model_name" :label="t('settings.modelName')" width="200" />
      <el-table-column label="API Base" width="240">
        <template #default="{ row }">
          <span v-if="row.provider === 'openai_compatible'">{{ row.api_base }}</span>
          <span v-else style="color: #909399; font-style: italic;">{{ t('settings.providerDefault', { provider: row.provider }) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="token_limit" :label="t('settings.tokenLimit')" width="90" />
      <el-table-column prop="call_limit" :label="t('settings.callLimit')" width="90" />
      <el-table-column :label="t('settings.capabilityTags')" min-width="180">
        <template #default="{ row }">
          <el-popover v-if="capabilityTags(row).length" placement="top" width="320" trigger="hover">
            <template #reference>
              <div class="capability-cell">
                <el-tag
                  v-for="tag in capabilityTags(row).slice(0, 2)"
                  :key="tag"
                  size="small"
                  :type="capabilityTagType(tag)"
                >
                  {{ tag }}
                </el-tag>
                <span v-if="capabilityTags(row).length > 2" class="more-tags">+{{ capabilityTags(row).length - 2 }}</span>
              </div>
            </template>
            <div class="capability-popover">
              <div class="capability-summary">{{ capabilitySummary(row) }}</div>
              <div class="capability-popover-tags">
                <el-tag
                  v-for="tag in capabilityTags(row)"
                  :key="tag"
                  size="small"
                  :type="capabilityTagType(tag)"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
          </el-popover>
          <el-button v-else size="small" text type="primary" @click="openEditDialog(row)">{{ t('settings.capabilityTest') }}</el-button>
        </template>
      </el-table-column>
      <el-table-column width="200">
        <template #header>
          <span>
            {{ t('settings.usageColumn') }}
            <el-tooltip placement="top" effect="dark">
              <template #content>
                {{ t('settings.tokenEstimateHelp') }}<br/>
                <br/>
                {{ t('settings.numberFormatHelp') }}
              </template>
              <el-icon style="margin-left:4px; cursor: help;"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <template #default="{ row }">
          {{ formatNumber((row as any).used_tokens_input || 0) }} / {{ formatNumber((row as any).used_tokens_output || 0) }} / {{ formatNumber((row as any).used_calls || 0) }}
        </template>
      </el-table-column>
      <el-table-column :label="t('settings.actions')" width="280">
        <template #default="{ row }">
          <el-button size="small" @click="openEditDialog(row)">{{ t('common.edit') }}</el-button>
          <el-button size="small" type="primary" @click="handleCopy(row)" plain>{{ t('settings.copy') }}</el-button>
          <el-button size="small" type="danger" @click="deleteConfig(row.id)">{{ t('common.delete') }}</el-button>
          <el-button size="small" type="warning" @click="handleReset(row)" plain>{{ t('settings.reset') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" :title="editConfig ? t('settings.editLlmConfig') : t('settings.newLlmConfig')" width="500px">
      <LLMConfigForm
        v-if="editDialogVisible"
        :initial-data="editConfig"
        @save="handleSave"
        @refresh="loadLLMConfigs"
        @cancel="editDialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import LLMConfigForm from './LLMConfigForm.vue'
import type { components } from '@renderer/types/generated'
import { listLLMConfigs, createLLMConfig, updateLLMConfig, deleteLLMConfig, resetLLMUsage, copyLLMConfig } from '@renderer/api/setting'

type LLMConfig = components['schemas']['LLMConfigRead']

const llmConfigs = ref<LLMConfig[]>([])
const { t } = useI18n()
const editDialogVisible = ref(false)
const editConfig = ref<LLMConfig | null>(null)

/**
 * 格式化数字显示
 * @param num 数字
 * @returns 格式化后的字符串
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    // 大于等于1百万，显示为 X.XXX 百万
    const millions = num / 1000000
    const formatted = millions.toFixed(3)
    // 去除末尾的0
    const trimmed = parseFloat(formatted).toString()
    return `${trimmed} mln`
  } else if (num >= 10000) {
    // 大于等于1万，显示为 X.XXX 万
    const tenThousands = num / 10000
    const formatted = tenThousands.toFixed(3)
    // 去除末尾的0
    const trimmed = parseFloat(formatted).toString()
    return `${trimmed} tys.`
  } else {
    // 小于1万，直接显示原数字
    return num.toString()
  }
}

function capabilityTags(row: LLMConfig): string[] {
  const tags = (row as any).capability_summary?.tags
  return Array.isArray(tags) ? tags.filter((item) => typeof item === 'string') : []
}

function capabilitySummary(row: LLMConfig): string {
  return (row as any).capability_summary?.summary || t('settings.noCapabilitySummary')
}

function capabilityTagType(tag: string) {
  if (tag.includes('失败') || tag.includes('拦截') || tag.includes('不可用')) return 'danger'
  if (tag.includes('建议') || tag.includes('修复') || tag.includes('仅普通')) return 'warning'
  return 'success'
}

async function loadLLMConfigs() {
  try {
    llmConfigs.value = await listLLMConfigs()
  } catch (error) {
    console.error('Failed to load LLM configs:', error)
    ElMessage.error(t('settings.llmLoadError'))
  }
}

function openEditDialog(config?: LLMConfig) {
  if (config) {
    // 编辑现有配置
    editConfig.value = config
  } else {
    // 新增配置
    editConfig.value = null
  }
  editDialogVisible.value = true
}

async function handleSave(data: any) {
  try {
    if (data.id) {
      await updateLLMConfig(data.id, data)
      ElMessage.success(t('settings.llmUpdateSuccess'))
    } else {
      await createLLMConfig(data)
      ElMessage.success(t('settings.llmCreateSuccess'))
    }
    editDialogVisible.value = false
    await loadLLMConfigs() // 重新加载列表
  } catch (error) {
    ElMessage.error(t('settings.llmSaveError'))
  }
}

async function deleteConfig(id: number) {
  try {
    await ElMessageBox.confirm(t('settings.deleteLlmConfirm'), t('settings.deleteTitle'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    await deleteLLMConfig(id)
    ElMessage.success(t('settings.deleted'))
    await loadLLMConfigs() // 重新加载列表
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('settings.deleteError', { error: t('errors.unknown') }))
    }
  }
}

async function handleReset(row: LLMConfig) {
  try {
    await ElMessageBox.confirm(t('settings.resetUsageConfirm'), t('settings.resetUsageTitle'), {
      type: 'warning', confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel')
    })
  } catch (e) {
    return
  }
  try {
    await resetLLMUsage(row.id)
    ElMessage.success(t('settings.resetSuccess'))
    await loadLLMConfigs()
  } catch (e) {
    ElMessage.error(t('settings.resetError'))
  }
}

async function handleCopy(row: LLMConfig) {
  try {
    await copyLLMConfig(row.id)
    ElMessage.success(t('settings.copySuccess'))
    await loadLLMConfigs()
  } catch (error) {
    console.error('复制配置失败:', error)
    ElMessage.error(t('settings.copyError'))
  }
}

// 暴露 refresh 给父组件调用
defineExpose({ refresh: loadLLMConfigs })
onMounted(loadLLMConfigs)
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.capability-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.more-tags {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.capability-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.capability-summary {
  overflow-wrap: anywhere;
  color: var(--el-text-color-regular);
}

.capability-popover-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
