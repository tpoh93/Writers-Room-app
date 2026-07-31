<template>
  <div class="prompt-workshop">
    <div class="toolbar">
      <h2>{{ t('settings.prompts') }}</h2>
      <el-button type="primary" @click="handleCreate">{{ t('settings.newPrompt') }}</el-button>
    </div>
    <el-table :data="prompts" style="width: 100%" v-loading="loading">
      <el-table-column :label="t('settings.name')" width="180">
        <template #default="{ row }">{{ row.built_in ? getPromptDisplayName(row.name) : row.name }}</template>
      </el-table-column>
      <el-table-column :label="t('settings.description')">
        <template #default="{ row }">{{ row.built_in ? t('settings.builtInPromptDescription', { name: getPromptDisplayName(row.name) }) : row.description }}</template>
      </el-table-column>
      <el-table-column :label="t('settings.actions')" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="handleEdit(row)">{{ t('common.edit') }}</el-button>
          <el-popconfirm :title="t('settings.deletePromptConfirm')" @confirm="handleDelete(row.id)" v-if="!isBuiltInPrompt(row)">
            <template #reference>
              <el-button size="small" type="danger" :disabled="isBuiltInPrompt(row)">{{ t('common.delete') }}</el-button>
            </template>
          </el-popconfirm>
          <el-button v-else size="small" type="danger" plain disabled>{{ t('common.delete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 抽屉编辑器 -->
    <el-drawer v-model="drawerVisible" :title="dialogTitle" size="60%" append-to-body>
      <el-form :model="currentPrompt" label-width="90px" ref="promptForm" class="form-grid">
        <el-form-item :label="t('settings.name')" prop="name" :rules="{ required: true, message: t('settings.promptNameRequired'), trigger: 'blur' }">
          <el-input v-model="currentPrompt.name" />
        </el-form-item>
        <el-form-item :label="t('settings.description')" prop="description">
          <el-input v-model="currentPrompt.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('settings.structuredEditing')">
          <el-switch v-model="useStructured" />
          <span class="hint">{{ t('settings.structuredEditingHint') }}</span>
        </el-form-item>

        <!-- 结构化编辑模式 -->
        <template v-if="useStructured">
          <el-divider content-position="left">{{ t('settings.roleHeading') }}</el-divider>
          <el-input v-model="structured.role" :placeholder="t('settings.rolePlaceholder')" />

          <el-divider content-position="left">{{ t('settings.skillsHeading') }}</el-divider>
          <el-input v-model="structured.skills" type="textarea" :rows="2" :placeholder="t('settings.pointsPlaceholder')" />

          <el-divider content-position="left">{{ t('settings.goalsHeading') }}</el-divider>
          <el-input v-model="structured.goals" type="textarea" :rows="4" :placeholder="t('settings.goalsPlaceholder')" />

          <el-divider content-position="left">{{ t('settings.knowledgeOptional') }}</el-divider>
          <div class="knowledge-grid">
            <div class="row">
              <span class="label">{{ t('settings.referenceMethod') }}</span>
              <el-radio-group v-model="knowledgeMode" size="small">
                <el-radio-button label="id">{{ t('settings.byId') }}</el-radio-button>
                <el-radio-button label="name">{{ t('settings.byName') }}</el-radio-button>
              </el-radio-group>
              <span class="hint" style="margin-left:8px">{{ t('settings.knowledgeReferenceHint') }}</span>
            </div>
            <el-select v-model="selectedKnowledgeIds" multiple filterable :placeholder="t('settings.selectKnowledge')" style="width:100%">
              <el-option v-for="kb in knowledgeItems" :key="kb.id" :label="kb.name" :value="kb.id" />
            </el-select>
          </div>

          <el-divider content-position="left">{{ t('settings.outputFormatOptional') }}</el-divider>
          <el-input v-model="structured.outputFormat" type="textarea" :rows="2" :placeholder="t('settings.outputFormatPlaceholder')" />

          <el-divider content-position="left">{{ t('settings.preview') }}</el-divider>
          <el-input :model-value="composedTemplate" type="textarea" :rows="10" readonly />
        </template>

        <!-- 原始模板模式 -->
        <template v-else>
          <el-form-item :label="t('settings.template')" prop="template" :rules="{ required: true, message: t('settings.templateRequired'), trigger: 'blur' }">
            <el-input v-model="currentPrompt.template" type="textarea" :rows="14" />
            <div class="template-hint">{{ t('settings.templateHint') }}</div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">{{ t('common.save') }}</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'element-plus'
import { listKnowledge, type Knowledge, listPrompts, createPrompt, updatePrompt, deletePrompt } from '@renderer/api/setting'
import { getPromptDisplayName } from '@renderer/i18n'

interface Prompt {
  id: number
  name: string
  description: string
  template: string
  built_in?: boolean
}

const DEFAULT_OUTPUT_FORMAT = '请严格根据提供的Json Schema返回结果'

const prompts = ref<Prompt[]>([])
const { t } = useI18n()
const loading = ref(false)
const drawerVisible = ref(false)
const saving = ref(false)
const currentPrompt = ref<Partial<Prompt>>({})
const promptForm = ref<FormInstance>()

const dialogTitle = computed(() => (currentPrompt.value.id ? t('settings.editPrompt') : t('settings.newPrompt')))

const isBuiltInPrompt = (row: Prompt) => !!row.built_in

// 结构化编辑相关
const useStructured = ref(false)
const structured = ref({ role: '', skills: '', goals: '', knowledge: '', outputFormat: DEFAULT_OUTPUT_FORMAT })

// 知识库选择与模式
const knowledgeItems = ref<Knowledge[]>([])
const selectedKnowledgeIds = ref<number[]>([])
const knowledgeMode = ref<'id' | 'name'>('name')

// 组合预览
const composedTemplate = computed(() => composeTemplate(structured.value))

function composeTemplate(s: { role: string; skills: string; goals: string; knowledge?: string; outputFormat?: string }) {
  const lines: string[] = []
  if (s.role?.trim()) lines.push(`- Role: ${s.role.trim()}`)
  if (s.skills?.trim()) lines.push(`- Skills: ${s.skills.trim()}`)
  if (s.goals?.trim()) {
    lines.push('- Goals:')
    // 将多行 goals 做缩进
    const gl = s.goals.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    for (const g of gl) lines.push(`    - ${g}`)
  }
  // 知识库占位符引用
  if (selectedKnowledgeIds.value.length) {
    lines.push('\n- knowledge:')
    for (const kid of selectedKnowledgeIds.value) {
      const item = knowledgeItems.value.find(k => k.id === kid)
      if (!item) continue
      if (knowledgeMode.value === 'id') {
        lines.push(`    - @KB{ id=${kid} }  # ${item.name}`)
      } else {
        lines.push(`    - @KB{ name=${item.name} }`)
      }
    }
  }
  if (s.outputFormat?.trim()) lines.push(`\n- OutputFormat: ${s.outputFormat.trim()}`)
  return lines.join('\n')
}

async function fetchPrompts() {
  loading.value = true
  try {
    prompts.value = await listPrompts()
  } catch (error) {
    ElMessage.error(t('settings.promptLoadError'))
  } finally {
    loading.value = false
  }
}

async function fetchKnowledgeList() {
  try {
    knowledgeItems.value = await listKnowledge()
  } catch {
    knowledgeItems.value = []
  }
}

function resetStructuredDefaults() {
  structured.value = { role: '', skills: '', goals: '', knowledge: '', outputFormat: DEFAULT_OUTPUT_FORMAT }
  selectedKnowledgeIds.value = []
  knowledgeMode.value = 'name'
}

function handleCreate() {
  currentPrompt.value = { name: '', description: '', template: '' }
  resetStructuredDefaults()
  useStructured.value = false
  drawerVisible.value = true
}

function parseKnowledgeBlock(tpl: string) {
  // 提取 knowledge 区块
  const k = /-\s*knowledge:\s*([\s\S]*?)(?:\n-\s*OutputFormat\s*[:：]|$)/i.exec(tpl)
  const ids: number[] = []
  let mode: 'id' | 'name' = 'name'
  if (k && k[1]) {
    const block = k[1]
    const idReg = /@KB\{\s*id\s*=\s*(\d+)\s*\}/gi
    const nameReg = /@KB\{\s*name\s*=\s*([^}]+)\}/gi
    let m: RegExpExecArray | null
    while ((m = idReg.exec(block))) {
      const id = Number(m[1])
      if (!Number.isNaN(id)) ids.push(id)
    }
    if (!ids.length) {
      const names: string[] = []
      while ((m = nameReg.exec(block))) {
        const n = (m[1] || '').trim().replace(/^['"]|['"]$/g, '')
        if (n) names.push(n)
      }
      if (names.length) {
        mode = 'name'
        for (const n of names) {
          const found = knowledgeItems.value.find(kb => kb.name === n)
          if (found) ids.push(found.id)
        }
      }
    } else {
      mode = 'id'
    }
  }
  selectedKnowledgeIds.value = Array.from(new Set(ids))
  knowledgeMode.value = mode
}

async function tryParseStructured(tpl?: string) {
  if (!tpl) return resetStructuredDefaults()
  // 粗略解析，仅在常见格式时填充字段，解析失败保持默认
  try {
    const r = /-\s*Role:\s*(.*)/i.exec(tpl)
    const s = /-\s*Skills?:\s*([\s\S]*?)(?:\n-\s*Goals?:|\n-\s*knowledge:|\n-\s*OutputFormat\s*[:：]|$)/i.exec(tpl)
    const g = /-\s*Goals?:\s*([\s\S]*?)(?:\n-\s*knowledge:|\n-\s*OutputFormat\s*[:：]|$)/i.exec(tpl)
    const o = /-\s*OutputFormat\s*[:：]\s*([\s\S]*)/i.exec(tpl)
    structured.value.role = r?.[1]?.trim() || ''
    structured.value.skills = (s?.[1] || '').trim()
    structured.value.goals = (g?.[1] || '').replace(/^\s*-\s*/gm, '').trim()
    structured.value.outputFormat = (o?.[1] || DEFAULT_OUTPUT_FORMAT).trim()
    // 解析知识库引用
    parseKnowledgeBlock(tpl)
  } catch {
    resetStructuredDefaults()
  }
}

async function handleEdit(prompt: any) {
  currentPrompt.value = { ...prompt }
  await fetchKnowledgeList()
  // 尝试解析为结构化表单，若失败则回退到原始模板模式
  await tryParseStructured(prompt.template)
  useStructured.value = false
  drawerVisible.value = true
}

async function handleSave() {
  if (!promptForm.value) return
  await promptForm.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        const payload: any = { ...currentPrompt.value }
        // 若是结构化编辑，则组合模板写回
        if (useStructured.value) {
          payload.template = composeTemplate(structured.value)
        }
        if (payload.id) {
          await updatePrompt(payload.id, payload)
        } else {
          await createPrompt(payload)
        }
        ElMessage.success(t('settings.saveSuccess'))
        drawerVisible.value = false
        fetchPrompts()
      } catch (error) {
        ElMessage.error(t('settings.saveError'))
      } finally {
        saving.value = false
      }
    }
  })
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm(t('settings.deletePromptConfirm'), t('common.warning'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
    })
    await deletePrompt(id)
    ElMessage.success(t('settings.promptDeleteSuccess'))
    fetchPrompts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('settings.promptDeleteError'))
    }
  }
}

onMounted(async () => { await fetchKnowledgeList(); await fetchPrompts() })
</script>

<style scoped>
.prompt-workshop { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.form-grid { display: flex; flex-direction: column; gap: 8px; }
.hint { color: var(--el-text-color-secondary); margin-left: 8px; font-size: 12px; }
.template-hint { font-size: 12px; color: #909399; margin-top: 5px; }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; }
.knowledge-grid { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; align-items: center; gap: 8px; }
.label { color: var(--el-text-color-regular); }
</style> 
