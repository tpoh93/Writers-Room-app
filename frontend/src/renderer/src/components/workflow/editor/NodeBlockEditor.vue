<template>
  <div class="node-block-editor">
    <!-- 节点块列表 -->
    <div class="node-blocks">
      <div
        v-for="(node, index) in nodes"
        :key="index"
        class="node-block"
        :class="{ 
          'is-selected': selectedIndex === index,
          'is-disabled': node.disabled
        }"
        :data-disabled-label="t('workflow.disabledLabel')"
        @click="selectNode(index)"
        @dblclick="editNodeCode(index)"
      >
        <!-- 节点头部 -->
        <div class="node-block-header">
          <div class="node-info">
            <el-tag :type="getNodeCategoryColor(node.category)" size="small">
              {{ getWorkflowCategoryDisplayName(node.category) }}
            </el-tag>
            <!-- 异步标识 -->
            <el-tag v-if="node.isAsync" type="warning" size="small" effect="dark">
              ⚡ {{ t('workflow.async') }}
            </el-tag>
            <!-- 变量名编辑 -->
            <el-input
              v-if="editingVariable?.nodeIndex === index"
              v-model="editingVariable.value"
              size="small"
              style="width: 120px"
              @blur="saveVariableEdit"
              @keydown.enter.stop="saveVariableEdit"
              @keydown.esc="cancelVariableEdit"
              ref="variableInputRef"
            />
            <span
              v-else
              class="node-variable editable"
              @click.stop="startVariableEdit(index, node.variable)"
              :title="t('workflow.editVariable')"
            >
              {{ node.variable }}
            </span>
            <span class="node-type">{{ getNodeLabel(node) }}</span>
          </div>
          <div class="node-actions">
            <el-tooltip :content="node.isAsync ? t('workflow.switchToSync') : t('workflow.switchToAsync')" placement="top">
              <el-button
                size="small"
                text
                @click.stop="toggleAsync(index)"
                :type="node.isAsync ? 'warning' : 'info'"
              >
                <template #icon>
                  <span style="font-size: 16px">{{ node.isAsync ? '⚡' : '🔄' }}</span>
                </template>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="node.disabled ? t('workflow.enableNode') : t('workflow.disableNode')" placement="top">
              <el-switch
                v-model="node.disabled"
                @change="toggleNodeDisabled(index)"
                size="small"
                inactive-text=""
                active-text=""
                :active-value="true"
                :inactive-value="false"
                style="--el-switch-on-color: #909399; --el-switch-off-color: #67c23a"
                @click.stop
              />
            </el-tooltip>
            <el-tooltip :content="t('workflow.deleteNode')" placement="top">
              <el-button
                size="small"
                text
                type="danger"
                @click.stop="deleteNode(index)"
                :icon="Delete"
              />
            </el-tooltip>
          </div>
        </div>

        <div v-if="node.description" class="node-description" @click.stop>
          {{ getNodeDescription(node) }}
        </div>

        <!-- 节点参数编辑器 -->
        <div class="node-params" v-if="node.fields && node.fields.length > 0">
          <div class="params-header">
            <div class="params-title">{{ t('workflow.parameters') }}</div>
            <el-button
              text
              size="small"
              @click.stop="toggleNodeCollapse(index)"
              :icon="node.collapsed ? ArrowRight : ArrowDown"
            />
          </div>
          <div v-if="!node.collapsed" v-for="(field, fieldIndex) in node.fields" :key="field.name" class="param-item">
            <span class="param-key">{{ getSchemaDisplayText(field.label) }}:</span>
            <div class="param-value-wrapper">
              <!-- 编辑模式 -->
              <div
                v-if="editingParam?.nodeIndex === index && editingParam?.fieldIndex === fieldIndex"
                class="smart-selector"
                style="flex: 1; display:flex; gap: 4px;"
              >
                <!-- ProjectSelect (x-component: ProjectSelect) -->
                <el-select
                  v-if="field.rawSchema?.['x-component'] === 'ProjectSelect'"
                  v-model="editingParam.value"
                  filterable
                  :allow-create="field.name === 'project_name'"
                  :default-first-option="field.name === 'project_name'"
                  :placeholder="t('editor.selectProjectFirst')"
                  size="small"
                  @change="saveParamEdit"
                >
                  <el-option
                    v-for="p in projectList"
                    :key="p.id"
                    :label="p.name"
                    :value="getProjectOptionValue(field, p)"
                  />
                </el-select>

                <!-- LLMSelect (x-component: LLMSelect) -->
                <el-select
                  v-else-if="field.rawSchema?.['x-component'] === 'LLMSelect'"
                  v-model="editingParam.value"
                  filterable
                  :allow-create="field.name === 'llm_name'"
                  :default-first-option="field.name === 'llm_name'"
                  :placeholder="t('workflow.selectLlmConfig')"
                  size="small"
                  @change="saveParamEdit"
                >
                  <el-option
                    v-for="cfg in llmConfigList"
                    :key="cfg.id"
                    :label="cfg.display_name || cfg.model_name"
                    :value="getLlmOptionValue(field, cfg)"
                  />
                </el-select>

                <!-- PromptSelect (x-component: PromptSelect) -->
                <el-select
                  v-else-if="field.rawSchema?.['x-component'] === 'PromptSelect'"
                  v-model="editingParam.value"
                  filterable
                  :placeholder="t('settings.selectPrompt')"
                  size="small"
                  @change="saveParamEdit"
                >
                  <el-option
                    v-for="prompt in promptList"
                    :key="prompt.id"
                    :label="prompt.built_in ? getPromptDisplayName(prompt.name) : prompt.name"
                    :value="prompt.id"
                  />
                </el-select>

                <!-- CardTypeSelect (x-component: CardTypeSelect) -->
                <el-select
                  v-else-if="field.rawSchema?.['x-component'] === 'CardTypeSelect'"
                  v-model="editingParam.value"
                  filterable
                  allow-create
                  default-first-option
                  :placeholder="t('editor.cardType')"
                  size="small"
                  @change="saveParamEdit"
                >
                  <el-option
                    v-for="ct in cardTypeList"
                    :key="ct.id"
                    :label="ct.is_built_in ? getCardTypeDisplayName(ct.name) : ct.name"
                    :value="ct.name"
                  />
                </el-select>

                <!-- ResponseModelSelect (x-component: ResponseModelSelect) -->
                <el-select
                  v-else-if="field.rawSchema?.['x-component'] === 'ResponseModelSelect'"
                  v-model="editingParam.value"
                  filterable
                  :placeholder="t('workflow.selectResponseModel')"
                  size="small"
                  @change="saveParamEdit"
                >
                  <el-option-group :label="t('workflow.builtinModels')">
                    <el-option
                      v-for="model in builtinResponseModels"
                      :key="model"
                      :value="model"
                      :label="model"
                    />
                  </el-option-group>
                  <el-option-group :label="t('workflow.customCardTypes')">
                    <el-option
                      v-for="ct in cardTypeList"
                      :key="ct.id"
                      :label="ct.is_built_in ? getCardTypeDisplayName(ct.name) : ct.name"
                      :value="ct.name"
                    />
                  </el-option-group>
                </el-select>

                <!-- Textarea (x-component: Textarea) -->
                <el-input
                  v-else-if="field.rawSchema?.['x-component'] === 'Textarea'"
                  v-model="editingParam.value"
                  type="textarea"
                  :rows="4"
                  size="small"
                  :placeholder="t('workflow.enterContent')"
                  @blur="saveParamEdit"
                />

                <!-- CodeEditor (x-component: CodeEditor) -->
                <el-input
                  v-else-if="field.rawSchema?.['x-component'] === 'CodeEditor'"
                  v-model="editingParam.value"
                  type="textarea"
                  :rows="6"
                  size="small"
                  class="code-expression-input"
                  :placeholder="t('workflow.pythonExpression')"
                  @blur="saveParamEdit"
                  @keydown.ctrl.enter.stop="saveParamEdit"
                />

                <!-- ToolMultiSelect (x-component: ToolMultiSelect) -->
                <el-select
                  v-else-if="field.rawSchema?.['x-component'] === 'ToolMultiSelect'"
                  v-model="editingParam.value"
                  filterable
                  multiple
                  collapse-tags
                  :placeholder="t('workflow.selectTools')"
                  size="small"
                  @change="saveParamEdit"
                >
                  <el-option value="search_cards" :label="t('workflow.toolSearchCards')" />
                  <el-option value="create_card" :label="t('workflow.toolCreateCard')" />
                  <el-option value="update_card" :label="t('workflow.toolUpdateCard')" />
                  <el-option value="delete_card" :label="t('workflow.toolDeleteCard')" />
                  <el-option value="get_card" :label="t('workflow.toolGetCard')" />
                  <el-option value="list_cards" :label="t('workflow.toolListCards')" />
                </el-select>

                <!-- Case 5: Boolean Switch -->
                <el-switch
                  v-else-if="field.type === 'boolean'"
                  v-model="editingParam.value"
                  size="small"
                  @change="saveParamEdit"
                />
                
                <!-- Case 6: Array Input (dynamic list) -->
                <div v-else-if="field.type === 'array'" style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                  <div
                    v-for="(item, itemIndex) in editingParam.arrayItems"
                    :key="itemIndex"
                    style="display: flex; gap: 4px;"
                  >
                    <el-input
                      v-model="editingParam.arrayItems[itemIndex]"
                      size="small"
                      :placeholder="t('workflow.enterValue')"
                      style="flex: 1;"
                    />
                    <el-button
                      size="small"
                      type="danger"
                      :icon="Delete"
                      @click.stop="removeArrayItem(itemIndex)"
                    />
                  </div>
                  <el-button
                    size="small"
                    type="primary"
                    :icon="Plus"
                    @click.stop="addArrayItem"
                  >
                    {{ t('workflow.addItem') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="success"
                    @click.stop="saveParamEdit"
                  >
                    {{ t('common.save') }}
                  </el-button>
                </div>
                
                <!-- Case 7: Default Text Input -->
                <el-input
                  v-else
                  v-model="editingParam.value"
                  size="small"
                  @blur="saveParamEdit"
                  @keydown.enter.stop="saveParamEdit"
                >
                  <!-- Folder selection trigger for DirectorySelect -->
                  <template #append v-if="field.rawSchema?.['x-component'] === 'DirectorySelect'">
                    <el-button :icon="Folder" @click.stop="openFolderDialog" />
                  </template>
                </el-input>
              </div>

              <!-- 显示模式 -->
              <el-input
                v-else-if="field.rawSchema?.['x-component'] === 'CodeEditor'"
                :model-value="formatDisplayValue(field)"
                type="textarea"
                :rows="3"
                readonly
                resize="none"
                class="param-code-preview"
                @click.stop="startParamEdit(index, fieldIndex)"
              />
              <span
                v-else
                class="param-value editable"
                @click.stop="startParamEdit(index, fieldIndex)"
              >
                {{ formatDisplayValue(field) }}
                <el-tag v-if="field.required" size="small" type="danger" style="margin-left: 4px">{{ t('settings.required') }}</el-tag>
                <!-- 智能选择器提示图标 -->
                <el-icon v-if="isSmartSelectorField(field)" class="selector-icon">
                  <ArrowDown />
                </el-icon>
                <el-icon v-else-if="field.rawSchema?.['x-component'] === 'DirectorySelect'" class="selector-icon">
                  <Folder />
                </el-icon>
                <el-icon v-else class="edit-icon">
                  <EditPen />
                </el-icon>
              </span>
            </div>
          </div>
        </div>

        <!-- 节点输出字段 -->
        <div class="node-outputs" v-if="node.outputs && node.outputs.length > 0">
          <div class="outputs-title">{{ t('workflow.outputFields') }}</div>
          <div class="output-items">
            <el-tag
              v-for="output in node.outputs"
              :key="output.name"
              size="small"
              type="success"
              class="output-tag"
            >
              {{ node.variable }}.{{ output.name }}
            </el-tag>
          </div>
        </div>

        <!-- 执行状态（如果有） -->
        <div v-if="node.status" class="node-status" :class="`status-${node.status}`">
          <el-icon v-if="node.status === 'running'"><Loading /></el-icon>
          <el-icon v-else-if="node.status === 'completed'"><CircleCheck /></el-icon>
          <el-icon v-else-if="node.status === 'error'"><CircleClose /></el-icon>
          <span>{{ getStatusText(node.status) }}</span>
          <span v-if="node.progress !== undefined && node.status === 'running'">
            {{ node.progress }}%
          </span>
        </div>
      </div>

      <!-- 添加节点按钮 -->
      <div class="add-node-block" @click="showAddNodeDialog">
        <el-icon><Plus /></el-icon>
        <span>{{ t('workflow.addNode') }}</span>
      </div>
    </div>

    <!-- 添加节点对话框 -->
    <el-dialog
      v-model="addNodeDialogVisible"
      :title="t('workflow.addNode')"
      width="600px"
    >
      <el-select
        v-model="selectedNodeType"
        :placeholder="t('workflow.selectNodeType')"
        filterable
        style="width: 100%; margin-bottom: 16px"
      >
        <el-option-group
          v-for="(nodeList, category) in nodeTypesByCategory"
          :key="category"
          :label="category"
        >
          <el-option
            v-for="nodeType in nodeList"
            :key="nodeType.type"
            :label="`${nodeType.label} (${nodeType.type})`"
            :value="nodeType.type"
          >
            <div style="display: flex; flex-direction: column">
              <span>{{ nodeType.label }}</span>
              <span style="font-size: 12px; color: #909399">{{ nodeType.description }}</span>
            </div>
          </el-option>
        </el-option-group>
      </el-select>

      <el-input
        v-model="newNodeVariable"
        :placeholder="t('workflow.variablePlaceholder')"
        style="width: 100%"
      />

      <template #footer>
        <el-button @click="addNodeDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="addNode">{{ t('common.add') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete, Loading, CircleCheck, CircleClose, EditPen, Folder, ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import request from '@/api/request'
import { getContentModels } from '@/api/cards'
import { storeToRefs } from 'pinia'
import { useProjectListStore } from '@/stores/useProjectListStore'
import { useLLMConfigStore } from '@/stores/useLLMConfigStore'
import { usePromptStore } from '@/stores/usePromptStore'
import { useCardStore } from '@/stores/useCardStore'
import { ParameterFormatter } from '@/utils/parameterFormatter'
import { applyWorkflowPatch } from '@/api/workflowAgent'
import { getCardTypeDisplayName, getPromptDisplayName, getSchemaDisplayText, getWorkflowCategoryDisplayName, getWorkflowNodeDisplay } from '@renderer/i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  workflowId: {
    type: Number,
    default: null
  },
  revision: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'node-selected', 'revision-changed'])

// 使用 stores
const projectListStore = useProjectListStore()
const llmConfigStore = useLLMConfigStore()
const promptStore = usePromptStore()
const cardStore = useCardStore()

// 从 stores 获取响应式数据
const { projects: projectList } = storeToRefs(projectListStore)
const { llmConfigs: llmConfigList } = storeToRefs(llmConfigStore)
const { prompts: promptList } = storeToRefs(promptStore)
const { cardTypes: cardTypeList } = storeToRefs(cardStore)

// 状态
const nodes = ref([])
const selectedIndex = ref(-1)
const addNodeDialogVisible = ref(false)
const selectedNodeType = ref('')
const newNodeVariable = ref('')
const nodeTypes = ref([])
// 参数编辑状态
const editingParam = ref(null)
const paramInputRef = ref(null)
// 变量名编辑状态
const editingVariable = ref(null)
const variableInputRef = ref(null)
// 智能选择器数据
const variableList = ref([]) // 所有的变量列表
const fileDialogVisible = ref(false)
const builtinResponseModels = ref([])
// 内部更新标记
const isInternalUpdate = ref(false)
const parseWatchSeq = ref(0)
const revisionRef = ref(props.revision || '')

watch(() => props.revision, value => {
  revisionRef.value = value || ''
})

// 按分类组织的节点类型
const nodeTypesByCategory = computed(() => {
  const grouped = {}
  nodeTypes.value.forEach(rawNodeType => {
    const nodeType = getWorkflowNodeDisplay(rawNodeType, t)
    if (!grouped[nodeType.category]) {
      grouped[nodeType.category] = []
    }
    grouped[nodeType.category].push(nodeType)
  })
  return grouped
})

function getNodeDescription(node) {
  return getWorkflowNodeDisplay(
    {
      type: node.nodeType,
      label: node.nodeType,
      description: node.description,
    },
    t,
  ).description
}

function getNodeLabel(node) {
  return getWorkflowNodeDisplay(
    {
      type: node.nodeType,
      label: node.nodeType,
      description: node.description,
    },
    t,
  ).label
}

// 解析代码为节点块
async function parseCodeToNodes(code) {
  if (!code || !code.trim()) return []

  try {
    // 直接发送代码给后端解析（后端会处理元数据注释）
    const response = await request.post('/workflows/parse', { code }, '/api')
    
    if (!response.success || !response.statements) {
      const errorMsg = response.errors?.join('; ') || t('errors.unknown')
      throw new Error(errorMsg)
    }
    
    const parsedNodes = []
    
    // 构建节点
    for (let i = 0; i < response.statements.length; i++) {
      const stmt = response.statements[i]
      
      // 处理节点调用
      if (stmt.node_type && stmt.node_type !== 'expression' && stmt.node_type !== '_wait') {
        const parts = stmt.node_type.split('.')
        const category = parts[0]
        const method = parts.slice(1).join('.')
        
        const node = {
          variable: stmt.variable,
          category: category,
          method: method,
          nodeType: stmt.node_type,
          description: stmt.description || '',
          params: stmt.config || {},
          code: stmt.code,
          outputs: [],
          collapsed: false,
          disabled: stmt.disabled || false,  // 从后端获取
          isAsync: stmt.is_async || false    // 从后端获取
        }
        
        await fetchNodeOutputs(node)
        parsedNodes.push(node)
      } else {
        // 处理纯表达式、wait语句或其他非标准节点
        parsedNodes.push({
          variable: stmt.variable,
          category: 'Raw',
          method: 'Code',
          nodeType: stmt.node_type || 'Raw.Code',
          description: stmt.description || '',
          params: stmt.config || {},
          code: stmt.code,
          outputs: [],
          collapsed: false,
          disabled: stmt.disabled || false,
          isAsync: stmt.is_async || false
        })
      }
    }
    return parsedNodes
  } catch (error) {
    // 重新抛出异常，让调用者处理
    throw error
  }
}

// 获取节点的输入输出字段
async function fetchNodeOutputs(node) {
  try {
    const response = await request.get(`/nodes/${node.nodeType}/metadata`, undefined, '/api', {
      showLoading: false
    })
    node.outputs = response.outputs || []

    // 合并字段定义和参数值，构建统一的字段列表
    const schema = response.input_schema?.properties || {}
    const hiddenFields = ['debug', 'debug_mode', 'verbose', 'log_level']
    
    // 首先从 schema 创建字段
    const schemaFields = Object.entries(schema)
      .filter(([fieldName]) => !hiddenFields.includes(fieldName))
      .map(([fieldName, fieldDef]) => {
        // 从 params 中获取原始值
        let rawValue = node.params?.[fieldName]
        
        // 格式化为字符串（用于显示和代码生成）
        let formattedValue = ''
        
        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
          const fieldType = resolveFieldType(fieldDef)
          
          // 始终使用 ParameterFormatter 格式化
          try {
            formattedValue = ParameterFormatter.format({
              type: fieldType,
              value: rawValue
            })
            
            // 确保返回的是字符串
            if (typeof formattedValue !== 'string') {
              formattedValue = JSON.stringify(formattedValue)
            }
          } catch {
            // 降级处理：确保返回字符串
            if (typeof rawValue === 'object' && rawValue !== null) {
              formattedValue = JSON.stringify(rawValue)
            } else {
              formattedValue = String(rawValue)
            }
          }
        }
        
        return {
          name: fieldName,
          label: getSchemaDisplayText(fieldDef.description) || fieldName,
          type: resolveFieldType(fieldDef),
          required: fieldDef.required || false,
          default: fieldDef.default,
          value: formattedValue,  // 确保是字符串
          rawSchema: fieldDef  // 保存原始 schema，用于获取 x-component
        }
      })
    
    // 然后添加不在 schema 中但存在于 params 的字段
    const schemaFieldNames = new Set(Object.keys(schema))
    const extraFields = Object.entries(node.params || {})
      .filter(([fieldName]) => !schemaFieldNames.has(fieldName) && !hiddenFields.includes(fieldName))
      .map(([fieldName, rawValue]) => {
        // 推断类型
        let fieldType = 'string'
        if (typeof rawValue === 'number') {
          fieldType = Number.isInteger(rawValue) ? 'integer' : 'number'
        } else if (typeof rawValue === 'boolean') {
          fieldType = 'boolean'
        } else if (Array.isArray(rawValue)) {
          fieldType = 'array'
        } else if (typeof rawValue === 'object' && rawValue !== null) {
          fieldType = 'object'
        }
        
        // 格式化值（确保返回字符串）
        let formattedValue = ''
        try {
          formattedValue = ParameterFormatter.format({
            type: fieldType,
            value: rawValue
          })
          
          // 确保返回的是字符串
          if (typeof formattedValue !== 'string') {
            formattedValue = JSON.stringify(formattedValue)
          }
        } catch {
          // 降级处理：确保返回字符串
          if (typeof rawValue === 'object' && rawValue !== null) {
            formattedValue = JSON.stringify(rawValue)
          } else {
            formattedValue = String(rawValue)
          }
        }
        
        return {
          name: fieldName,
          label: fieldName,
          type: fieldType,
          required: false,
          default: undefined,
          value: formattedValue,  // 确保是字符串
          rawSchema: null  // 额外字段没有 schema
        }
      })
    
    // 合并字段列表
    node.fields = [...schemaFields, ...extraFields]

  } catch {
    node.outputs = []
    node.fields = []
  }
}

// 解析参数字符串
function parseParams(paramsStr) {
  const params = {}
  if (!paramsStr.trim()) return params

  // 简单的参数解析
  const paramRegex = /(\w+)\s*=\s*([^,]+)/g
  let match

  while ((match = paramRegex.exec(paramsStr)) !== null) {
    const [, key, value] = match
    params[key] = value.trim().replace(/^["']|["']$/g, '')
  }

  return params
}

// 将节点块转换为注释标记 DSL 代码
function buildNodeBlockCode(node) {
  if (!node?.variable || !node?.nodeType) {
    return ''
  }

  const paramParts = (node.fields || [])
    .filter(f => f.value !== undefined && f.value !== null && f.value !== '')
    .map(f => {
      let paramValue = f.value

      if (typeof paramValue === 'object' && paramValue !== null) {
        try {
          paramValue = ParameterFormatter.format({
            type: f.type || 'object',
            value: paramValue
          })
        } catch {
          paramValue = JSON.stringify(paramValue)
        }
      }

      const paramStr = String(paramValue)
      if (paramStr === '[object Object]') {
        try {
          paramValue = JSON.stringify(f.value)
        } catch {
          paramValue = '""'
        }
      }

      return `${f.name}=${paramValue}`
    })

  const callExpr = paramParts.length
    ? `${node.variable} = ${node.nodeType}(\n${paramParts.map(p => `    ${p}`).join(',\n')}\n)`
    : `${node.variable} = ${node.nodeType}()`

  const metaParts = []
  if (node.isAsync) metaParts.push('async=true')
  if (node.disabled) metaParts.push('disabled=true')
  if (node.description && String(node.description).trim()) {
    metaParts.push(`description=${JSON.stringify(String(node.description))}`)
  }

  const metaLine = `#@node(${metaParts.join(', ')})`
  return `${metaLine}
${callExpr}
#</node>`
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseNodeBlocksFromCode(code) {
  const normalized = String(code || '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const blocks = []

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (!line || !line.trim().startsWith('#@node')) continue

    const startLine = index
    let endLine = -1
    let variable = null

    for (let cursor = index + 1; cursor < lines.length; cursor++) {
      const current = lines[cursor]
      if (!variable) {
        const assignMatch = current.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/)
        if (assignMatch) {
          variable = assignMatch[1]
        }
      }

      if (current.trim() === '#</node>') {
        endLine = cursor
        break
      }
    }

    if (endLine >= 0) {
      blocks.push({
        variable,
        startLine,
        endLine,
      })
      index = endLine
    }
  }

  return { lines, blocks }
}

function normalizeEditorCode(code) {
  return String(code || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '')
}

function updateSingleNodeCode(node) {
  const currentCode = props.modelValue || ''
  const nodeBlock = buildNodeBlockCode(node)
  if (!nodeBlock) {
    return currentCode
  }

  if (!currentCode.trim()) {
    return normalizeEditorCode(nodesToCode())
  }

  const { lines, blocks } = parseNodeBlocksFromCode(currentCode)
  const target = blocks.find(block => block.variable === node.variable)
  if (!target) {
    return currentCode
  }

  const newBlockLines = String(nodeBlock).replace(/\r\n/g, '\n').split('\n')
  const newLines = [
    ...lines.slice(0, target.startLine),
    ...newBlockLines,
    ...lines.slice(target.endLine + 1),
  ]

  return normalizeEditorCode(newLines.join('\n'))
}

function removeSingleNodeCode(nodeVariable) {
  const currentCode = props.modelValue || ''
  if (!nodeVariable) {
    return currentCode
  }

  if (!currentCode.trim()) {
    return ''
  }

  const { lines, blocks } = parseNodeBlocksFromCode(currentCode)
  const target = blocks.find(block => block.variable === nodeVariable)
  if (!target) {
    return currentCode
  }

  const newLines = [
    ...lines.slice(0, target.startLine),
    ...lines.slice(target.endLine + 1),
  ]

  return normalizeEditorCode(newLines.join('\n'))
}

function appendSingleNodeCode(node) {
  const currentCode = props.modelValue || ''
  const nodeBlock = buildNodeBlockCode(node)
  if (!nodeBlock) return currentCode || ''

  if (!currentCode.trim()) {
    return normalizeEditorCode(nodeBlock)
  }

  const trimmedEnd = currentCode.replace(/\s+$/, '')
  return normalizeEditorCode(`${trimmedEnd}\n\n${nodeBlock}`)
}

function nodesToCode() {
  const nodeBlocks = nodes.value.map(node => buildNodeBlockCode(node)).filter(code => code.trim() !== '')
  
  const result = nodeBlocks.join('\n\n')
  return result
}

function emitCodeUpdate(newCode, options = { internal: true }) {
  const normalized = typeof newCode === 'string' ? newCode : ''
  const current = typeof props.modelValue === 'string' ? props.modelValue : ''
  if (normalized === current) {
    return false
  }

  if (options.internal !== false) {
    isInternalUpdate.value = true
  }

  emit('update:modelValue', normalized)
  return true
}

async function applyCodeUpdateSafely(newCode, options = {}) {
  const normalized = typeof newCode === 'string' ? newCode : ''
  const current = typeof props.modelValue === 'string' ? props.modelValue : ''
  if (normalized === current) {
    return true
  }

  try {
    if (props.workflowId && revisionRef.value) {
      const result = await applyWorkflowPatch(props.workflowId, {
        base_revision: revisionRef.value,
        patch_ops: [
          {
            op: 'replace_code',
            new_code: normalized,
            reason: 'node_block_editor_safe_apply',
          },
        ],
        dry_run: false,
      })

      const finalCode = typeof result?.new_code === 'string' && result.new_code.length
        ? result.new_code
        : normalized

      // 不强制每一次 UI 操作都生成“可校验通过”的代码。
      // 否则像“先把节点设为 async，再补 wait 节点”的正常编辑流程会被后端拒绝写回。
      // 处理策略：若后端校验失败，则仅暂存到前端本地（不更新 revision），直到下一次校验通过再写回。
      if (!result?.success) {
        if (result?.error === 'validate_failed') {
          const parsedNodes = await parseCodeToNodes(finalCode)
          nodes.value = parsedNodes
          emitCodeUpdate(finalCode)
          if (!options.silent) {
            ElMessage.warning(t('workflow.codeStoredLocally'))
          }
          return true
        }

        throw new Error(result?.error || t('workflow.backendPatchError'))
      }

      const parsedNodes = await parseCodeToNodes(finalCode)
      nodes.value = parsedNodes
      revisionRef.value = result.new_revision || revisionRef.value
      emit('revision-changed', revisionRef.value)
      emitCodeUpdate(finalCode)
      return true
    }

    const parsedNodes = await parseCodeToNodes(normalized)
    nodes.value = parsedNodes
    emitCodeUpdate(normalized)
    return true
  } catch {
    if (!options.silent) {
      ElMessage.error(t('workflow.codeUpdateError'))
    }
    return false
  }
}

// 选择节点
function selectNode(index) {
  selectedIndex.value = index
  emit('node-selected', nodes.value[index])
}

// 删除节点
function deleteNode(index) {
  const removedNode = nodes.value[index]
  nodes.value.splice(index, 1)
  if (selectedIndex.value === index) {
    selectedIndex.value = -1
    emit('node-selected', null)
  } else if (selectedIndex.value > index) {
    selectedIndex.value--
  }
  
  // 触发代码更新
  emitCodeUpdate(removeSingleNodeCode(removedNode?.variable))
}

// 切换节点禁用状态
async function toggleNodeDisabled(index) {
  const node = nodes.value[index]
  const targetDisabledState = node.disabled
  const previousDisabledState = !targetDisabledState
  // 仅更新当前节点代码块，避免重排整个工作流代码格式
  const applied = await applyCodeUpdateSafely(updateSingleNodeCode(node), { silent: true })
  if (!applied) {
    node.disabled = previousDisabledState
    ElMessage.error(t('workflow.nodeStateRollback'))
    return
  }
  
  const message = targetDisabledState ? t('workflow.nodeDisabled') : t('workflow.nodeEnabled')
  ElMessage.success(message)
}

// 切换异步/同步
async function toggleAsync(index) {
  const node = nodes.value[index]
  const previousAsyncState = node.isAsync
  
  // 切换 isAsync 状态
  node.isAsync = !node.isAsync
  
  const targetAsyncState = node.isAsync

  // 仅更新当前节点代码块，避免重排整个工作流代码格式
  const newCode = updateSingleNodeCode(node)

  const applied = await applyCodeUpdateSafely(newCode, { silent: true })
  if (!applied) {
    node.isAsync = previousAsyncState
    ElMessage.error(t('workflow.asyncStateRollback'))
    return
  }
  
  const message = targetAsyncState ? t('workflow.switchedToAsync') : t('workflow.switchedToSync')
  ElMessage.success(message)
}

// 显示添加节点对话框
function showAddNodeDialog() {
  selectedNodeType.value = ''
  newNodeVariable.value = ''
  addNodeDialogVisible.value = true
}

// 添加节点
async function addNode() {
  if (!selectedNodeType.value || !newNodeVariable.value) {
    ElMessage.warning(t('workflow.nodeTypeAndVariableRequired'))
    return
  }

  try {
    // 生成注释标记 DSL 节点代码
    const code = `#@node()
${newNodeVariable.value} = ${selectedNodeType.value}()
#</node>`
    
    const parsed = await parseCodeToNodes(code)

    if (parsed && parsed.length > 0) {
      nodes.value.push(parsed[0])
      
      const finalCode = appendSingleNodeCode(parsed[0])
      emitCodeUpdate(finalCode)
      selectedIndex.value = nodes.value.length - 1
      emit('node-selected', nodes.value[selectedIndex.value])
      ElMessage.success(t('workflow.nodeAdded'))
    } else {
      ElMessage.error(t('workflow.nodeAddParseError'))
    }
  } catch {
    ElMessage.error(t('workflow.nodeAddError'))
  }

  addNodeDialogVisible.value = false
}

// 开始编辑参数
function startParamEdit(nodeIndex, fieldIndex) {
  const node = nodes.value[nodeIndex]
  const field = node.fields[fieldIndex]
  
  // 获取当前值，去掉引号和 $ 前缀
  let editValue = field.value
  if (editValue === undefined || editValue === null) {
    editValue = field.default || (field.type === 'boolean' ? false : '')
  }
  
  // 处理布尔值
  if (field.type === 'boolean') {
    // 将字符串 "True"/"False" 转换为布尔值
    if (typeof editValue === 'string') {
      editValue = editValue === 'True' || editValue === 'true'
    }
  }
  // 处理数组类型
  else if (field.type === 'array') {
    // 先去掉外层的引号（如果有）
    if (typeof editValue === 'string') {
      if ((editValue.startsWith('"') && editValue.endsWith('"')) || 
          (editValue.startsWith("'") && editValue.endsWith("'"))) {
        editValue = editValue.substring(1, editValue.length - 1)
      }
    }
    
    // 将数组转换为可编辑的数组项
    let arrayItems = []
    if (Array.isArray(editValue)) {
      arrayItems = editValue.map(item => {
        // 去掉字符串的引号
        const str = String(item)
        if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
          return str.substring(1, str.length - 1)
        }
        return str
      })
    }
    // 如果是字符串形式的数组 ["A1", "A2"]，解析它
    else if (typeof editValue === 'string' && editValue.startsWith('[') && editValue.endsWith(']')) {
      try {
        // 先尝试 JSON 解析
        const parsed = JSON.parse(editValue.replace(/'/g, '"'))
        arrayItems = parsed.map(item => {
          const str = String(item)
          // 去掉引号
          if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
            return str.substring(1, str.length - 1)
          }
          return str
        })
      } catch (e) {
        // 解析失败，手动分割
        const content = editValue.substring(1, editValue.length - 1) // 去掉 [ ]
        arrayItems = content.split(',').map(s => {
          const trimmed = s.trim()
          // 去掉引号
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.substring(1, trimmed.length - 1)
          }
          return trimmed
        }).filter(item => item)
      }
    }
    // 如果是逗号分隔的字符串
    else if (typeof editValue === 'string' && editValue.includes(',')) {
      arrayItems = editValue.split(',').map(s => s.trim()).filter(item => item)
    }
    // 单个值
    else if (editValue) {
      arrayItems = [String(editValue)]
    }
    
    // 保存到 editingParam
    editValue = arrayItems
  }
  // 如果是字符串类型且有引号，去掉引号
  else if (typeof editValue === 'string' && field.type === 'string') {
    if ((editValue.startsWith('"') && editValue.endsWith('"')) || 
        (editValue.startsWith("'") && editValue.endsWith("'"))) {
      editValue = editValue.substring(1, editValue.length - 1)
    }
  }
  
  editingParam.value = {
    nodeIndex,
    fieldIndex,
    fieldName: field.name,
    fieldType: field.type,
    value: field.type === 'array' ? null : editValue,  // 数组类型不使用 value
    arrayItems: field.type === 'array' ? editValue : []  // 数组类型使用 arrayItems
  }
  
}

// 添加数组项
function addArrayItem() {
  if (!editingParam.value || !editingParam.value.arrayItems) return
  editingParam.value.arrayItems.push('')
}

// 删除数组项
function removeArrayItem(index) {
  if (!editingParam.value || !editingParam.value.arrayItems) return
  editingParam.value.arrayItems.splice(index, 1)
}

// 保存参数编辑
async function saveParamEdit() {
  if (!editingParam.value) return
  
  const { nodeIndex, fieldIndex, fieldName, value, arrayItems } = editingParam.value
  const node = nodes.value[nodeIndex]
  
  if (!node || !node.fields || !node.fields[fieldIndex]) {
    ElMessage.error(t('workflow.nodeDataError'))
    editingParam.value = null
    return
  }
  
  const field = node.fields[fieldIndex]
  const fieldType = field.type || editingParam.value.fieldType || 'string'
  const previousFieldValue = field.value
  
  try {
    // 处理数组类型
    let finalValue = value
    if (fieldType === 'array' && arrayItems) {
      // 过滤掉空项
      const filteredItems = arrayItems.filter(item => item && item.trim())
      finalValue = filteredItems
    }
    
    // 使用 ParameterFormatter 处理空值
    if (ParameterFormatter.isEmpty(finalValue)) {
      field.value = undefined
      
      // 重新生成节点代码（不包含该字段）
      const allCode = updateSingleNodeCode(node)
      const applied = await applyCodeUpdateSafely(allCode, { silent: true })
      if (!applied) {
        field.value = previousFieldValue
        ElMessage.error(t('workflow.parameterClearRollback'))
        editingParam.value = null
        return
      }
      ElMessage.success(t('workflow.parameterCleared'))
      
      editingParam.value = null
      return
    }
    
    // 使用 ParameterFormatter 格式化值
    const formattedValue = ParameterFormatter.format({
      type: fieldType,
      value: finalValue
    })

    if (String(formattedValue) === String(field.value ?? '')) {
      editingParam.value = null
      return
    }

    // 更新字段值
    field.value = formattedValue
    
    // 重新生成节点代码
    const allCode = updateSingleNodeCode(node)
    // 验证生成的代码是否有效
    if (!allCode || allCode.trim() === '') {
      throw new Error(t('workflow.generatedCodeEmpty'))
    }
    
    const applied = await applyCodeUpdateSafely(allCode, { silent: true })
    if (!applied) {
      field.value = previousFieldValue
      ElMessage.error(t('workflow.parameterUpdateRollback'))
      editingParam.value = null
      return
    }
    ElMessage.success(t('workflow.parameterUpdated'))
    
    editingParam.value = null
  } catch {
    ElMessage.error(t('settings.saveError'))
    editingParam.value = null
  }
}


// 打开文件夹选择对话框
async function openFolderDialog() {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
    if (result && !result.canceled && result.filePaths.length > 0) {
      if (editingParam.value) {
        const path = result.filePaths[0]
        // 转义 Windows 路径反斜杠
        editingParam.value.value = path.replace(/\\/g, '\\\\')
        // 自动保存
        saveParamEdit()
      }
    }
  } catch {
  }
}

// 显示可用参数（当节点没有参数时）
function showAvailableParams(nodeIndex) {
  const node = nodes.value[nodeIndex]
  if (!node.fields || node.fields.length === 0) {
    ElMessage.info(t('workflow.noConfigurableParameters'))
    return
  }
  
  // 为所有必填字段添加空值
  node.fields.forEach(field => {
    if (field.required && !field.value) {
      field.value = field.default || ''
    }
  })
  
  // 触发更新
  emitCodeUpdate(updateSingleNodeCode(node))
}

// 格式化参数值
function formatParamValue(value) {
  // 处理空值
  if (value === undefined || value === null || value === '') {
    return t('editor.notSet')
  }
  
  // 转换为字符串
  const strValue = String(value)
  
  // 截断过长的字符串
  if (strValue.length > 50) {
    return strValue.substring(0, 50) + '...'
  }
  
  return strValue
}

// 获取节点分类颜色
function getNodeCategoryColor(category) {
  const colors = {
    'Logic': 'primary',
    'Novel': 'success',
    'Card': 'warning',
    'AI': 'danger',
    'Prompt': 'info'
  }
  return colors[category] || 'info'
}

// 获取状态文本
function getStatusText(status) {
  const texts = {
    'running': t('workflow.running'),
    'completed': t('workflow.completed'),
    'error': t('workflow.failed')
  }
  return texts[status] || ''
}

// 加载节点类型
async function loadNodeTypes() {
  try {
    const response = await request.get('/nodes/types', undefined, '/api', { showLoading: false })
    nodeTypes.value = response.node_types || []
  } catch {
  }
}

// 监听代码变化
watch(() => props.modelValue, async (newCode, oldCode) => {
  if (newCode === oldCode) {
    return
  }

  // 如果是内部更新（saveParamEdit/saveVariableEdit 触发），跳过重新解析
  if (isInternalUpdate.value) {
    isInternalUpdate.value = false
    return
  }
  
  const requestSeq = ++parseWatchSeq.value
  
  try {
    const parsedNodes = await parseCodeToNodes(newCode)
    if (requestSeq !== parseWatchSeq.value) {
      return
    }
    nodes.value = parsedNodes
  } catch {
    if (requestSeq !== parseWatchSeq.value) {
      return
    }
    // 解析失败时保持当前节点列表不变
    // 只有在非初始化时才显示错误提示（避免组件挂载时的错误提示）
    if (oldCode !== undefined) {
      ElMessage.error(t('workflow.codeParseErrorWithDetail'))
    }
  }
}, { immediate: true })

// 更新变量列表（从现有节点中提取）
function updateVariableList() {
  const vars = []
  nodes.value.forEach(node => {
     if (node.variable) {
        vars.push({
           value: node.variable,
           label: node.variable,
           type: 'variable'
        })
        // 如果有输出字段，我也加进去? 还是只加根变量?
        // 暂只加根变量
     }
  })
  variableList.value = vars
}

// 判断字段是否需要智能选择器（基于 x-component）
function isSmartSelectorField(field) {
  if (!field || !field.rawSchema) return false
  const xComponent = field.rawSchema['x-component']
  return ['ProjectSelect', 'LLMSelect', 'PromptSelect', 'CardTypeSelect', 'ResponseModelSelect', 'ToolMultiSelect'].includes(xComponent)
}

function getProjectOptionValue(field, project) {
  if (field?.name === 'project_name') {
    return project?.name ?? ''
  }
  return project?.id
}

function getLlmOptionValue(field, llmConfig) {
  if (field?.name === 'llm_name') {
    return llmConfig?.display_name || llmConfig?.model_name || ''
  }
  return llmConfig?.id
}

// 切换节点折叠状态
function toggleNodeCollapse(index) {
  const node = nodes.value[index]
  node.collapsed = !node.collapsed
}

// 开始编辑变量名
function startVariableEdit(nodeIndex, currentVariable) {
  editingVariable.value = {
    nodeIndex,
    value: currentVariable,
    originalValue: currentVariable
  }
  
  nextTick(() => {
    if (variableInputRef.value) {
      variableInputRef.value.focus()
      variableInputRef.value.select()
    }
  })
}

// 保存变量名编辑
async function saveVariableEdit() {
  if (!editingVariable.value) {
    return
  }
  
  const { nodeIndex, value, originalValue } = editingVariable.value
  const newVariable = value.trim()
  
  // 验证变量名
  if (!newVariable) {
    ElMessage.error(t('workflow.variableRequired'))
    editingVariable.value = null
    return
  }
  
  // 验证变量名格式
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newVariable)) {
    ElMessage.error(t('workflow.variableFormat'))
    editingVariable.value = null
    return
  }
  
  // 检查是否与其他节点重名
  const isDuplicate = nodes.value.some((n, idx) => idx !== nodeIndex && n.variable === newVariable)
  if (isDuplicate) {
    ElMessage.error(t('workflow.variableExists', { name: newVariable }))
    editingVariable.value = null
    return
  }
  
  // 如果没有变化，直接返回
  if (newVariable === originalValue) {
    editingVariable.value = null
    return
  }
  
  const allCode = props.modelValue || nodesToCode()
  
  try {
    // 调用后端 API 进行变量重命名
    const response = await request.post('/workflows/rename-variable', {
      code: allCode,
      old_name: originalValue,
      new_name: newVariable
    }, '/api')
    
    if (response.success && response.new_code) {
      // 发送更新事件
      emitCodeUpdate(response.new_code)
      
      // 强制重新解析代码以更新显示
      try {
        nodes.value = await parseCodeToNodes(response.new_code)
      } catch {
      }
      
      ElMessage.success(t('workflow.variableUpdated', { from: originalValue, to: newVariable }))
    } else {
      ElMessage.error(t('workflow.renameError'))
    }
  } catch {
    ElMessage.error(t('workflow.renameError'))
  }
  
  editingVariable.value = null
}

// 取消变量名编辑
function cancelVariableEdit() {
  editingVariable.value = null
}

// 格式化显示值（去掉引号和 $ 前缀）
function formatDisplayValue(field) {
  if (ParameterFormatter.isEmpty(field.value)) {
    return field.default || t('editor.notSet')
  }
  
  // 使用 ParameterFormatter 解析显示值
  let displayValue = ParameterFormatter.parseDisplayValue(field.value)
  
  // 对于智能选择器，显示对应的名称而不是 ID
  const xComponent = field.rawSchema?.['x-component']
  
  if (xComponent === 'ProjectSelect') {
    // 显示项目名称
    const projectId = parseInt(displayValue)
    const project = projectList.value.find(p => p.id === projectId)
    if (project) {
      displayValue = project.name
    }
  } else if (xComponent === 'LLMSelect') {
    // 显示 LLM 配置名称
    const llmConfigId = parseInt(displayValue)
    const llmConfig = llmConfigList.value.find(cfg => cfg.id === llmConfigId)
    if (llmConfig) {
      displayValue = llmConfig.display_name || llmConfig.model_name || `LLM #${llmConfigId}`
    }
  } else if (xComponent === 'PromptSelect') {
    // 显示提示词名称
    const promptId = parseInt(displayValue)
    const prompt = promptList.value.find(p => p.id === promptId)
    if (prompt) {
      displayValue = prompt.built_in ? getPromptDisplayName(prompt.name) : prompt.name
    }
  }
  
  // CodeEditor / Textarea 不截断，保留多行展示
  if (xComponent === 'CodeEditor' || xComponent === 'Textarea') {
    return displayValue
  }

  // 其他字段截断过长的值
  return displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue
}

function resolveFieldType(fieldDef) {
  if (!fieldDef || typeof fieldDef !== 'object') {
    return 'string'
  }

  if (typeof fieldDef.type === 'string' && fieldDef.type.trim()) {
    return fieldDef.type
  }

  if (Array.isArray(fieldDef.type)) {
    const picked = fieldDef.type.find(t => typeof t === 'string' && t !== 'null')
    if (picked) return picked
  }

  if (Array.isArray(fieldDef.anyOf)) {
    const picked = fieldDef.anyOf
      .map(item => item?.type)
      .find(t => typeof t === 'string' && t !== 'null')
    if (picked) return picked
  }

  if (Array.isArray(fieldDef.oneOf)) {
    const picked = fieldDef.oneOf
      .map(item => item?.type)
      .find(t => typeof t === 'string' && t !== 'null')
    if (picked) return picked
  }

  return 'string'
}

// 组件挂载时加载节点类型和数据
onMounted(async () => {
  loadNodeTypes()

  // 使用 stores 加载数据
  try {
    await Promise.all([
      projectListStore.fetchProjects(),
      llmConfigStore.fetchLLMConfigs(),
      promptStore.fetchPrompts(),
      cardStore.fetchInitialData() // 这会加载 cardTypes
    ])

    try {
      builtinResponseModels.value = await getContentModels()
    } catch {
      builtinResponseModels.value = [
        'OneSentence',
        'ChapterOutline',
        'VolumeOutline',
        'WorldBuilding',
        'WritingGuide',
        'ParagraphOverview',
        'BookStageChunkPlan',
        'BookStageFinalPlan'
      ]
    }

  } catch {
  }
})
</script>

<style scoped>
.node-block-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
}

.node-blocks {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.node-block {
  margin-bottom: 12px;
  padding: 16px;
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.node-block:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 12px var(--el-box-shadow-light);
}

.node-block.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.node-block.is-disabled {
  opacity: 0.5;
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color-light);
  position: relative;
}

.node-block.is-disabled::before {
  content: attr(data-disabled-label);
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  background: var(--el-text-color-secondary);
  color: white;
  font-size: 12px;
  border-radius: 4px;
  z-index: 1;
}

.node-block.is-disabled:hover {
  border-color: var(--el-border-color);
  box-shadow: none;
}

.node-block.is-disabled .node-variable,
.node-block.is-disabled .node-type,
.node-block.is-disabled .param-label,
.node-block.is-disabled .param-value {
  color: var(--el-text-color-secondary);
}

.node-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-variable {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.node-type {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.node-description {
  margin: -4px 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
  border-left: 3px solid var(--el-color-primary-light-5);
}

.node-actions {
  display: flex;
  gap: 4px;
}

.node-params {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  margin-bottom: 8px;
}

.params-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.params-title {
  font-weight: 600;
  color: var(--el-text-color-regular);
  font-size: 12px;
  text-transform: uppercase;
}

.param-item {
  display: flex;
  gap: 8px;
}

.param-key {
  color: var(--el-text-color-secondary);
  min-width: 120px;
}


.param-value-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

.param-value {
  color: var(--el-text-color-primary);
  flex: 1;
  word-break: break-all;
}

.param-value.editable {
  cursor: text;
  border-bottom: 1px dashed transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.param-value.editable:hover {
  background-color: var(--el-color-primary-light-9);
  border-bottom-color: var(--el-color-primary);
  padding-left: 4px;
  border-radius: 2px;
}

.edit-icon {
  display: none;
  font-size: 12px;
  color: var(--el-color-primary);
}

.param-value.editable:hover .edit-icon {
  display: inline-flex;
}

.code-expression-input :deep(.el-textarea__inner),
.param-code-preview :deep(.el-textarea__inner) {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Monaco', 'Menlo', 'Courier New', monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.param-code-preview {
  width: 100%;
}

.param-code-preview :deep(.el-textarea__inner) {
  cursor: text;
  background-color: var(--el-fill-color-lighter);
}

.param-code-preview:hover :deep(.el-textarea__inner) {
  border-color: var(--el-color-primary);
}

.add-param-hint {
  padding: 8px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.add-param-hint .el-button {
  color: var(--el-color-primary);
}

.node-outputs {
  padding: 12px;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
  margin-top: 8px;
}

.outputs-title {
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
  font-size: 12px;
  text-transform: uppercase;
}

.output-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.output-tag {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  cursor: pointer;
}

.output-tag:hover {
  opacity: 0.8;
}

.node-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.status-running {
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.status-completed {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.status-error {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.add-node-block {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: var(--el-bg-color);
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  transition: all 0.3s;
}

.add-node-block:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
</style>
