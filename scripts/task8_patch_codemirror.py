from pathlib import Path


path = Path("frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '''\t\t\t\t\t<el-button
\t\t\t\t\t\ttype="primary"
\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t@click="expandContextMenu"
\t\t\t\t\t>
\t\t\t\t\t\t快速编辑
\t\t\t\t\t</el-button>
\t\t\t\t\t<el-button
\t\t\t\t\t\tsize="small"
\t\t\t\t\t\ttype="success"
\t\t\t\t\t\t@click="handleContextMenuReference"
''',
    '''\t\t\t\t\t<el-button
\t\t\t\t\t\ttype="primary"
\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t@click="expandContextMenu"
\t\t\t\t\t>
\t\t\t\t\t\t快速编辑
\t\t\t\t\t</el-button>
\t\t\t\t\t<el-button
\t\t\t\t\t\tsize="small"
\t\t\t\t\t\ttype="warning"
\t\t\t\t\t\t@click="handleContextMenuThinkingPorn"
\t\t\t\t\t>
\t\t\t\t\t\tThinking p*rn
\t\t\t\t\t</el-button>
\t\t\t\t\t<el-button
\t\t\t\t\t\tsize="small"
\t\t\t\t\t\ttype="success"
\t\t\t\t\t\t@click="handleContextMenuReference"
''',
    "context menu command",
)

replace_once(
    '''\t\t</Teleport>

\t\t<el-dialog v-model="reviewDialogVisible" title="章节审核结果" width="72%">
''',
    '''\t\t</Teleport>

\t\t<SelectionPipelineDialog
\t\t\tv-model:visible="selectionPipeline.visible"
\t\t\t:source-text="selectionPipeline.snapshot?.text || ''"
\t\t\t:model-options="selectionPipelineModelOptions"
\t\t\t:conflict="selectionPipeline.conflict"
\t\t\t:idempotency-key="selectionPipelineIdempotencyKey"
\t\t\t@accept="acceptSelectionPipeline"
\t\t\t@reject="rejectSelectionPipeline"
\t\t\t@close="closeSelectionPipeline"
\t\t/>

\t\t<el-dialog v-model="reviewDialogVisible" title="章节审核结果" width="72%">
''',
    "pipeline dialog mount",
)

replace_once(
    '''import ContinuationBudgetDialog, { type ContinuationWordControlMode } from './dialogs/ContinuationBudgetDialog.vue'
''',
    '''import ContinuationBudgetDialog, { type ContinuationWordControlMode } from './dialogs/ContinuationBudgetDialog.vue'
import SelectionPipelineDialog from '../pipelines/SelectionPipelineDialog.vue'
''',
    "dialog import",
)

replace_once(
    '''import { notifyTaskDone } from '@renderer/utils/taskDoneNotifier'

import { EditorState, StateEffect, StateField } from '@codemirror/state'
''',
    '''import { notifyTaskDone } from '@renderer/utils/taskDoneNotifier'
import { captureSelection, validateSnapshot, type SelectionSnapshot } from '@renderer/utils/selectionPatch'
import { applySelectionPipelineReplacement } from '@renderer/utils/selectionPipelineEditor'

import { EditorState, StateEffect, StateField } from '@codemirror/state'
''',
    "selection utility imports",
)

replace_once(
    '''})

const pendingAiEdit = ref<{
''',
    '''})

const selectionPipeline = reactive<{
\tvisible: boolean
\tsnapshot: SelectionSnapshot | null
\tconflict: string
\tapplied: boolean
}>({
\tvisible: false,
\tsnapshot: null,
\tconflict: '',
\tapplied: false,
})

const selectionPipelineModelOptions = computed(() => {
\tconst options = aiOptions.value?.llm_configs || []
\treturn options
\t\t.filter((option: any) => Number.isInteger(option?.id) && option.id > 0)
\t\t.map((option: any) => ({
\t\t\tid: Number(option.id),
\t\t\tdisplay_name: String(option.display_name || option.name || `LLM ${option.id}`),
\t\t}))
})

const selectionPipelineIdempotencyKey = computed(() => {
\tconst snapshot = selectionPipeline.snapshot
\tif (!snapshot) return undefined
\treturn [
\t\t'thinking-porn',
\t\tprops.card.id,
\t\tsnapshot.documentHash,
\t\tsnapshot.from,
\t\tsnapshot.to,
\t].join(':')
})

const pendingAiEdit = ref<{
''',
    "pipeline state",
)

replace_once(
    '''\t\t\t\t\tconst txt = update.state.doc.toString()
\t\t\t\t\twordCount.value = computeWordCount(txt)
''',
    '''\t\t\t\t\tconst txt = update.state.doc.toString()
\t\t\t\t\tconst activeSnapshot = selectionPipeline.snapshot
\t\t\t\t\tif (selectionPipeline.visible && activeSnapshot && !selectionPipeline.applied) {
\t\t\t\t\t\tvoid validateSnapshot(activeSnapshot, txt).then(result => {
\t\t\t\t\t\t\tif (
\t\t\t\t\t\t\t\t!selectionPipeline.visible
\t\t\t\t\t\t\t\t|| selectionPipeline.snapshot !== activeSnapshot
\t\t\t\t\t\t\t\t|| selectionPipeline.applied
\t\t\t\t\t\t\t) return
\t\t\t\t\t\t\tselectionPipeline.conflict = result.status === 'conflict'
\t\t\t\t\t\t\t\t? (result.reason || 'Document changed after pipeline launch')
\t\t\t\t\t\t\t\t: ''
\t\t\t\t\t\t})
\t\t\t\t\t}
\t\t\t\t\twordCount.value = computeWordCount(txt)
''',
    "live conflict detection",
)

replace_once(
    '''async function handleContextMenuPolish() {
''',
    '''async function handleContextMenuThinkingPorn() {
\tif (!ensureNoPendingAiEdit()) return
\tconst selectedText = contextMenu.selectedText
\tif (!selectedText || !selectedText.text.trim()) {
\t\tcloseContextMenu()
\t\tElMessage.warning('Zaznacz fragment do przetworzenia przez Thinking p*rn')
\t\treturn
\t}

\ttry {
\t\tconst snapshot = await captureSelection(
\t\t\tgetText(),
\t\t\tselectedText.from,
\t\t\tselectedText.to,
\t\t)
\t\tcloseContextMenu()
\t\tselectionPipeline.snapshot = snapshot
\t\tselectionPipeline.conflict = ''
\t\tselectionPipeline.applied = false
\t\tselectionPipeline.visible = true
\t} catch (error) {
\t\tcloseContextMenu()
\t\tElMessage.error(
\t\t\terror instanceof Error
\t\t\t\t? error.message
\t\t\t\t: 'Nie udało się przechwycić zaznaczenia',
\t\t)
\t}
}

async function acceptSelectionPipeline(replacement: string) {
\tconst snapshot = selectionPipeline.snapshot
\tif (!view || !snapshot) return

\tconst result = await applySelectionPipelineReplacement(
\t\tview,
\t\tsnapshot,
\t\treplacement,
\t\tselectionPipeline.applied,
\t)

\tif (result.status === 'conflict') {
\t\tselectionPipeline.conflict = result.reason || 'Document changed after pipeline launch'
\t\tElMessage.error('Zastosowanie zablokowane: dokument się zmienił')
\t\treturn
\t}
\tif (result.status === 'already_applied') {
\t\tElMessage.warning('Ten wynik został już zastosowany')
\t\treturn
\t}

\tselectionPipeline.applied = true
\tselectionPipeline.conflict = ''
\tselectionPipeline.visible = false
\tclearHighlight()
\tElMessage.success('Zastosowano wynik Thinking p*rn')
}

function resetSelectionPipelineState() {
\tselectionPipeline.visible = false
\tselectionPipeline.snapshot = null
\tselectionPipeline.conflict = ''
\tselectionPipeline.applied = false
\tclearHighlight()
}

function rejectSelectionPipeline() {
\tresetSelectionPipelineState()
}

function closeSelectionPipeline() {
\tresetSelectionPipelineState()
}

async function handleContextMenuPolish() {
''',
    "pipeline handlers",
)

path.write_text(text, encoding="utf-8")
