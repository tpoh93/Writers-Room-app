<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('generation.startCard')"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <p class="hint-text">
        {{ t('generation.preferencesHint') }}
      </p>
      <p class="hint-subtext">
        {{ t('generation.startHint') }}
      </p>

      <el-checkbox v-model="useExistingContent" class="content-option">
        {{ t('generation.useExisting') }}
      </el-checkbox>

      <el-input
        v-model="userPrompt"
        type="textarea"
        :rows="4"
        :placeholder="t('generation.promptPlaceholder')"
        maxlength="500"
        show-word-limit
        @keyup.ctrl.enter="handleStartGenerate"
      />

      <div class="example-hints">
        <span class="example-label">{{ t('generation.examples') }}</span>
        <el-tag
          v-for="example in examples"
          :key="example"
          size="small"
          class="example-tag"
          @click="userPrompt = example"
        >
          {{ example }}
        </el-tag>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">
          {{ t('common.cancel') }}
        </el-button>
        <el-button @click="handleSkip">
          {{ t('generation.skip') }}
        </el-button>
        <el-button
          type="primary"
          :disabled="!userPrompt.trim()"
          @click="handleStartGenerate"
        >
          {{ t('generation.start') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// ==================== Props & Emits ====================

const props = defineProps<{
  visible: boolean
  cardTypeName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [userPrompt: string, useExistingContent: boolean]
  cancel: []
}>()

// ==================== 状态管理 ====================

const dialogVisible = ref(false)
const userPrompt = ref('')
const useExistingContent = ref(false)

// 示例提示（根据卡片类型动态调整）
const examples = ref<string[]>([
  t('generation.exampleCharacterOne'),
  t('generation.exampleCharacterTwo'),
  t('generation.exampleCharacterThree')
])

// ==================== 方法 ====================

/**
 * 处理开始生成
 */
function handleStartGenerate() {
  emit('confirm', userPrompt.value.trim(), useExistingContent.value)
  dialogVisible.value = false
  userPrompt.value = ''
  useExistingContent.value = false
}

/**
 * 处理跳过
 */
function handleSkip() {
  emit('confirm', '', useExistingContent.value)
  dialogVisible.value = false
  userPrompt.value = ''
  useExistingContent.value = false
}

/**
 * 处理取消
 */
function handleCancel() {
  emit('cancel')
  dialogVisible.value = false
  userPrompt.value = ''
}

// ==================== 监听 ====================

watch(() => props.visible, (val) => {
  dialogVisible.value = val
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

// 根据卡片类型调整示例
watch(() => props.cardTypeName, (typeName) => {
  if (!typeName) return

  // 可以根据不同的卡片类型提供不同的示例
  if (typeName.includes('角色') || typeName.includes('Character')) {
    examples.value = [
      t('generation.exampleCharacterOne'),
      t('generation.exampleCharacterTwo'),
      t('generation.exampleCharacterThree')
    ]
  } else if (typeName.includes('章节') || typeName.includes('Chapter')) {
    examples.value = [
      t('generation.exampleChapterOne'),
      t('generation.exampleChapterTwo'),
      t('generation.exampleChapterThree')
    ]
  } else if (typeName.includes('大纲') || typeName.includes('Outline')) {
    examples.value = [
      t('generation.exampleOutlineOne'),
      t('generation.exampleOutlineTwo'),
      t('generation.exampleOutlineThree')
    ]
  } else {
    examples.value = [
      t('generation.exampleGeneralOne'),
      t('generation.exampleGeneralTwo'),
      t('generation.exampleGeneralThree')
    ]
  }
})
</script>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint-text {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.hint-subtext {
  margin: -8px 0 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.example-hints {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.example-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.example-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.example-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
