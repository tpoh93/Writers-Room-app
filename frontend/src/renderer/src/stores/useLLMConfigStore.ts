import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listLLMConfigs, type LLMConfigRead } from '@renderer/api/setting'
import i18n from '@renderer/i18n'

export const useLLMConfigStore = defineStore('llmConfig', () => {
  // State
  const llmConfigs = ref<LLMConfigRead[]>([])
  const isLoading = ref(false)

  // Actions
  async function fetchLLMConfigs() {
    isLoading.value = true
    try {
      const list = await listLLMConfigs()
      llmConfigs.value = list || []
    } catch (error) {
      console.error('获取LLM配置列表失败:', error)
      ElMessage.error(i18n.global.t('errors.llmConfigListLoad'))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    llmConfigs,
    isLoading,
    fetchLLMConfigs
  }
})
