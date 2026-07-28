<template>
  <div class="knowledge-manager">
    <div class="header">
      <h4>{{ t('settings.knowledgeTitle') }}</h4>
      <el-button type="primary" size="small" @click="openEditor()">{{ t('settings.newKnowledge') }}</el-button>
    </div>

    <el-table :data="items" height="60vh" size="small" v-loading="loading">
      <el-table-column prop="name" :label="t('settings.name')" width="90" />
      <el-table-column prop="description" :label="t('settings.description')" min-width="150" />
      <el-table-column :label="t('settings.builtIn')" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.built_in ? 'info' : 'success'">{{ row.built_in ? t('settings.builtIn') : t('settings.custom') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('settings.actions')" width="180" align="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEditor(row)">{{ t('common.edit') }}</el-button>
          <el-popconfirm :title="t('settings.deleteKnowledgeConfirm')" @confirm="remove(row)">
            <template #reference>
              <el-button size="small" type="danger" plain :disabled="row.built_in">{{ t('common.delete') }}</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 将抽屉改为模态对话框，避免抽屉内嵌抽屉 -->
    <el-dialog v-model="editor.visible" :title="editor.editing ? t('settings.editKnowledge') : t('settings.newKnowledge')" width="50%" append-to-body>
      <el-form label-position="top" :model="editor.form">
        <el-form-item :label="t('settings.name')"><el-input v-model="editor.form.name" :disabled="editor.editing && editor.form.built_in" /></el-form-item>
        <el-form-item :label="t('settings.description')"><el-input v-model="editor.form.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item :label="t('settings.knowledgeContent')"><el-input v-model="editor.form.content" type="textarea" :rows="14" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editor.visible=false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="save">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { listKnowledge, createKnowledge, updateKnowledge, deleteKnowledge, type Knowledge } from '@renderer/api/setting'
import { resetKnowledgeOptionCache } from '@renderer/services/knowledgeOptionResolver'

const loading = ref(false)
const { t } = useI18n()
const items = ref<Knowledge[]>([])

const editor = ref<{ visible: boolean; editing: boolean; form: Partial<Knowledge> }>({ visible: false, editing: false, form: {} })

async function fetchList() {
  loading.value = true
  try {
    items.value = await listKnowledge()
  } catch (e:any) {
    ElMessage.error(t('settings.knowledgeLoadError'))
  } finally {
    loading.value = false
  }
}

function openEditor(row?: Knowledge) {
  editor.value.visible = true
  editor.value.editing = !!row
  editor.value.form = row ? { ...row } : { name: '', description: '', content: '' }
}

async function save() {
  try {
    const f = editor.value.form
    if (!f?.name || !f.content) { ElMessage.warning(t('settings.knowledgeRequired')); return }
    if (editor.value.editing && f.id) {
      const saved = await updateKnowledge(f.id, { name: f.name, description: f.description || '', content: f.content })
      resetKnowledgeOptionCache()
      ElMessage.success(t('settings.updated'))
      // 局部更新
      if (saved) {
        const idx = items.value.findIndex(i => i.id === saved.id)
        if (idx >= 0) items.value[idx] = saved
      }
    } else {
      const created = await createKnowledge({ name: f.name, description: f.description || '', content: f.content })
      resetKnowledgeOptionCache()
      ElMessage.success(t('settings.created'))
      if (created) items.value.unshift(created)
    }
    editor.value.visible = false
  } catch (e:any) {
    ElMessage.error(t('settings.saveError'))
  }
}

async function remove(row: Knowledge) {
  try {
    await deleteKnowledge(row.id)
    resetKnowledgeOptionCache()
    ElMessage.success(t('settings.deleted'))
    items.value = items.value.filter(i => i.id !== row.id)
  } catch (e:any) {
    ElMessage.error(e?.message || t('settings.deleteError', { error: t('errors.unknown') }))
  }
}

fetchList()
</script>

<style scoped>
.knowledge-manager { display: flex; flex-direction: column; gap: 12px; height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; }
</style> 
