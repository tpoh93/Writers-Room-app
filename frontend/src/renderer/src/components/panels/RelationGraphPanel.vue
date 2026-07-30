<template>
  <div class="relation-graph-panel">
    <div class="toolbar">
      <el-input v-model="filters.keyword" :placeholder="t('relationGraph.searchPlaceholder')" clearable class="w-keyword" @keyup.enter="reload" />
      <el-select v-model="filters.kind" clearable :placeholder="t('relationGraph.kind')" class="w-select">
        <el-option v-for="k in kindOptions" :key="k" :label="getRelationKindDisplayName(k)" :value="k" />
      </el-select>
      <el-select v-model="filters.stance" clearable :placeholder="t('relationGraph.stance')" class="w-select">
        <el-option v-for="s in stanceOptions" :key="s" :label="getRelationStanceDisplayName(s)" :value="s" />
      </el-select>
      <el-button type="primary" @click="reload">{{ t('common.search') }}</el-button>
      <el-button @click="resetFilters">{{ t('common.reset') }}</el-button>
    </div>

    <div class="actions">
      <el-button type="primary" @click="openCreate">{{ t('relationGraph.add') }}</el-button>
      <el-button @click="openBatchCreate">{{ t('relationGraph.batchAdd') }}</el-button>
      <el-button @click="openImport">{{ t('common.import') }}</el-button>
      <el-button :disabled="selectedKeys.length === 0" @click="exportSelected('json')">{{ t('relationGraph.exportJson') }}</el-button>
      <el-button :disabled="selectedKeys.length === 0" @click="exportSelected('csv')">{{ t('relationGraph.exportCsv') }}</el-button>
      <el-button :disabled="selectedKeys.length === 0" type="danger" @click="batchDelete">{{ t('relationGraph.batchDelete') }}</el-button>
      <el-button :disabled="selectedKeys.length === 0" @click="batchKindVisible = true">{{ t('relationGraph.batchKind') }}</el-button>
      <el-button :disabled="selectedKeys.length === 0" @click="batchStanceVisible = true">{{ t('relationGraph.batchStance') }}</el-button>
      <el-button :disabled="selectedKeys.length === 0" @click="batchEventsVisible = true">{{ t('relationGraph.batchEvents') }}</el-button>
    </div>

    <el-table :data="rows" border stripe v-loading="loading" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="source" label="A" min-width="140" />
      <el-table-column prop="target" label="B" min-width="140" />
      <el-table-column prop="kind_cn" :label="t('relationGraph.relation')" min-width="170">
        <template #default="{ row }">{{ getRelationKindDisplayName(row.kind_cn || row.kind || '') }}</template>
      </el-table-column>
      <el-table-column prop="stance" :label="t('relationGraph.stance')" min-width="130">
        <template #default="{ row }">{{ getRelationStanceDisplayName(row.stance || '') }}</template>
      </el-table-column>
      <el-table-column prop="fact" :label="t('relationGraph.fact')" min-width="260" show-overflow-tooltip />
      <el-table-column :label="t('relationGraph.updatedAt')" width="180">
        <template #default="{ row }">
          {{ row.updated_at ? new Date(row.updated_at).toLocaleString() : '' }}
        </template>
      </el-table-column>
      <el-table-column :label="t('common.actions')" width="140" fixed="right">
        <template #default="scope">
          <el-button text size="small" @click="openEdit(scope.row)">{{ t('common.edit') }}</el-button>
          <el-button text size="small" type="danger" @click="removeOne(scope.row)">{{ t('common.delete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="reload"
      />
    </div>

    <el-dialog v-model="editVisible" :title="editMode === 'create' ? t('relationGraph.add') : t('relationGraph.edit')" width="680px">
      <el-form label-width="110px">
        <el-form-item :label="t('relationGraph.entityA')"><el-input v-model="form.source" /></el-form-item>
        <el-form-item :label="t('relationGraph.kind')">
          <el-select v-model="form.kind_cn" :placeholder="t('relationGraph.selectKind')">
            <el-option v-for="k in kindOptions" :key="k" :label="getRelationKindDisplayName(k)" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('relationGraph.entityB')"><el-input v-model="form.target" /></el-form-item>
        <el-form-item :label="t('relationGraph.stance')">
          <el-select v-model="form.stance" clearable>
            <el-option v-for="s in stanceOptions" :key="s" :label="getRelationStanceDisplayName(s)" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('relationGraph.fact')"><el-input v-model="form.fact" type="textarea" :rows="2" /></el-form-item>
        <el-form-item :label="t('relationGraph.aCallsB')"><el-input v-model="form.a_to_b_addressing" /></el-form-item>
        <el-form-item :label="t('relationGraph.bCallsA')"><el-input v-model="form.b_to_a_addressing" /></el-form-item>
        <el-form-item :label="t('relationGraph.recentDialogues')">
          <el-input v-model="form.dialoguesText" type="textarea" :rows="3" :placeholder="t('relationGraph.onePerLine')" />
        </el-form-item>
        <el-form-item :label="t('relationGraph.recentEvents')">
          <el-input v-model="form.eventsText" type="textarea" :rows="3" :placeholder="t('relationGraph.summaryPerLine')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitEdit">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchKindVisible" :title="t('relationGraph.batchKindTitle')" width="420px">
      <el-select v-model="batchKind" :placeholder="t('relationGraph.selectNewKind')" style="width: 100%">
        <el-option v-for="k in kindOptions" :key="k" :label="getRelationKindDisplayName(k)" :value="k" />
      </el-select>
      <template #footer>
        <el-button @click="batchKindVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="applyBatchKind">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchStanceVisible" :title="t('relationGraph.batchStanceTitle')" width="420px">
      <el-select v-model="batchStance" clearable :placeholder="t('relationGraph.selectNewStance')" style="width: 100%">
        <el-option v-for="s in stanceOptions" :key="s" :label="getRelationStanceDisplayName(s)" :value="s" />
      </el-select>
      <template #footer>
        <el-button @click="batchStanceVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="applyBatchStance">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchEventsVisible" :title="t('relationGraph.batchEventsTitle')" width="520px">
      <el-input v-model="batchEventsText" type="textarea" :rows="6" :placeholder="t('relationGraph.eventSummaryPerLine')" />
      <template #footer>
        <el-button @click="batchEventsVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="applyBatchEvents">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchCreateVisible" :title="t('relationGraph.batchAddTitle')" width="680px">
      <div class="tip">{{ t('relationGraph.batchFormatTip') }}</div>
      <el-input v-model="batchCreateText" type="textarea" :rows="12" />
      <template #footer>
        <el-button @click="batchCreateVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitBatchCreate">{{ t('common.submit') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" :title="t('relationGraph.importTitle')" width="680px">
      <div class="toolbar compact">
        <el-select v-model="importFormat" class="w-select">
          <el-option label="JSON" value="json" />
          <el-option label="CSV" value="csv" />
        </el-select>
        <el-button @click="pickFile">{{ t('relationGraph.readFile') }}</el-button>
      </div>
      <input ref="fileInputRef" type="file" class="hidden" @change="onFileChange" />
      <el-input v-model="importContent" type="textarea" :rows="12" />
      <template #footer>
        <el-button @click="importVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitImport">{{ t('common.import') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import {
  batchAppendEventsRelationGraph,
  batchCreateRelationGraph,
  batchDeleteRelationGraph,
  batchUpdateKindRelationGraph,
  batchUpdateStanceRelationGraph,
  deleteRelationGraph,
  exportRelationGraph,
  getRelationGraphMeta,
  importRelationGraph,
  listRelationGraph,
  upsertRelationGraph,
  type RelationGraphKind,
  type RelationGraphKey,
  type RelationGraphRecord,
  type RelationGraphStance,
} from '@renderer/api/relationGraph'
import { getRelationKindDisplayName, getRelationStanceDisplayName } from '@renderer/i18n'

const props = defineProps<{ refreshSeq?: number }>()

const { t } = useI18n()
const projectStore = useProjectStore()
const loading = ref(false)
const rows = ref<RelationGraphRecord[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const selectedRows = ref<RelationGraphRecord[]>([])

const filters = reactive<{ keyword: string; kind: RelationGraphKind | ''; stance: RelationGraphStance | '' }>({
  keyword: '',
  kind: '',
  stance: '',
})

const kindOptions = ref<RelationGraphKind[]>([])
const stanceOptions = ref<RelationGraphStance[]>([])

const editVisible = ref(false)
const editMode = ref<'create' | 'edit'>('create')
const editingKey = ref<RelationGraphKey | null>(null)
const form = reactive({
  source: '',
  target: '',
  kind_cn: '' as RelationGraphKind | '',
  stance: '' as RelationGraphStance | '',
  fact: '',
  a_to_b_addressing: '',
  b_to_a_addressing: '',
  dialoguesText: '',
  eventsText: '',
})

const batchKindVisible = ref(false)
const batchKind = ref<RelationGraphKind | ''>('')
const batchStanceVisible = ref(false)
const batchStance = ref<RelationGraphStance | ''>('')
const batchEventsVisible = ref(false)
const batchEventsText = ref('')
const batchCreateVisible = ref(false)
const batchCreateText = ref('')

const importVisible = ref(false)
const importFormat = ref<'json' | 'csv'>('json')
const importContent = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const selectedKeys = computed<RelationGraphKey[]>(() =>
  selectedRows.value
    .filter((r) => !!r.source && !!r.target && !!r.kind_en)
    .map((r) => ({ source: r.source!, target: r.target!, kind_en: r.kind_en! }))
)

function getProjectId(): number {
  const pid = projectStore.currentProject?.id
  if (!pid) throw new Error(t('relationGraph.selectProject'))
  return pid
}

function parseLines(text: string): string[] {
  return (text || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
}

function resetForm() {
  form.source = ''
  form.target = ''
  form.kind_cn = ''
  form.stance = ''
  form.fact = ''
  form.a_to_b_addressing = ''
  form.b_to_a_addressing = ''
  form.dialoguesText = ''
  form.eventsText = ''
}

function openCreate() {
  editMode.value = 'create'
  editingKey.value = null
  resetForm()
  editVisible.value = true
}

function openEdit(row: RelationGraphRecord) {
  editMode.value = 'edit'
  editingKey.value = { source: row.source!, target: row.target!, kind_en: row.kind_en! }
  form.source = row.source || ''
  form.target = row.target || ''
  form.kind_cn = ((row.kind_cn || row.kind || '') as RelationGraphKind | '')
  form.stance = ((row.stance || '') as RelationGraphStance | '')
  form.fact = row.fact || ''
  form.a_to_b_addressing = row.a_to_b_addressing || ''
  form.b_to_a_addressing = row.b_to_a_addressing || ''
  form.dialoguesText = (row.recent_dialogues || []).join('\n')
  form.eventsText = (row.recent_event_summaries || []).map((e: any) => e.summary || '').filter(Boolean).join('\n')
  editVisible.value = true
}

async function reload() {
  try {
    const projectId = getProjectId()
    loading.value = true
    const resp = await listRelationGraph({
      project_id: projectId,
      keyword: filters.keyword || undefined,
      kinds: filters.kind ? [filters.kind] : [],
      stances: filters.stance ? [filters.stance] : [],
      offset: (page.value - 1) * pageSize.value,
      limit: pageSize.value,
    })
    rows.value = resp.items || []
    total.value = resp.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.loadError'))
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.kind = ''
  filters.stance = ''
  page.value = 1
  reload()
}

function onSelectionChange(list: RelationGraphRecord[]) {
  selectedRows.value = list || []
}

async function submitEdit() {
  try {
    const projectId = getProjectId()
    const saved = await upsertRelationGraph({
      project_id: projectId,
      relation: {
        source: form.source,
        target: form.target,
        kind_cn: form.kind_cn || undefined,
        fact: form.fact || undefined,
        a_to_b_addressing: form.a_to_b_addressing || undefined,
        b_to_a_addressing: form.b_to_a_addressing || undefined,
        stance: form.stance || undefined,
        recent_dialogues: parseLines(form.dialoguesText),
        recent_event_summaries: parseLines(form.eventsText).map((summary) => ({ summary })),
      },
    })

    if (editMode.value === 'edit' && editingKey.value) {
      const oldKey = editingKey.value
      const changedKey =
        oldKey.source !== saved.source ||
        oldKey.target !== saved.target ||
        oldKey.kind_en !== saved.kind_en
      if (changedKey) {
        await deleteRelationGraph({ project_id: projectId, key: oldKey })
      }
    }

    editVisible.value = false
    ElMessage.success(t('relationGraph.saveSuccess'))
    reload()
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.saveError'))
  }
}

async function removeOne(row: RelationGraphRecord) {
  try {
    const projectId = getProjectId()
    await ElMessageBox.confirm(
      t('relationGraph.deleteConfirm', { source: row.source, target: row.target }),
      t('relationGraph.deleteTitle'),
      { type: 'warning' }
    )
    await deleteRelationGraph({ project_id: projectId, key: { source: row.source!, target: row.target!, kind_en: row.kind_en! } })
    ElMessage.success(t('relationGraph.deleteSuccess'))
    reload()
  } catch {}
}

async function batchDelete() {
  try {
    const projectId = getProjectId()
    await ElMessageBox.confirm(
      t('relationGraph.batchDeleteConfirm', { count: selectedKeys.value.length }),
      t('relationGraph.batchDeleteTitle'),
      { type: 'warning' }
    )
    const resp = await batchDeleteRelationGraph({ project_id: projectId, keys: selectedKeys.value })
    ElMessage.success(t('relationGraph.deletedCount', { count: resp.affected || 0 }))
    reload()
  } catch {}
}

async function applyBatchKind() {
  try {
    const projectId = getProjectId()
    const resp = await batchUpdateKindRelationGraph({
      project_id: projectId,
      keys: selectedKeys.value,
      new_kind_cn: batchKind.value || undefined,
    })
    ElMessage.success(t('relationGraph.updatedCount', { count: resp.affected || 0 }))
    batchKindVisible.value = false
    batchKind.value = ''
    reload()
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.batchUpdateError'))
  }
}

async function applyBatchStance() {
  try {
    const projectId = getProjectId()
    const resp = await batchUpdateStanceRelationGraph({
      project_id: projectId,
      keys: selectedKeys.value,
      stance: batchStance.value || undefined,
    })
    ElMessage.success(t('relationGraph.updatedCount', { count: resp.affected || 0 }))
    batchStanceVisible.value = false
    batchStance.value = ''
    reload()
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.batchUpdateError'))
  }
}

async function applyBatchEvents() {
  try {
    const projectId = getProjectId()
    const events = parseLines(batchEventsText.value).map((summary) => ({ summary }))
    const resp = await batchAppendEventsRelationGraph({ project_id: projectId, keys: selectedKeys.value, events, max_size: 20 })
    ElMessage.success(t('relationGraph.updatedCount', { count: resp.affected || 0 }))
    batchEventsVisible.value = false
    batchEventsText.value = ''
    reload()
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.batchUpdateError'))
  }
}

function openBatchCreate() {
  batchCreateVisible.value = true
}

function parseBatchCreateInput(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed)
    if (!Array.isArray(arr)) throw new Error(t('relationGraph.jsonArrayRequired'))
    return arr
  }
  return parseLines(trimmed).map((line) => {
    const [source, target, kind_cn, stance] = line.split(',').map((x) => x.trim())
    return { source, target, kind_cn, stance }
  })
}

async function submitBatchCreate() {
  try {
    const projectId = getProjectId()
    const relations = parseBatchCreateInput(batchCreateText.value)
    const resp = await batchCreateRelationGraph({ project_id: projectId, relations })
    ElMessage.success(t('relationGraph.processedCount', { count: resp.affected || 0 }))
    batchCreateVisible.value = false
    batchCreateText.value = ''
    reload()
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.batchAddError'))
  }
}

function saveDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function exportSelected(format: 'json' | 'csv') {
  try {
    const projectId = getProjectId()
    const resp = await exportRelationGraph({ project_id: projectId, format, keys: selectedKeys.value })
    saveDownload(resp.filename || `relation-graph.${format}`, resp.content || '', resp.mime_type || 'text/plain')
    ElMessage.success(t('relationGraph.exportSuccess'))
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.exportError'))
  }
}

function openImport() {
  importVisible.value = true
}

function pickFile() {
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importContent.value = await file.text()
}

async function submitImport() {
  try {
    const projectId = getProjectId()
    const resp = await importRelationGraph({ project_id: projectId, format: importFormat.value, content: importContent.value })
    ElMessage.success(t('relationGraph.importSuccess', {
      created: resp.created || 0,
      updated: resp.updated || 0,
      failed: resp.failed || 0,
    }))
    if ((resp.errors || []).length > 0) {
      ElMessage.warning(t('relationGraph.importWarning', { count: resp.errors?.length }))
    }
    importVisible.value = false
    reload()
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.importError'))
  }
}

async function loadMeta() {
  try {
    const meta = await getRelationGraphMeta()
    kindOptions.value = (meta.kinds || []).map((item) => item.kind_cn).filter(Boolean)
    stanceOptions.value = (meta.stances || []).filter(Boolean)
  } catch (e: any) {
    ElMessage.error(e?.message || t('relationGraph.metaLoadError'))
  }
}

onMounted(async () => {
  await loadMeta()
  reload()
})

watch(() => props.refreshSeq, (next, prev) => {
  if (next !== prev) {
    reload()
  }
})
</script>

<style scoped>
.relation-graph-panel { display: flex; flex-direction: column; gap: 12px; padding: 12px; height: 100%; }
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toolbar.compact { padding: 0 0 8px 0; }
.actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.w-keyword { width: 280px; }
.w-select { width: 140px; }
.pager { display: flex; justify-content: flex-end; padding-top: 8px; }
.hidden { display: none; }
.tip { color: var(--el-text-color-secondary); font-size: 12px; margin-bottom: 8px; }
</style>
