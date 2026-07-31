<template>
  <div class="ctx-panel">
    <div class="panel-header">
      <h3 class="panel-title">{{ t('contextPanel.entities') }}</h3>
      <el-button size="small" type="primary" :loading="assembling" @click="assemble">{{ t('contextPanel.refresh') }}</el-button>
    </div>
    
    <el-form label-width="70px" class="controls">
      <el-form-item :label="t('contextPanel.participants')">
        <el-select v-model="localParticipants" multiple filterable allow-create default-first-option :placeholder="t('contextPanel.participantsPlaceholder')" @change="onParticipantsChange">
          <el-option-group v-for="g in participantGroups" :key="g.label" :label="g.label">
            <el-option v-for="p in g.values" :key="p" :label="p" :value="p" />
          </el-option-group>
        </el-select>
      </el-form-item>
    </el-form>

    <div v-if="assembled" class="assembled">
      <p class="preview-intro">{{ t('contextPanel.previewIntro') }}</p>
      <div v-if="authorPreview.sections.length" class="author-preview">
        <section v-for="section in authorPreview.sections" :key="section.title" class="author-preview-section">
          <h4>{{ section.title }}</h4>
          <ul class="list">
            <li v-for="(entry, index) in section.entries" :key="index">{{ entry }}</li>
          </ul>
        </section>
      </div>
      <div v-else class="no-facts">{{ t('contextPanel.noFacts') }}</div>
      <el-collapse v-if="assembled.facts_subgraph" class="technical-preview">
        <el-collapse-item :title="t('contextPanel.technicalView')" name="technical">
          <p class="technical-hint">{{ t('contextPanel.technicalHint') }}</p>
          <pre class="pre">{{ assembled.facts_subgraph }}</pre>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { assembleContext, type AssembleContextResponse } from '@renderer/api/ai'
import { ElMessage } from 'element-plus'
import { getCardsForProject, type CardRead } from '@renderer/api/cards'
import { buildAuthorContextPreview } from '@renderer/services/contextPreview'

const { t } = useI18n()

const props = defineProps<{ projectId?: number; participants?: string[]; volumeNumber?: number | null; stageNumber?: number | null; chapterNumber?: number | null; draftTail?: string; prefetched?: AssembleContextResponse | null }>()
const emit = defineEmits<{
  (e:'update:participants', v: string[]): void;
  (e:'update:volumeNumber', v: number | null): void;
  (e:'update:stageNumber', v: number | null): void;
  (e:'update:chapterNumber', v: number | null): void;
  (e:'context-updated', v: AssembleContextResponse): void;
}>()

const assembling = ref(false)
const assembled = ref<AssembleContextResponse | null>(null)
const authorPreview = computed(() => buildAuthorContextPreview(
  assembled.value?.facts_structured,
  assembled.value?.facts_subgraph,
))
// 回显入口已移除

type Group = { label: string; values: string[] }
const participantGroups = ref<Group[]>([])
const localParticipants = ref<string[]>(props.participants || [])
const localVolumeNumber = ref<number | null>(props.volumeNumber ?? null)
const localStageNumber = ref<number | null>(props.stageNumber ?? null)
const localChapterNumber = ref<number | null>(props.chapterNumber ?? null)

// 缓存：名称 -> 分组标签（通过项目卡片匹配）
const nameToGroup = ref<Record<string, string>>({})

watch(() => props.participants, (v) => { localParticipants.value = [...(v || [])] })
watch(() => props.volumeNumber, (v) => { localVolumeNumber.value = v ?? null })
watch(() => props.stageNumber, (v) => { localStageNumber.value = v ?? null })
watch(() => props.chapterNumber, (v) => { localChapterNumber.value = v ?? null })
watch(() => props.prefetched, (v) => { if (v) assembled.value = v })
watch(() => props.projectId, async () => { await buildNameGroupCache(); await buildAllGroups() })

function emitParticipants() { emit('update:participants', [...localParticipants.value]) }
function emitVolume() { emit('update:volumeNumber', localVolumeNumber.value ?? null) }
function emitStage() { emit('update:stageNumber', localStageNumber.value ?? null) }
function emitChapter() { emit('update:chapterNumber', localChapterNumber.value ?? null) }

function detectTypeGroupByCard(c: CardRead): string {
  // 1) 优先使用内容中的实体类型标记（后端新增）
  const et = (c.content as any)?.entity_type
  if (et === 'character') return t('contextPanel.characters')
  if (et === 'scene') return t('contextPanel.scenes')
  if (et === 'organization') return t('contextPanel.organizations')
  if (et === 'item') return t('contextPanel.items')
  if (et === 'concept') return t('contextPanel.concepts')

  // 2) 使用卡片类型中文名归类
  const tname = (c.card_type?.name || '').trim()
  if (tname.includes('角色')) return t('contextPanel.characters')
  if (tname.includes('场景')) return t('contextPanel.scenes')
  if (tname.includes('组织')) return t('contextPanel.organizations')
  if (tname.includes('物品')) return t('contextPanel.items')
  if (tname.includes('概念')) return t('contextPanel.concepts')

  // 3) 兼容旧模型名：优先实例/类型的 model_name
  const m = (c as any).model_name || (c.card_type as any)?.model_name || ''
  if (m === 'CharacterCard') return t('contextPanel.characters')
  if (m === 'SceneCard') return t('contextPanel.scenes')
  if (m === 'OrganizationCard') return t('contextPanel.organizations')

  return t('contextPanel.other')
}

async function buildNameGroupCache() {
  nameToGroup.value = {}
  if (!props.projectId) return
  try {
    const cards: CardRead[] = await getCardsForProject(props.projectId)
    for (const c of cards) {
      const nm = (c.title || '').trim()
      if (!nm) continue
      nameToGroup.value[nm] = detectTypeGroupByCard(c)
    }
  } catch {}
}

async function buildAllGroups() {
  if (!props.projectId) { participantGroups.value = []; return }
  try {
    const cards: CardRead[] = await getCardsForProject(props.projectId)
    const order = [
      t('contextPanel.characters'),
      t('contextPanel.scenes'),
      t('contextPanel.organizations'),
      t('contextPanel.items'),
      t('contextPanel.concepts'),
      t('contextPanel.other'),
    ]
    const buckets = new Map<string, Set<string>>()
    order.forEach(t => buckets.set(t, new Set<string>()))
    for (const c of cards) {
      const t = detectTypeGroupByCard(c)
      const title = (c.title || '').trim()
      if (!title) continue
      buckets.get(t)!.add(title)
    }
    participantGroups.value = order
      .map(label => ({ label, values: Array.from(buckets.get(label) || []).sort((a,b)=>a.localeCompare(b)) }))
      .filter(g => g.values.length > 0)
  } catch {
    participantGroups.value = []
  }
}

function onParticipantsChange() {
  emitParticipants();
}

onMounted(async () => { await buildNameGroupCache(); await buildAllGroups(); if (props.prefetched) assembled.value = props.prefetched })

async function assemble() {
  try {
    assembling.value = true
    const res = await assembleContext({
      project_id: props.projectId,
      volume_number: localVolumeNumber.value ?? undefined,
      chapter_number: localChapterNumber.value ?? undefined,
      participants: localParticipants.value,
      current_draft_tail: props.draftTail || ''
    })
    assembled.value = res
    emit('context-updated', res)
    // 将最新本地值回写父层，确保保存时同步
    emitParticipants(); emitVolume(); emitStage(); emitChapter();
    ElMessage.success(t('contextPanel.assembled'))
  } catch (e:any) {
    ElMessage.error(t('contextPanel.assembleError'))
  } finally {
    assembling.value = false
  }
}
</script>

<style scoped>
.ctx-panel { display: flex; flex-direction: column; gap: 0; height: 100%; }
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 2px solid var(--el-border-color-light);
  background: var(--el-fill-color-lighter);
}
.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.controls { padding: 12px 16px; border-bottom: 1px solid var(--el-border-color-light); }
.actions { display: flex; gap: 8px; }
.assembled { padding: 16px; overflow: auto; color: var(--el-text-color-primary); font-size: 14px; line-height: 1.8; }
.preview-intro { margin: 0 0 12px; color: var(--el-text-color-regular); }
.author-preview { margin-bottom: 8px; max-height: min(52vh, 560px); overflow-y: auto; padding-right: 4px; }
.author-preview-section + .author-preview-section { margin-top: 14px; }
.author-preview-section h4 { margin: 0 0 5px; font-size: 14px; color: var(--el-text-color-primary); }
.no-facts { color: var(--el-text-color-regular); }
.pre { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 13px; color: var(--el-text-color-primary); }
.facts-structured { margin-bottom: 8px; }
.facts-title { font-weight: 600; margin: 6px 0; color: var(--el-text-color-primary); }
.list { margin: 0; padding-left: 16px; }
.list li { margin: 4px 0; }
.muted { color: var(--el-text-color-regular); }
.relation-item { margin-bottom: 10px; }
.relation-head { font-weight: 600; margin: 2px 0; color: var(--el-text-color-primary); }
.addressing span { display: inline-block; }
.dialog-text { white-space: pre-wrap; line-height: 1.8; font-size: 13.5px; color: var(--el-text-color-primary); }
.badges { margin-left: 8px; }
.raw-toggle { margin: 6px 0; }
.technical-preview { margin-top: 16px; }
.technical-hint { margin: 0 0 8px; color: var(--el-text-color-regular); font-size: 13px; }
</style> 
