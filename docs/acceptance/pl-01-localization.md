# PL-01 Polish Interface Localization Acceptance Evidence

Status: READY FOR REVIEW

## Base

- Base SHA: `b240d8f0823fb6ae97c7f5688918c43646d62ca7`
- Branch: `feature/pl-01-localization`
- Frozen upstream baseline: `ca7ca584580df0220a6a0d008309e5575b3dc449`

## Goal

PL-01 sets Polish as the default NovelForge interface language, centralizes user-visible copy through the already-installed `vue-i18n`, and preserves product behavior and visual layout.

## Existing localization architecture

The repository already declared `vue-i18n@^11.1.10` in `frontend/package.json`, but the renderer had no active i18n bootstrap. The inactive `frontend/src/renderer/src/locales/zh-CN.json` file was not wired into `main.ts`.

PL-01 uses Vue I18n Composition API with `legacy: false`, `locale: 'pl'`, and `fallbackLocale: 'pl'`. The renderer registers `app.use(i18n)`. Element Plus receives its official bundled Polish locale through `app.use(ElementPlus, { locale: elementPlusLocale })`; the wrapper only fills the two missing close accessibility labels. Workflow node metadata is localized in the display layer by stable node `type`, while unknown future types fall back to backend metadata without changing workflow contracts. No dependency was added or updated. The document and Electron window titles identify the product as NovelForge, and document language is `pl`.

Historical card/card-type sentinels and their generated description suffix remain byte-compatible with the existing persistence and assistant-context contracts. Presentation helpers map only those exact legacy values to Polish at UI boundaries. Vue I18n syntax examples containing `@`, braces, angle brackets, dollar placeholders, or a literal `|` use literal interpolation so the examples render unchanged instead of being parsed as linked messages, placeholders, HTML, or plural branches.

## Inventory

The pre-change inventory was written outside the repository to `/tmp/writers-room-pl01-user-visible-files.txt` before the first copy edit. It contains exactly 80 USER_VISIBLE source files. “English visible strings before” is the line count returned by the required attribute/message inventory pattern; it is evidence of matches, not a linguistic word count.

| File | Surface | CJK lines before | English inventory matches before | Classification | Action |
|---|---:|---:|---:|---|---|
| `frontend/src/main/index.ts` | header-shell | 4 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/index.html` | header-shell | 2 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/api/generation.ts` | messages | 28 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/api/request.ts` | messages | 13 | 5 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/api/streaming.ts` | messages | 1 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/ProjectCreateDialog.vue` | project | 18 | 12 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/Versions.vue` | editor | 24 | 5 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/assistants/AssistantPanel.vue` | assistant | 109 | 25 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/cards/CardExportDialog.vue` | cards | 18 | 15 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/cards/CardFilterBar.vue` | cards | 10 | 6 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/cards/CardMarket.vue` | cards | 20 | 6 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/cards/CardReferenceSelectorDialog.vue` | cards | 68 | 29 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/cards/GenericCardEditor.vue` | editor | 182 | 42 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/cards/ReviewResultCardEditor.vue` | editor | 6 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/common/AIPerCardParams.vue` | cards | 30 | 16 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/common/CardVersionsDialog.vue` | cards | 32 | 13 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/common/ContextDrawer.vue` | other | 7 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/common/EditorHeader.vue` | header-shell | 16 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/common/Header.vue` | header-shell | 7 | 5 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/common/SettingsDialog.vue` | settings | 10 | 6 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/ModelDrivenForm.vue` | forms | 6 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/SectionedForm.vue` | forms | 3 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/ArrayField.vue` | forms | 20 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/BooleanField.vue` | forms | 0 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/EnumField.vue` | forms | 9 | 3 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/FallbackField.vue` | forms | 0 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/NumberField.vue` | forms | 1 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/ObjectField.vue` | forms | 3 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/StringField.vue` | forms | 9 | 3 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/dynamic-form/fields/TupleField.vue` | forms | 6 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue` | editor | 433 | 132 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue` | editor | 5 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/editors/TagsEditor.vue` | editor | 48 | 5 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/editors/dialogs/ContinuationBudgetDialog.vue` | editor | 13 | 7 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/generation/GenerationPanel.vue` | editor | 93 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/generation/InitialPromptDialog.vue` | editor | 36 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/panels/ChapterToolsPanel.vue` | editor | 28 | 11 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/panels/ContextPanel.vue` | editor | 48 | 8 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/panels/OutlinePanel.vue` | editor | 46 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/panels/RelationGraphPanel.vue` | editor | 79 | 61 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/panels/ReviewHistoryPanel.vue` | editor | 23 | 5 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue` | other | 0 | 15 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/setting/AssistantSettings.vue` | settings | 33 | 14 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/setting/CardTypeManager.vue` | settings | 42 | 34 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/setting/KnowledgeManager.vue` | settings | 25 | 20 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/setting/LLMConfigForm.vue` | settings | 83 | 49 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/setting/LLMConfigManager.vue` | settings | 62 | 26 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/setting/OutputModelBuilder.vue` | settings | 22 | 21 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/setting/PromptWorkshop.vue` | settings | 52 | 33 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/shared/AgentComposer.vue` | assistant | 1 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/shared/AgentMessageList.vue` | assistant | 12 | 3 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/shared/SchemaStudio.vue` | forms | 28 | 14 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/Workflow.vue` | workflow | 230 | 59 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/WorkflowAgentDialog.vue` | workflow | 45 | 16 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/WorkflowStatusBar.vue` | workflow | 22 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/dialogs/WorkflowRunsDialog.vue` | workflow | 71 | 36 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/editor/NodeBlockEditor.vue` | workflow | 276 | 56 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/notebook/NotebookCell.vue` | workflow | 17 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/notebook/WorkflowNotebook.vue` | workflow | 5 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/components/workflow/panels/NodeLibrary.vue` | workflow | 20 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/composables/agentChatEvents.ts` | messages | 2 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/composables/useAssistantInjectionSelector.ts` | assistant | 1 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/composables/useAssistantSessionHistory.ts` | assistant | 11 | 6 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/composables/useAssistantStreamMessageOps.ts` | assistant | 6 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/composables/useWorkflowExecution.ts` | workflow | 36 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/services/contextSlots.ts` | messages | 2 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/services/interruptOverlay.ts` | messages | 2 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/services/uiLayoutService.ts` | messages | 5 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/services/updateService.ts` | messages | 30 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/stores/useAIStore.ts` | messages | 4 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/stores/useLLMConfigStore.ts` | messages | 2 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/stores/useProjectListStore.ts` | project | 11 | 9 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/stores/usePromptStore.ts` | messages | 2 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/stores/useUpdateStore.ts` | messages | 19 | 1 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/stores/useWorkflowStore.ts` | workflow | 69 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/utils/outputModelSchemaUtils.ts` | forms | 5 | 2 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/utils/taskDoneNotifier.ts` | messages | 1 | 0 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/views/Dashboard.vue` | dashboard | 39 | 11 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/views/Editor.vue` | editor | 314 | 69 | USER_VISIBLE | migrated/centralized |
| `frontend/src/renderer/src/views/IdeasHome.vue` | other | 17 | 10 | USER_VISIBLE | migrated/centralized |

Other scan classifications:

- INTERNAL_NON_VISIBLE: comments, developer-only logs, generated type descriptions, fixtures, and test names.
- TECHNICAL_DO_NOT_TRANSLATE: API fields, enums, event names, parser aliases, provider/model names, file formats, keyboard shortcuts, and workflow contract identifiers.
- DYNAMIC_EXTERNAL: project/user content and backend/provider/model text; not rewritten by PL-01.

## Exact changed-file allowlist

### i18n

- `frontend/src/renderer/src/i18n/index.ts`
- `frontend/src/renderer/src/i18n/locales/pl.ts`
- `frontend/src/renderer/src/locales/zh-CN.json`

### Components and renderer copy consumers

- `frontend/src/main/index.ts`
- `frontend/src/renderer/index.html`
- `frontend/src/renderer/src/api/generation.ts`
- `frontend/src/renderer/src/api/request.ts`
- `frontend/src/renderer/src/api/schema.ts`
- `frontend/src/renderer/src/api/selectionPipelines.ts`
- `frontend/src/renderer/src/api/streaming.ts`
- `frontend/src/renderer/src/components/ProjectCreateDialog.vue`
- `frontend/src/renderer/src/components/Versions.vue`
- `frontend/src/renderer/src/components/assistants/AssistantPanel.vue`
- `frontend/src/renderer/src/components/cards/CardExportDialog.vue`
- `frontend/src/renderer/src/components/cards/CardFilterBar.vue`
- `frontend/src/renderer/src/components/cards/CardMarket.vue`
- `frontend/src/renderer/src/components/cards/CardReferenceSelectorDialog.vue`
- `frontend/src/renderer/src/components/cards/GenericCardEditor.vue`
- `frontend/src/renderer/src/components/cards/ReviewResultCardEditor.vue`
- `frontend/src/renderer/src/components/common/AIPerCardParams.vue`
- `frontend/src/renderer/src/components/common/CardVersionsDialog.vue`
- `frontend/src/renderer/src/components/common/ContextDrawer.vue`
- `frontend/src/renderer/src/components/common/EditorHeader.vue`
- `frontend/src/renderer/src/components/common/Header.vue`
- `frontend/src/renderer/src/components/common/SettingsDialog.vue`
- `frontend/src/renderer/src/components/common/SimpleMarkdown.vue`
- `frontend/src/renderer/src/components/dynamic-form/fields/ArrayField.vue`
- `frontend/src/renderer/src/components/dynamic-form/fields/EnumField.vue`
- `frontend/src/renderer/src/components/dynamic-form/fields/FallbackField.vue`
- `frontend/src/renderer/src/components/dynamic-form/fields/ObjectField.vue`
- `frontend/src/renderer/src/components/dynamic-form/fields/StringField.vue`
- `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue`
- `frontend/src/renderer/src/components/editors/MarkdownTextEditor.vue`
- `frontend/src/renderer/src/components/editors/TagsEditor.vue`
- `frontend/src/renderer/src/components/editors/dialogs/ContinuationBudgetDialog.vue`
- `frontend/src/renderer/src/components/generation/GenerationPanel.vue`
- `frontend/src/renderer/src/components/generation/InitialPromptDialog.vue`
- `frontend/src/renderer/src/components/panels/ChapterToolsPanel.vue`
- `frontend/src/renderer/src/components/panels/ContextPanel.vue`
- `frontend/src/renderer/src/components/panels/OutlinePanel.vue`
- `frontend/src/renderer/src/components/panels/RelationGraphPanel.vue`
- `frontend/src/renderer/src/components/panels/ReviewHistoryPanel.vue`
- `frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue`
- `frontend/src/renderer/src/components/setting/AssistantSettings.vue`
- `frontend/src/renderer/src/components/setting/CardTypeManager.vue`
- `frontend/src/renderer/src/components/setting/KnowledgeManager.vue`
- `frontend/src/renderer/src/components/setting/LLMConfigForm.vue`
- `frontend/src/renderer/src/components/setting/LLMConfigManager.vue`
- `frontend/src/renderer/src/components/setting/OutputModelBuilder.vue`
- `frontend/src/renderer/src/components/setting/PromptWorkshop.vue`
- `frontend/src/renderer/src/components/shared/AgentComposer.vue`
- `frontend/src/renderer/src/components/shared/AgentMessageList.vue`
- `frontend/src/renderer/src/components/shared/SchemaStudio.vue`
- `frontend/src/renderer/src/components/workflow/Workflow.vue`
- `frontend/src/renderer/src/components/workflow/WorkflowAgentDialog.vue`
- `frontend/src/renderer/src/components/workflow/WorkflowStatusBar.vue`
- `frontend/src/renderer/src/components/workflow/dialogs/WorkflowRunsDialog.vue`
- `frontend/src/renderer/src/components/workflow/editor/NodeBlockEditor.vue`
- `frontend/src/renderer/src/components/workflow/notebook/NotebookCell.vue`
- `frontend/src/renderer/src/components/workflow/notebook/WorkflowNotebook.vue`
- `frontend/src/renderer/src/components/workflow/panels/NodeLibrary.vue`
- `frontend/src/renderer/src/composables/agentChatEvents.ts`
- `frontend/src/renderer/src/composables/useAssistantInjectionSelector.ts`
- `frontend/src/renderer/src/composables/useAssistantSessionHistory.ts`
- `frontend/src/renderer/src/composables/useAssistantStreamMessageOps.ts`
- `frontend/src/renderer/src/main.ts`
- `frontend/src/renderer/src/services/contextSlots.ts`
- `frontend/src/renderer/src/services/interruptOverlay.ts`
- `frontend/src/renderer/src/services/uiLayoutService.ts`
- `frontend/src/renderer/src/services/updateService.ts`
- `frontend/src/renderer/src/stores/useAIStore.ts`
- `frontend/src/renderer/src/stores/useCardStore.ts`
- `frontend/src/renderer/src/stores/useLLMConfigStore.ts`
- `frontend/src/renderer/src/stores/useProjectListStore.ts`
- `frontend/src/renderer/src/stores/usePromptStore.ts`
- `frontend/src/renderer/src/stores/useUpdateStore.ts`
- `frontend/src/renderer/src/stores/useWorkflowStore.ts`
- `frontend/src/renderer/src/utils/taskDoneNotifier.ts`
- `frontend/src/renderer/src/views/Dashboard.vue`
- `frontend/src/renderer/src/views/Editor.vue`
- `frontend/src/renderer/src/views/IdeasHome.vue`

### Tests

- `frontend/src/renderer/src/components/__tests__/localization.test.ts`
- `frontend/src/renderer/src/components/pipelines/__tests__/SelectionPipelineDialog.test.ts`

### Documentation

- `docs/acceptance/pl-01-localization.md`

Total final allowlist: 84 files. There are zero CSS asset, backend, package/lock, GitHub Actions, API schema, persistence schema, or workflow-definition changes.

## CI remediation after PL-01 acceptance

The original PL-01 allowlist remains exactly 84 files and records the completed localization change. After draft PR #6 was opened, GitHub Actions run `30363698782` for `Task 8 Selected Text UI` failed only in `Verify product command and dialog survived build inputs`: its first guard required two hardcoded `Thinking p*rn` occurrences in `CodeMirrorEditor.vue`. PL-01 intentionally replaced that visible UI copy with `t('selectionPipeline.title')`; the workflow's focused tests, full frontend typecheck, and production web build had already passed.

The compatibility correction adds one necessary CI-only file, `.github/workflows/task-8-selection-ui.yml`, and changes no product source. Its guard now uses fixed-string checks for the localized UI key, `SelectionPipelineDialog`, the canonical `Thinking p*rn` catalog value in `frontend/src/renderer/src/i18n/locales/pl.ts`, `applySelectionPipelineReplacement`, `validateSnapshot`, and the built `frontend/dist-web/index.html` artifact.

- Original PL-01 localization allowlist: 84 files.
- Additional CI compatibility exception: 1 workflow file.
- Total changed-file set after remediation: 85 files.
- Backend, API, persistence, product workflow definitions, layout, tokens, theme, responsive behavior, and product UI behavior: unchanged.

## Glossary

| Concept | Canonical Polish |
|---|---|
| Product | NovelForge |
| project | projekt |
| library / bookshelf | biblioteka |
| chapter | rozdział |
| scene | scena |
| editor | edytor |
| settings | ustawienia |
| workflow | workflow |
| workflow node | węzeł workflowu |
| prompt | prompt |
| retry | ponów |
| cancel | anuluj |
| save | zapisz |
| delete | usuń |
| create | utwórz |
| words | słowa |
| story characters | postacie |
| text characters | znaki |

Preserved technical names include Thinking p*rn, provider/model names, JSON, Markdown, API, SSE, filenames, keyboard shortcuts, code, payload fields, enum values, and workflow identifiers required by contracts.

## Primary surfaces

| Surface | Translated | Visible CJK remaining | Visible English remaining | Behavior changed | Layout changed |
|---|---|---:|---:|---:|---:|
| Header / navigation | YES | 0 | 0 | NO | NO |
| Dashboard / library | YES | 0 | 0 | NO | NO |
| Project creation | YES | 0 | 0 | NO | NO |
| Search, filters, project actions | YES | 0 | 0 | NO | NO |
| Settings and tabs | YES | 0 | 0 | NO | NO |
| Editor shell and core panels | YES | 0 | 0 | NO | NO |
| Workflow shell, node library, and node picker | YES | 0 | 0 | NO | NO |
| Dialogs, forms, placeholders, empty states | YES | 0 | 0 | NO | NO |
| Accessibility labels, titles, alt text | YES | 0 | 0 | NO | NO |
| Electron shell | YES | 0 | 0 | NO | NO |
| Element Plus built-in copy | YES | 0 | 0 | NO | NO |

Technical labels such as AI and Schema JSON are intentionally preserved. User project names, scene text, model output, provider text, and backend-supplied workflow names remain external data. The 26 currently registered workflow node types receive Polish display labels and descriptions keyed by their stable technical `type`; the technical identifiers themselves remain unchanged.

## Remaining CJK

Required full scan:

```sh
rg -nP '[\x{3400}-\x{4DBF}\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}]' frontend/src
```

Final result: 2,437 matching lines; USER_VISIBLE matches: **ZERO**. The table below preserves the path/line classification checkpoint used during review; subsequent display-only edits shifted some line numbers. The final delta scan found CJK only in comments, legacy sentinels, raw enum/comparison values, and source-to-display mapping keys. No remaining match is rendered as interface copy.

| Path | Lines | Classification | Why not user-visible | Future action |
|---|---|---|---|---|
| `frontend/src/renderer/src/components/workflow/notebook/WorkflowNotebook.vue` | 65 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useLLMConfigStore.ts` | 19 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/setting/CardTypeManager.vue` | 3, 9, 38, 103, 128, 139, 193 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/services/updateService.ts` | 2, 3, 25, 28, 31, 32, 37, 38, 39, 40, 41, 58, 67, 72, 86, 93, 116, 125, 126, 152, 153, 180, 182, 189, 194, 201 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/services/contextHelpers.ts` | 3, 7, 13, 17, 20, 22, 42 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/services/uiLayoutService.ts` | 15 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/services/instructionExecutor.ts` | 2, 4, 5, 12, 18, 19, 26, 27, 38, 44, 45, 46, 54, 55, 56, 63, 72, 73, 74, 77, 82, 87, 88, 95, 96, 103 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/common/Header.vue` | 39, 44 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useAIStore.ts` | 27, 74 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/index.ts` | 1 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/workflows.ts` | 5, 7, 8, 83, 86, 91, 96, 102, 147, 149, 150, 151, 152, 153, 161, 163, 169, 171, 173, 177, 183, 185, 188, 190, 191, 212, 223, 226, 231, 233, 235, 236, 240, 255, 256, 257, 268, 269, 270, 271, 278, 279, 280, 286 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useUpdateStore.ts` | 2, 11, 14, 18, 23, 28, 31, 38, 45, 74, 81, 88, 91, 92, 93, 97, 104, 114 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/setting/AssistantSettings.vue` | 13, 115, 209 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/dynamic-form/fields/NumberField.vue` | 40 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/schema.ts` | 5, 6, 22, 24, 26, 28, 29, 33, 38, 41, 42, 43, 44, 47, 48, 51, 56, 63, 64, 65, 66, 67, 80, 86, 127, 128, 137, 142, 145, 150, 168, 180, 181, 182, 188, 189 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/workflow/notebook/NotebookCell.vue` | 27, 38, 49, 74, 79, 90, 101, 108 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useCardStore.ts` | 21, 25, 40, 79, 85, 87, 119, 125, 139, 142, 146, 159, 166, 179, 196, 207, 212, 216, 226, 231, 244 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/panels/ContextPanel.vue` | 121, 130, 146, 154, 156, 157, 158, 159, 160, 162, 230 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/workflow/editor/CodeEditor.vue` | 26, 34, 133, 136, 151 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/panels/OutlinePanel.vue` | 5, 17, 30, 93, 97, 107, 110, 129, 134, 155, 160, 167, 172, 174, 175, 176, 178, 191, 196, 202, 208, 214, 248 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/dynamic-form/fields/TupleField.vue` | 22, 37, 42, 45, 46, 79 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/ai.ts` | 10, 73, 138, 144, 150, 178 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/views/IdeasHome.vue` | 20, 30, 52, 75, 102 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/composables/useAgentPreferences.ts` | 31 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/editors/TagsEditor.vue` | 98, 115, 116, 117, 124, 125, 132, 133, 134, 141, 142, 143, 144, 153, 156, 157, 161, 171, 179, 184, 191, 197, 208, 238, 255, 278, 280, 285, 309, 311, 312, 313, 314, 315, 348, 362, 363, 369, 373, 383 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/config/index.ts` | 2, 3, 4, 5, 7, 22 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/main/index.ts` | 18, 19, 42 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/utils/parameterFormatter.ts` | 2, 4, 8, 9, 23, 24, 33, 34, 45, 50, 55, 60, 69, 74, 79, 81, 85, 94, 99, 103, 109, 111, 119, 124, 142, 164, 169, 172, 179, 190 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/composables/useWorkflowExecution.ts` | 2, 4, 10, 11, 12, 13, 14, 25, 28, 36, 41, 42, 45, 60, 61, 62, 70, 71, 75, 80, 81, 82, 85, 87, 97, 98, 101, 106, 113, 120, 127, 128, 136, 146, 149, 159 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/setting/LLMConfigForm.vue` | 505, 506 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/dynamic-form/fields/ArrayField.vue` | 15, 25, 34, 82, 89, 91, 110, 116, 123, 157, 158, 168, 170, 173, 196 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/composables/useAssistantStreamMessageOps.ts` | 109, 279 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/views/Editor.vue` | 3, 10, 22, 25, 58, 69, 139, 151, 154, 172, 175, 182, 231, 236, 266, 301, 403, 408, 486, 487, 488, 489, 496, 504, 516, 522, 526, 530, 543, 559, 563, 603, 610, 613, 631, 639, 646, 654, 658, 664, 668, 682, 686, 688, 690, 697, 698, 700, 705, 709, 720, 722, 733, 739, 742, 747, 749, 760, 766, 769, 774, 777, 782, 785, 788, 791, 795, 800, 807, 808, 812, 817, 826, 827, 829, 831, 833, 837, 840, 841, 852, 856, 858, 860, 865, 866, 877, 880, 884, 899, 909, 915, 919, 923, 934, 947, 949, 957, 961, 964, 972, 974, 988, 996, 1004, 1008, 1013, 1027, 1037, 1042, 1043, 1047, 1055, 1064, 1071, 1078, 1083, 1095, 1101, 1105, 1120, 1123, 1126, 1130, 1134, 1139, 1142, 1145, 1148, 1152, 1153, 1158, 1162, 1181, 1182, 1210, 1226, 1228, 1230, 1232, 1234, 1236, 1238, 1240, 1242, 1244, 1246, 1248, 1250, 1252, 1254, 1256, 1259, 1263, 1268, 1329, 1334, 1352, 1361, 1366, 1370, 1379, 1389, 1393, 1404, 1415, 1423, 1427, 1439, 1443, 1445, 1453, 1457, 1461, 1463, 1465, 1475, 1488, 1511, 1524, 1549, 1555, 1561, 1576, 1578, 1586, 1589, 1595, 1601, 1605, 1672, 1676, 1678, 1700, 1705, 1713, 1735, 1738, 1788, 1809, 1818, 1824, 1828, 1835, 1881, 1884, 1891, 1892, 1893, 1894, 1895, 1937, 2015, 2080 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useAppStore.ts` | 5, 8, 11, 15, 18 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/cards/CardExportDialog.vue` | 188 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/cards/CardMarket.vue` | 5, 6, 82, 83, 109 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/workflow/panels/NodeLibrary.vue` | 78, 90, 111, 127, 143, 155, 160, 167 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/index.html` | 8, 9 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/common/ContextDrawer.vue` | 98 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/setting/PromptWorkshop.vue` | 23, 37, 70, 103, 117, 121, 126, 135, 139, 189, 225, 235, 245, 258 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/workflow/editor/NodeBlockEditor.vue` | 3, 17, 23, 27, 90, 104, 314, 332, 347, 363, 375, 382, 465, 471, 477, 484, 487, 490, 491, 494, 503, 515, 520, 525, 529, 533, 537, 539, 555, 556, 562, 580, 581, 586, 594, 598, 602, 605, 611, 619, 626, 631, 633, 637, 638, 644, 654, 655, 659, 664, 676, 682, 690, 695, 697, 701, 702, 708, 717, 718, 722, 725, 727, 733, 738, 750, 753, 868, 895, 924, 925, 969, 970, 971, 999, 1007, 1013, 1024, 1028, 1033, 1035, 1047, 1052, 1057, 1071, 1078, 1086, 1091, 1096, 1101, 1111, 1118, 1123, 1125, 1131, 1139, 1141, 1146, 1148, 1153, 1157, 1161, 1169, 1172, 1176, 1183, 1184, 1187, 1195, 1199, 1204, 1206, 1209, 1222, 1223, 1226, 1229, 1235, 1241, 1249, 1259, 1273, 1276, 1279, 1282, 1284, 1287, 1289, 1303, 1309, 1316, 1319, 1324, 1326, 1328, 1330, 1344, 1351, 1358, 1360, 1369, 1377, 1384, 1388, 1390, 1395, 1398, 1406, 1418, 1428, 1434, 1438, 1444, 1446, 1451, 1452, 1453, 1462, 1468, 1469, 1470, 1471, 1478, 1488, 1489, 1495, 1516, 1522, 1524, 1540, 1542, 1546, 1553, 1555, 1562, 1569, 1577, 1583, 1586, 1589, 1590, 1591, 1603, 1606, 1608, 1611, 1614, 1616, 1621, 1625, 1632, 1637, 1643, 1646, 1650, 1657, 1664, 1672, 1677, 1712, 1716, 1722, 1728, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1749 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/workflow/Workflow.vue` | 3, 109, 111, 116, 119, 153, 156, 167, 180, 201, 223, 279, 297, 307, 308, 310, 311, 313, 356, 360, 365, 370, 376, 379, 382, 383, 387, 391, 408, 409, 411, 416, 429, 438, 439, 440, 446, 449, 455, 461, 479, 482, 486, 487, 491, 495, 504, 510, 516, 523, 525, 527, 529, 532, 536, 546, 548, 553, 557, 560, 562, 568, 573, 574, 580, 596, 613, 616, 623, 633, 643, 648, 654, 657, 658, 661, 667, 670, 676, 681, 686, 688, 691, 694, 697, 700, 705, 710, 715, 718, 754, 782, 787, 794, 797, 802, 808, 830, 834, 846, 855, 864, 870, 896, 929, 934, 939, 944, 946, 947, 950, 951, 969, 971, 975, 980, 983, 991, 993, 997, 1004, 1009, 1014, 1021, 1029, 1031, 1034, 1036, 1039, 1048, 1056, 1090, 1118, 1123, 1130, 1133, 1136, 1142, 1144, 1147, 1302 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/setting/LLMConfigManager.vue` | 81, 111, 112, 113, 117, 120, 124, 127, 131, 146, 147, 162, 165, 181, 196, 227, 232 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/App.vue` | 66, 73, 76, 81, 86, 87 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/services/contextResolver.ts` | 4, 7, 9, 20, 46, 67, 75, 107, 132, 134, 152, 164, 166, 168, 173, 174, 217, 242, 264, 271, 273, 282, 283, 284, 285, 291, 295, 307, 320, 341, 346, 352, 373, 376, 386, 404, 409, 410, 411, 418, 438, 439, 440, 441, 443, 457, 469, 477, 480, 483, 499, 507, 512, 515, 520, 523, 542, 552, 561, 576, 581, 595, 612, 622, 635, 639, 663, 692, 726, 748, 757 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/generation/InitialPromptDialog.vue` | 83, 89, 96, 99, 109, 119, 127, 137, 141, 142, 148, 154 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/workflow/WorkflowStatusBar.vue` | 14, 19, 103, 105, 107, 117, 124, 126, 132, 137, 139, 143, 195, 201 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/editors/CodeMirrorEditor.vue` | 5, 44, 150, 167, 191, 1248, 1336, 1361, 1371, 1382, 1401, 1402, 1404, 1406, 1409, 1416, 1421, 1424, 1428, 1431, 1445, 1446, 1478, 1561, 1564, 1567, 1569, 1576, 1579, 1586, 1589, 1592, 1617, 1635, 1650, 1651, 1652, 1653, 1654, 1657, 1658, 1659, 1924, 1928, 1931, 1932, 1937, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2085, 2125, 2128, 2140, 2149, 2174, 2189, 2218, 2246, 2250, 2255, 2257, 2263, 2269, 2271, 2273, 2274, 2275, 2277, 2278, 2279, 2284, 2285, 2290, 2291, 2297, 2298, 2299, 2304, 2311, 2318, 2321, 2329, 2341, 2346, 2359, 2365, 2370, 2375, 2414, 2418, 2422, 2423, 2427, 2431, 2433, 2440, 2443, 2444, 2445, 2446, 2447, 2451, 2454, 2455, 2456, 2457, 2458, 2459, 2533, 2561, 2640, 2648, 2649, 2652, 2656, 2734, 2736, 2738, 2741, 2742, 2749, 2755, 2758, 2775, 2788, 2794, 2805, 2934, 2970, 2973, 2981, 2983, 2986, 2989, 2992, 2995, 2997, 3000, 3001, 3003, 3006, 3008, 3013, 3018, 3092, 3124, 3148, 3151, 3168, 3173, 3201, 3263, 3265, 3266, 3267, 3268, 3269, 3276, 3368, 3386, 3395, 3404, 3413, 3457, 3478, 3487, 3520, 3552, 3553, 3724, 3760, 4022, 4029, 4035, 4043, 4063, 4066, 4073, 4076, 4081, 4084, 4088, 4091, 4096, 4105, 4404, 4418, 4425, 4431, 4435, 4581, 4582, 4643, 4644, 4676, 4678, 4685, 4687, 4689, 4728, 4961, 5070, 5108 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/views/Dashboard.vue` | 3, 14, 32, 39, 65, 75, 77, 84, 104, 117, 136, 149, 156, 168, 174, 180, 190, 195, 198, 201, 208, 221 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/dynamic-form/SectionedForm.vue` | 35, 40, 45 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/main.ts` | 26 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/common/SettingsDialog.vue` | 17, 28, 38 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/setting.ts` | 8, 29, 123, 130, 139, 146 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useEditorStore.ts` | 14, 41, 44, 48, 54, 57, 66, 73, 78, 82, 84, 86, 88, 93 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/memory.ts` | 4, 118, 125 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/composables/useWorkflowProgress.ts` | 2, 4, 5, 15, 34, 41 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/ProjectCreateDialog.vue` | 17, 57, 77, 82, 102, 115, 126 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/Versions.vue` | 12, 14, 28, 34, 41, 56, 73, 102, 225 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/composables/useAssistantRequestBuilder.ts` | 66, 73, 74, 75, 79, 80, 81, 82, 85, 97, 99, 101, 115, 116, 120, 122, 125, 128, 135, 141, 142, 147, 165, 170, 174 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/assistants/AssistantPanel.vue` | 52, 54, 70, 89, 159, 175, 259, 264, 265, 272, 306, 334, 339, 340, 464, 529, 541, 650, 691, 814, 848, 849, 850, 857, 862, 867, 900, 901, 928, 940, 945, 949, 953, 955, 964, 965, 967, 969, 973, 987, 988, 995, 997, 1064, 1072, 1077, 1081, 1084, 1087, 1088, 1089, 1094, 1095, 1098, 1100, 1102, 1103, 1112, 1113, 1114, 1117, 1143, 1165, 1168, 1169, 1172, 1274 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/common/CardVersionsDialog.vue` | 49, 155, 156, 164, 171, 192, 210 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/cards/CardFilterBar.vue` | 35, 41, 42, 45, 46, 49, 50 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/types/generated.d.ts` | 106, 124, 125, 143, 160, 176, 177, 195, 213, 214, 232, 252, 253, 271, 286, 306, 307, 309, 310, 330, 332, 333, 334, 335, 336, 370, 371, 376, 377, 394, 395, 399, 400, 405, 406, 569, 572, 575, 697, 714, 729, 749, 765, 780, 799, 816, 833, 850, 867, 884, 901, 918, 933, 952, 969, 986, 1003, 1020, 1037, 1054, 1071, 1088, 1105, 1122, 1137, 1156, 1173, 1190, 1205, 1208, 1223, 1225, 1228, 1244, 1246, 1247, 1267, 1287, 1290, 1293, 1294, 1295, 1296, 1297, 1298, 1299, 1300, 1338, 1340, 1341, 1343, 1365, 1389, 1391, 1408, 1411, 1412, 1413, 1414, 1417, 1437, 1440, 1441, 1442, 1445, 1467, 1469, 1470, 1471, 1472, 1473, 1474, 1475, 1495, 1515, 1517, 1537, 1539, 1557, 1559, 1562, 1563, 1564, 1584, 1604, 1626, 1646, 1649, 1652, 1672, 1675, 1678, 1698, 1716, 1991, 1996, 2001, 2006, 2011, 2016, 2021, 2029, 2035, 2040, 2045, 2050, 2055, 2061, 2066, 2071, 2072, 2077, 2082, 2087, 2092, 2098, 2103, 2108, 2113, 2126, 2131, 2171, 2176, 2183, 2188, 2193, 2201, 2407, 2412, 2418, 2424, 2430, 2435, 2440, 2445, 2453, 2474, 2479, 2484, 2489, 2494, 2499, 2504, 2509, 2514, 2519, 2524, 2529, 2534, 2546, 2551, 2557, 2565, 2570, 2573, 2576, 2584, 2589, 2599, 2605, 2698, 2703, 2708, 2713, 2804, 2809, 2814, 2819, 2824, 2831, 2833, 2838, 2845, 2850, 2857, 2862, 2919, 2924, 2929, 2935, 2942, 2949, 2952, 2956, 2961, 2966, 2972, 2977, 2983, 2991, 2996, 3002, 3008, 3013, 3018, 3023, 3028, 3284, 3300, 3328, 3433, 3438, 3443, 3493, 3498, 3500, 3510, 3512, 3524, 3529, 3534, 3597, 3602, 3607, 3612, 3614, 3617, 3619, 3622, 3627, 3632, 3637, 3642, 3647, 3652, 3654, 3660, 3665, 3670, 3680, 3691, 3693, 3720, 3734, 3739, 3751, 3773, 3778, 3783, 3786, 3789, 3794, 3799, 3804, 3809, 3814, 3816, 3976, 3983, 4005, 4031, 4046, 4051, 4057, 4058, 4061, 4064, 4065, 4068, 4071, 4076, 4080, 4089, 4094, 4102, 4107, 4142, 4147, 4152, 4157, 4163, 4168, 4173, 4178, 4183, 4188, 4193, 4200, 4254, 4259, 4264, 4269, 4274, 4281, 4286, 4291, 4296, 4304, 4309, 4314, 5018 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/cards/CardEditorHost.vue` | 18, 19, 20 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/cards/CardReferenceSelectorDialog.vue` | 10, 19, 36, 90, 105, 167, 170, 175, 179, 199, 203, 209, 226, 229, 240, 245, 257, 264, 276, 308, 325, 328, 336, 339, 346, 362, 379, 398, 404, 424, 479, 480 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useWorkflowStore.ts` | 12, 19, 20, 21, 24, 34, 35, 36, 37, 40, 84, 87, 109, 118, 121, 153, 168, 169, 180, 185, 196, 202, 212, 224, 230, 235, 245, 246, 247, 248, 249, 250, 263, 267, 269, 271, 273, 277, 281, 285, 293, 298, 305, 313, 321, 326, 333, 337, 344, 347, 352, 359, 367, 371, 377, 385, 387, 399, 405, 408, 411, 416, 421, 428, 438, 452 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/request.ts` | 24, 69, 78, 83, 84, 92, 122 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/dynamic-form/fields/ObjectField.vue` | 23, 24, 35 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/generation/GenerationPanel.vue` | 9, 33, 40, 46, 52, 58, 64, 70, 77, 84, 86, 92, 114, 116, 149, 212, 215, 219, 226, 232, 235, 247, 251, 254, 257, 258, 272, 287, 292, 296, 309, 317, 320, 332, 338, 341, 374, 396, 410, 413, 429, 461, 470, 472, 474, 478, 479, 491, 495, 497, 499, 512, 519, 534, 535, 536, 541, 549, 554, 562, 574, 602, 611, 618, 629, 640, 642, 645, 648, 663, 672, 683, 685, 710, 723, 726, 728, 761 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/projects.ts` | 12 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/generation.ts` | 10, 13, 17, 28, 30, 31, 32, 42, 61, 73, 76, 78, 85, 93, 102, 106, 112, 113, 114, 117, 118, 140, 146, 147, 148, 176 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/cards/GenericCardEditor.vue` | 22, 39, 41, 124, 132, 214, 232, 271, 279, 280, 284, 289, 295, 298, 300, 334, 369, 376, 377, 386, 399, 413, 414, 419, 436, 438, 453, 483, 489, 490, 598, 602, 608, 609, 613, 617, 620, 621, 653, 655, 657, 659, 682, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 701, 711, 756, 790, 808, 825, 846, 857, 861, 872, 899, 906, 982, 1034, 1037, 1040, 1045, 1055, 1064, 1068, 1072, 1075, 1079, 1084, 1085, 1088, 1094, 1099, 1102, 1108, 1117, 1126, 1140, 1143, 1156, 1170, 1199, 1207, 1223, 1226, 1238, 1248, 1251, 1257, 1265, 1276, 1279, 1285, 1292, 1295, 1299, 1302, 1307, 1314, 1344, 1349, 1354, 1360, 1363, 1374, 1386, 1394, 1396, 1397, 1431, 1434, 1449 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/dynamic-form/fields/StringField.vue` | 38, 39, 41, 47, 50, 51, 52, 53 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/api/cards.ts` | 24, 27 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/workflow/dialogs/WorkflowRunsDialog.vue` | 9, 21, 113, 244, 252, 285, 286, 316, 319, 410, 411, 413, 415, 418, 423, 425, 429, 432 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/services/schemaFieldParser.ts` | 2, 3, 4, 6, 7, 8, 9, 10, 31, 32, 33, 34, 35, 49, 67, 77, 96, 103, 104, 105, 106, 111, 116, 128, 134, 137, 143, 158, 159, 160, 175, 176, 177, 192, 193, 194, 195, 199, 201, 209, 219, 220, 221, 222, 223, 227, 230, 233, 236, 245, 250, 255 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useProjectStore.ts` | 9, 12 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/services/versionService.ts` | 36 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useProjectListStore.ts` | 14, 25, 58 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/utils/outputModelSchemaUtils.ts` | 11, 13, 66, 90, 148 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/types/instruction.ts` | 2, 4, 7, 10, 15, 22, 26, 27, 31, 35, 36, 40, 47, 51, 54, 64, 67, 75, 92, 95, 103, 111, 119, 127, 136, 140, 143, 148 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/common/AIPerCardParams.vue` | 112, 113, 114, 115, 116, 117, 118, 119, 120, 128, 173 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/common/EditorHeader.vue` | 85, 90, 132 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/setting/KnowledgeManager.vue` | 28, 81 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/useAssistantStore.ts` | 75, 87, 90, 94, 97, 102, 103, 104, 105, 106, 109, 110, 122, 130, 133, 142, 152, 170, 185, 191, 194, 211, 225, 230, 257, 261, 269, 277, 279, 282, 289, 292, 298, 312, 330, 333, 347, 353, 358, 373, 375, 377, 388, 389, 390, 391, 392, 393, 402, 405, 409, 412, 420, 423, 428, 429, 430, 431, 432, 433, 434, 444, 448, 452, 457, 461, 465, 471, 474, 489, 495, 500, 508, 511, 516, 519, 523, 530, 546, 547, 548, 549, 553, 555, 565, 579, 582, 586 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/stores/usePromptStore.ts` | 19 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/dynamic-form/ModelDrivenForm.vue` | 30, 38, 55, 70, 72, 105 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/shared/SchemaStudio.vue` | 73, 80, 81, 93, 101, 126, 143, 204 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |
| `frontend/src/renderer/src/components/common/SimpleMarkdown.vue` | 47 | INTERNAL_NON_VISIBLE / TECHNICAL_DO_NOT_TRANSLATE | Comments, developer diagnostics, generated metadata, parser aliases, or contract values; audited template text has no visible CJK. | No PL-01 action; revisit only with the owning technical contract. |

Specific audited contract literals are `灵感对话` in `Editor.vue` (backend prompt-name lookup), `卡片` / `紧凑` in `CardMarket.vue` (raw enum comparisons), and the legacy card/card-type values used by existing persistence and assistant-operation contracts. They remain technically unchanged because changing them would change behavior; exact-match presentation helpers prevent those legacy values from reaching visible copy. CJK in `generated.d.ts` is generated metadata. All other renderer-template matches were comment or technical-context matches; a comment-stripped template scan found no user-visible CJK.

## Dynamic external text

| Source | Current handling | May remain non-Polish | Recommended future wave |
|---|---|---:|---|
| Backend workflow names/descriptions | Rendered as returned | YES | Dedicated backend-owned localization contract |
| Registered node labels/descriptions | Polish display mapping for all 26 current stable node types; unknown types fall back unchanged | Only unknown future types | Extend the display map when the registry adds a type |
| Provider/model errors and streamed output | Raw external text remains available where no safe mapping exists | YES | Error-code localization contract |
| User project names, scene/card content | Preserved byte-for-byte | YES | None; user content must not be translated |
| Provider and model names | Preserved as technical names | YES | None |
| Seed prompt/workflow contract identifiers | Preserved where used for lookup/comparison | YES | Schema/API migration only if separately authorized |

## Static gates

- User-visible CJK: ZERO.
- Defined Polish leaf keys: 1,328.
- Statically used literal keys: 1,265.
- Dynamically addressed node-metadata keys: 52, resolved from 26 stable node types and covered by the focused test plus browser QA.
- Missing keys: ZERO.
- Duplicate keys: ZERO.
- Empty translations: ZERO.
- Rendered keys on primary surfaces: ZERO.
- Suspicious hardcoded visible copy in changed templates: ZERO; remaining AI, Schema JSON, units, and syntax are TECHNICAL_DO_NOT_TRANSLATE.
- `git diff --check`: PASS before the mandatory shared verification contract.

## Tests

- Focused localization test: PASS — 3/3; verifies Polish default/fallback locale, representative keys, Polish dashboard title/action, no rendered keys, Element Plus Polish copy, workflow-node display mapping, Vue I18n special-character literals, display-only mappings that preserve legacy assistant-session/card/card-type persistence sentinels, and no localized title emission when an editable header receives a raw legacy prop.
- Existing copy assertions: only localization-dependent literals updated; `SelectionPipelineDialog.test.ts` installs the existing i18n plugin.
- Frontend suite: PASS — 6/6 test files, 27/27 tests.
- Typecheck (node and web): PASS.
- Production web bundle: PASS.
- Backend tests: PASS — 35/35 tests against a fresh SQLite database.
- Pydantic warnings as errors: PASS; no `PydanticDeprecatedSince20` warning was emitted.
- Non-blocking dependency warning: one `StarletteDeprecationWarning` from the ephemeral test environment.
- Upstream verification: PASS — frozen baseline `ca7ca584580df0220a6a0d008309e5575b3dc449` recorded and AGPL notice present.
- Final `git diff --check`: PASS.

## Visual evidence

All fixtures are synthetic and use a fresh SQLite database under `/tmp`. Backend-seeded workflow and card-type display records were relabeled only inside that disposable QA database so external bootstrap CJK would not appear in screenshots; source code, backend behavior, and technical contracts were not changed. Source state is the uncommitted PL-01 working tree based on `b240d8f0823fb6ae97c7f5688918c43646d62ca7`, which becomes the single PL-01 commit after all gates pass.

| Screenshot | Surface | Theme | Viewport | Fixture | CJK visible | Private data | Layout finding |
|---|---|---|---|---|---:|---:|---|
| `/tmp/writers-room-pl01-dashboard-light.png` | dashboard | light | 1440 × 900 | synthetic projects | NO | NO | NONE |
| `/tmp/writers-room-pl01-dashboard-dark.png` | dashboard | dark | 1440 × 900 | synthetic projects | NO | NO | NONE |
| `/tmp/writers-room-pl01-new-project.png` | new project | dark | 1440 × 900 | synthetic input | NO | NO | Labels wrap; VL-03 finding |
| `/tmp/writers-room-pl01-settings.png` | settings | dark | 1440 × 900 | synthetic provider configuration | NO | NO | Rightmost table columns need internal horizontal reach; VL-03 finding |
| `/tmp/writers-room-pl01-editor.png` | editor | dark | 1440 × 900 | synthetic project | NO | NO | NONE |

Browser QA confirmed NovelForge product naming, Polish primary UI, no visible CJK, no rendered i18n keys, no `undefined`, no page-level horizontal overflow, reachable primary actions, light/dark operation, theme persistence across reload, and Polish node-library metadata. The fresh post-fix log window contained only the existing Element Plus radio deprecation warning; no i18n warning or error was logged.

A final targeted browser pass used an additional fresh `/tmp` SQLite fixture containing the exact legacy values `新建卡片`, `新类型`, and `新类型的默认卡片类型`. The tree, card library, editor breadcrumb/input, assistant header, assistant reference chip, filters, and settings card-type surfaces rendered only “Nowa karta”, “Nowy typ”, and the Polish generated description. A direct database check after opening and switching these views confirmed that the three raw values were unchanged, proving the mapping stayed presentation-only. The Vue I18n template-syntax example rendered exactly as `Definiuj zmienne jako ${variable}, na przykład ${text_content}.`; the focused runtime test covers the remaining `@KB{...}`, `<Action>{...}</Action>`, `@`, and literal-pipe cases. The disposable fixture and environment were removed after QA.

## VL boundary

- `tokens.css` unchanged: YES.
- `themes.css` unchanged: YES.
- `base.css` unchanged: YES.
- `main.css` unchanged: YES.
- CSS import order in `main.ts` unchanged: YES.
- Vue style blocks byte-equivalent to base: YES for every changed Vue file except the explicitly authorized copy-only exception below.
- Spacing/layout/responsive work: NO.
- VL-02 started: NO.
- VL-03 started: NO.
- Premium Polish started: NO.

### AUTHORIZED_COPY_ONLY_STYLE_EXCEPTION

- Changed style exception file: only `frontend/src/renderer/src/components/workflow/editor/NodeBlockEditor.vue`.
- Changed CSS property: only `content`.
- Change: hardcoded `content: '已禁用'` replaced by `content: attr(data-disabled-label)`; the existing element receives `:data-disabled-label="t('workflow.disabledLabel')"`.
- New DOM element: NO.
- Selector changed: NO.
- Position, dimensions, spacing, colors, or font changed: NO.
- Layout changed: NO.
- Visual styling changed: NO.
- Behavior changed: NO.

## Behavior boundary

- Stores changed only for copy-only message mappings: YES.
- API calls/contracts changed: NO.
- Persistence changed: NO.
- Workflow semantics changed: NO.
- Autosave changed: NO.
- Routing changed: NO.
- Event handlers/data flow changed: NO.
- Legacy card/card-type persistence and assistant-operation values changed: NO; exact-match Polish mappings are display-only.
- WRITER-READY-01 started: NO.

## Findings for later waves

### VL-03 layout findings

1. Polish labels in the new-project form wrap to two lines at 1440 × 900.
2. The editor sort label is truncated as “Ostatnio utw...”.
3. The settings LLM table’s rightmost columns require internal horizontal reach at 1440 × 900.

No CSS/layout fix was made. Primary actions remain reachable and there is no page-level horizontal overflow.

### WRITER-READY-01 functional findings

1. Element Plus reports an existing `ElOption value null` warning in the project-create dialog.
2. Editor reports an existing extraneous `backToDashboard` event-listener warning.
3. Selecting “Pomysły” from the workflow surface updates the active header state but does not replace the workflow content.

No functional fix was made.

### Dynamic external localization findings

Backend workflow names and raw provider/model messages can remain non-Polish. All 26 node types present in the current registry are localized display-only by stable type; an unknown future node type deliberately falls back to backend text until its Polish mapping is added. A future contract-based localization wave remains appropriate for other dynamic external text.

## Acceptance criteria

- Polish default locale: PASS.
- Primary surfaces localized: PASS.
- User-visible CJK: ZERO.
- User-visible copy centralized: PASS.
- Element Plus Polish locale: PASS.
- No dependency or package-lock change: PASS.
- No CSS asset or layout change: PASS.
- No behavior/API/persistence/workflow change: PASS.
- Mandatory shared verification contract: PASS.
