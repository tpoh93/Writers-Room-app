<template>
  <el-dialog :model-value="modelValue" title="Odzyskiwanie niezapisanej pracy" :close-on-click-modal="false" @update:model-value="$emit('cancel')">
    <p v-if="comparison?.kind === 'ordinary'">Znaleziono nowszy lokalny draft. Odzyskanie otworzy go jako niezapisany.</p>
    <p v-else>Wykryto konflikt między zapisaną wersją a lokalnym draftem. Nic nie zostanie nadpisane automatycznie.</p>
    <div class="recovery-preview">
      <h4>Wersja zapisana</h4><pre>{{ canonicalText }}</pre>
      <h4>Draft lokalny</h4><pre>{{ draftText }}</pre>
    </div>
    <template #footer>
      <el-button @click="$emit('cancel')">Anuluj</el-button>
      <el-button @click="$emit('discard')">Odrzuć draft</el-button>
      <el-button type="primary" @click="$emit('recover')">Odzyskaj</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecoveryComparison } from '@renderer/services/writerRecovery'
import type { WriterSnapshot } from '@renderer/services/writerSnapshot'
const props = defineProps<{ modelValue: boolean; comparison: RecoveryComparison | null; canonical: WriterSnapshot | null }>()
defineEmits(['recover', 'discard', 'cancel'])
const canonicalText = computed(() => JSON.stringify(props.canonical?.content ?? {}, null, 2))
const draftText = computed(() => JSON.stringify(props.comparison?.draft.content ?? {}, null, 2))
</script>
