<template>
  <el-dialog
    v-model="visible"
    :title="t('workflow.runsTitle')"
    width="90%"
    :close-on-click-modal="false"
  >
    <div class="runs-dialog-content">
      <!-- 过滤器 -->
      <div class="filters">
        <el-select v-model="statusFilter" :placeholder="t('workflow.statusFilter')" clearable @change="loadRuns" style="width: 150px">
          <el-option :label="t('workflow.allStatuses')" value="" />
          <el-option :label="t('workflow.running')" value="running" />
          <el-option :label="t('workflow.paused')" value="paused" />
          <el-option :label="t('workflow.completed')" value="succeeded" />
          <el-option :label="t('workflow.failed')" value="failed" />
        </el-select>
        <el-button @click="loadRuns" :icon="Refresh">{{ t('workflow.refresh') }}</el-button>
      </div>

      <!-- 运行列表 -->
      <el-table :data="runs" v-loading="loading" stripe style="margin-top: 10px">
        <el-table-column prop="id" label="ID" width="60" />
        
        <el-table-column :label="t('workflow.workflowColumn')" width="180">
          <template #default="{ row }">
            {{ row.workflow?.name || t('workflow.unnamedWithId', { id: row.workflow_id }) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('workflow.statusColumn')" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('workflow.progressColumn')" width="150">
          <template #default="{ row }">
            <el-progress 
              v-if="row.status === 'running' || row.status === 'paused'"
              :percentage="getProgress(row.id)" 
              :status="row.status === 'paused' ? 'warning' : undefined"
              :stroke-width="8"
            />
            <el-progress 
              v-else-if="row.status === 'succeeded'"
              :percentage="100" 
              status="success"
              :stroke-width="8"
            />
            <el-progress 
              v-else-if="row.status === 'failed'"
              :percentage="100" 
              status="exception"
              :stroke-width="8"
            />
          </template>
        </el-table-column>

        <el-table-column :label="t('workflow.createdAtColumn')" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('workflow.actionsColumn')" fixed="right" width="320">
          <template #default="{ row }">
            <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
              <el-button
                v-if="row.status === 'running'"
                @click="pauseRun(row.id)"
                :icon="VideoPause"
                size="small"
              >
                {{ t('workflow.pause') }}
              </el-button>

              <el-button
                v-if="row.status === 'paused' || row.status === 'failed'"
                type="primary"
                @click="resumeRunFromDialog(row)"
                :icon="VideoPlay"
                size="small"
              >
                {{ t('workflow.resume') }}
              </el-button>

              <el-button
                @click="viewNodeStatus(row.id)"
                :icon="List"
                size="small"
              >
                {{ t('workflow.state') }}
              </el-button>
              
              <el-button
                type="danger"
                @click="deleteRun(row.id)"
                :icon="Delete"
                plain
                size="small"
              >
                {{ t('common.delete') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 节点状态对话框 -->
    <el-dialog
      v-model="nodeStatusVisible"
      :title="t('workflow.nodeStatusTitle')"
      width="700px"
      append-to-body
    >
      <el-table :data="nodeStatuses" v-loading="loadingNodeStatus" size="small">
        <el-table-column prop="node_id" :label="t('workflow.nodeId')" width="120" />
        <el-table-column prop="node_type" :label="t('workflow.nodeType')" width="150" />
        <el-table-column :label="t('workflow.statusColumn')" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('workflow.progressColumn')" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :stroke-width="6" />
          </template>
        </el-table-column>
        <el-table-column prop="error" :label="t('workflow.errorColumn')" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, VideoPause, VideoPlay, Close, List, Delete } from '@element-plus/icons-vue'
import { deleteRun as deleteRunApi } from '@renderer/api/workflows'
import request from '@renderer/api/request'

const { t } = useI18n()

interface WorkflowRun {
  id: number
  workflow_id: number
  status: string
  created_at: string
  workflow?: {
    id: number
    name: string
  }
}

interface NodeStatus {
  node_id: string
  node_type: string
  status: string
  progress: number
  error?: string
}

interface RunStatusResponse {
  nodes: NodeStatus[]
}

const props = defineProps<{
  modelValue: boolean
  workflowId?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'resume-run', run: WorkflowRun): void
}>()

const visible = ref(props.modelValue)
const runs = ref<WorkflowRun[]>([])
const loading = ref(false)
const statusFilter = ref('')
const progressCache = ref<Record<number, number>>({})

const nodeStatusVisible = ref(false)
const nodeStatuses = ref<NodeStatus[]>([])
const loadingNodeStatus = ref(false)

let refreshTimer: number | null = null

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadRuns()
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    stopAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = window.setInterval(() => {
    if (runs.value.some(r => r.status === 'running' || r.status === 'paused')) {
      loadRuns(true)
    }
  }, 3000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function loadRuns(silent = false) {
  if (!silent) {
    loading.value = true
  }

  try {
    const params: any = { limit: 50, offset: 0 }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }

    // 如果指定了 workflowId，只加载该工作流的运行记录
    const url = props.workflowId 
      ? `/workflows/${props.workflowId}/runs`
      : '/runs'
    
    const response = await request.get<WorkflowRun[]>(url, params, '/api')
    runs.value = response

    // 加载运行中任务的进度
    for (const run of runs.value) {
      if (run.status === 'running' || run.status === 'paused') {
        loadProgress(run.id)
      }
    }
  } catch (error: any) {
    if (!silent) {
      ElMessage.error(t('workflow.runsLoadError', { error: error.message || error }))
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function loadProgress(runId: number) {
  try {
    const status = await request.get<RunStatusResponse>(
      `/workflows/runs/${runId}/status`,
      {},
      '/api',
      { showLoading: false }
    )
    
    if (status.nodes && status.nodes.length > 0) {
      const totalProgress = status.nodes.reduce((sum: number, node: NodeStatus) => {
        return sum + node.progress
      }, 0)
      progressCache.value[runId] = Math.round(totalProgress / status.nodes.length)
    }
  } catch (error) {
    // 静默失败，避免干扰用户
    console.warn(`[WorkflowRunsDialog] 加载进度失败: runId=${runId}`, error)
  }
}

function getProgress(runId: number): number {
  return progressCache.value[runId] || 0
}

async function pauseRun(runId: number) {
  try {
    await request.post(`/workflows/runs/${runId}/pause`, {}, '/api')
    ElMessage.success(t('workflow.pauseSuccess'))
    loadRuns()
  } catch (error: any) {
    ElMessage.error(t('workflow.pauseError', { error: error.message || error }))
  }
}

async function resumeRun(runId: number) {
  try {
    await request.post(`/workflows/runs/${runId}/resume`, {}, '/api')
    ElMessage.success(t('workflow.resumeSuccess'))
    loadRuns()
  } catch (error: any) {
    ElMessage.error(t('workflow.resumeError', { error: error.message || error }))
  }
}

async function resumeRunFromDialog(run: WorkflowRun) {
  try {
    // 关闭对话框
    visible.value = false
    
    // 通知父组件恢复执行
    emit('resume-run', run)
    
    ElMessage.success(t('workflow.resumePending'))
  } catch (error: any) {
    ElMessage.error(t('workflow.resumeError', { error: error.message || error }))
  }
}

async function cancelRun(runId: number) {
  try {
    await ElMessageBox.confirm(t('workflow.cancelConfirm'), t('workflow.cancelTitle'), {
      type: 'warning'
    })

    await request.post(`/workflows/runs/${runId}/cancel`, {}, '/api')
    ElMessage.success(t('workflow.cancelSuccess'))
    loadRuns()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(t('workflow.cancelError', { error: error.message || error }))
    }
  }
}

async function viewNodeStatus(runId: number) {
  nodeStatusVisible.value = true
  loadingNodeStatus.value = true

  try {
    const status = await request.get<RunStatusResponse>(`/workflows/runs/${runId}/status`, {}, '/api')
    nodeStatuses.value = status.nodes || []
  } catch (error: any) {
    ElMessage.error(t('workflow.nodesLoadError', { error: error.message || error }))
  } finally {
    loadingNodeStatus.value = false
  }
}

async function deleteRun(runId: number) {
  try {
    await ElMessageBox.confirm(t('workflow.deleteRunConfirm'), t('workflow.deleteRunTitle'), {
      type: 'warning',
      confirmButtonText: t('workflow.deleteRunAction'),
      cancelButtonText: t('common.cancel')
    })

    await deleteRunApi(runId)
    ElMessage.success(t('workflow.deleteRunSuccess'))
    loadRuns()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(t('workflow.deleteRunError', { error: error.message || error }))
    }
  }
}

function getStatusType(status: string): string {
  const typeMap: Record<string, string> = {
    running: 'primary',
    paused: 'warning',
    succeeded: 'success',
    failed: 'danger',
    cancelled: 'info',
    idle: 'info',
    pending: 'info',
    success: 'success',
    error: 'danger'
  }
  return typeMap[status] || 'info'
}

function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    running: t('workflow.running'),
    paused: t('workflow.paused'),
    succeeded: t('workflow.completed'),
    failed: t('workflow.failed'),
    cancelled: t('workflow.cancelled'),
    idle: t('workflow.idle'),
    pending: t('workflow.pending'),
    success: t('workflow.success'),
    error: t('common.error'),
    skipped: t('workflow.skipped')
  }
  return labelMap[status] || status
}

function formatTime(time?: string | number): string {
  if (!time) return '-'
  
  // 如果是数字（Unix 时间戳），需要乘以 1000 转换为毫秒
  // 但如果数字很小（< 100000000），说明可能是错误的数据
  if (typeof time === 'number') {
    console.warn('[formatTime] 收到数字类型的时间戳:', time)
    if (time < 100000000) {
      console.error('[formatTime] 时间戳异常小，可能是错误数据')
      return t('workflow.invalidData')
    }
    time = time * 1000 // 转换为毫秒
  }
  
  const date = new Date(time)
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.error('[formatTime] 无效的日期:', time)
    return t('workflow.invalidDate')
  }
  
  // 检查日期是否在合理范围内（2020-2030）
  const year = date.getFullYear()
  if (year < 2020 || year > 2030) {
    console.error('[formatTime] 日期超出合理范围:', date.toISOString(), '原始值:', time)
    return t('workflow.dateOutOfRange')
  }
  
  return date.toLocaleString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.runs-dialog-content {
  min-height: 400px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
</style>
