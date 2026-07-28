<script setup lang="ts">
import { computed } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useAssistantPreferences } from '@renderer/composables/useAssistantPreferences'
import {
  playTaskDoneSound,
  requestTaskDoneNotificationPermission,
  unlockTaskDoneSound
} from '@renderer/utils/taskDoneNotifier'

// 通过组合式统一管理灵感助手偏好，方便在设置页与助手面板之间复用
const prefs = useAssistantPreferences()
const { t } = useI18n()

const ctxSummaryEnabled = computed({
  get: () => prefs.contextSummaryEnabled.value,
  set: (val: boolean) => prefs.setContextSummaryEnabled(val)
})

const ctxSummaryThreshold = computed({
  get: () => prefs.contextSummaryThreshold.value,
  set: (val: number | null) => prefs.setContextSummaryThreshold(val)
})

const reactModeEnabled = computed({
  get: () => prefs.reactModeEnabled.value,
  set: (val: boolean) => prefs.setReactModeEnabled(val)
})

const assistantTemperature = computed({
  get: () => prefs.assistantTemperature.value,
  set: (val: number | null) => prefs.setAssistantTemperature(val)
})

const assistantMaxTokens = computed({
  get: () => prefs.assistantMaxTokens.value,
  set: (val: number | null) => prefs.setAssistantMaxTokens(val)
})

const assistantTimeout = computed({
  get: () => prefs.assistantTimeout.value,
  set: (val: number | null) => prefs.setAssistantTimeout(val)
})

const assistantFontSize = computed({
  get: () => prefs.assistantFontSize.value,
  set: (val: number | null) => prefs.setAssistantFontSize(val)
})

const taskDoneSoundEnabled = computed({
  get: () => prefs.taskDoneSoundEnabled.value,
  set: (val: boolean) => {
    void setTaskDoneSoundEnabled(val)
  }
})

const taskDoneDesktopNotificationEnabled = computed({
  get: () => prefs.taskDoneDesktopNotificationEnabled.value,
  set: (val: boolean) => {
    void setTaskDoneDesktopNotificationEnabled(val)
  }
})

async function setTaskDoneSoundEnabled(val: boolean): Promise<void> {
  prefs.setTaskDoneSoundEnabled(val)
  if (!val) return

  await unlockTaskDoneSound()
}

async function handleTestTaskDoneSound(): Promise<void> {
  try {
    const played = await playTaskDoneSound()
    if (!played) {
      ElMessage.warning(t('settings.soundError'))
    }
  } catch {
    ElMessage.warning(t('settings.soundError'))
  }
}

async function setTaskDoneDesktopNotificationEnabled(val: boolean): Promise<void> {
  prefs.setTaskDoneDesktopNotificationEnabled(val)
  if (!val) return

  const permission = await requestTaskDoneNotificationPermission()
  if (permission === 'granted') {
    ElMessage.success(t('settings.notificationEnabled'))
    return
  }

  prefs.setTaskDoneDesktopNotificationEnabled(false)
  if (permission === 'denied') {
    ElMessage.warning(t('settings.notificationDenied'))
    return
  }
  if (permission === 'unsupported') {
    ElMessage.warning(t('settings.notificationUnsupported'))
    return
  }
  ElMessage.warning(t('settings.notificationNotGranted'))
}
</script>

<template>
  <div class="assistant-settings-root">
    <h3 class="section-title">{{ t('settings.agentTitle') }}</h3>
    <p class="section-desc">
      {{ t('settings.agentDescription') }}
    </p>

    <el-form label-width="160px" class="assistant-form" size="small">
      <!-- 参数配置组 -->
      <div class="group-title">{{ t('settings.parameterSettings') }}</div>

      <el-form-item>
        <template #label>
          <span>
            {{ t('settings.assistantFontSize') }}
            <el-tooltip placement="top" effect="dark">
              <template #content>
                {{ t('settings.assistantFontSizeHint') }}
              </template>
              <el-icon class="field-help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input-number
          v-model="assistantFontSize"
          :min="13"
          :max="24"
          :step="1"
          controls-position="right"
        />
        <span class="field-hint">px</span>
      </el-form-item>

      <el-form-item>
        <template #label>
          <span>
            {{ t('settings.temperatureLabel') }}
            <el-tooltip placement="top" effect="dark">
              <template #content>
                {{ t('settings.temperatureHint') }}
              </template>
              <el-icon class="field-help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input-number
          v-model="assistantTemperature"
          :min="0.1"
          :max="2"
          :step="0.1"
          :precision="2"
          controls-position="right"
          placeholder="0.6"
        />
      </el-form-item>

      <el-form-item>
        <template #label>
          <span>
            {{ t('settings.maxOutputTokens') }}
            <el-tooltip placement="top" effect="dark">
              <template #content>
                {{ t('settings.maxOutputTokensHint') }}
              </template>
              <el-icon class="field-help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input-number
          v-model="assistantMaxTokens"
          :min="-1"
          :max="65536"
          :step="512"
          controls-position="right"
          placeholder="-1"
        />
      </el-form-item>

      <el-form-item>
        <template #label>
          <span>
            {{ t('settings.timeoutSeconds') }}
            <el-tooltip placement="top" effect="dark">
              <template #content>
                {{ t('settings.timeoutHint') }}
              </template>
              <el-icon class="field-help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input-number
          v-model="assistantTimeout"
          :min="10"
          :max="600"
          :step="10"
          controls-position="right"
          placeholder="90"
        />
      </el-form-item>

      <el-divider />

      <!-- React 配置组 -->
      <div class="group-title">{{ t('settings.modeSettings') }}</div>
      <el-form-item>
        <template #label>
          <span>
            {{ t('settings.reactMode') }}
            <el-tooltip placement="top" effect="dark">
              <template #content>
                {{ t('settings.reactModeHint') }}
              </template>
              <el-icon class="field-help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-switch v-model="reactModeEnabled" />
      </el-form-item>

      <el-divider />

      <div class="group-title">{{ t('settings.completionAlerts') }}</div>
      <el-form-item :label="t('settings.playCompletionSound')">
        <div class="reminder-control">
          <div class="reminder-control-row">
            <el-switch v-model="taskDoneSoundEnabled" />
            <el-button size="small" plain @click="handleTestTaskDoneSound">{{ t('settings.testSound') }}</el-button>
          </div>
          <span class="field-hint reminder-hint"
            >{{ t('settings.soundHint') }}</span
          >
        </div>
      </el-form-item>
      <el-form-item :label="t('settings.desktopNotification')">
        <el-switch v-model="taskDoneDesktopNotificationEnabled" />
        <span class="field-hint">{{ t('settings.notificationHint') }}</span>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.assistant-settings-root {
  padding: 16px 12px 24px 12px;
}

.section-title {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
}

.section-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.assistant-form {
  max-width: 520px;
}

.field-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.reminder-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reminder-control-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.reminder-hint {
  margin-left: 0;
}

.hint-alert {
  margin-top: 12px;
}

.group-title {
  margin: 8px 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.field-help-icon {
  margin-left: 4px;
  cursor: help;
}
</style>
