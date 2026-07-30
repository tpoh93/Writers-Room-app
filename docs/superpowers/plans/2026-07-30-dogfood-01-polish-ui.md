# DOGFOOD-01 Polish UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove user-visible built-in CJK from the normal Polish UI, make context preview author-safe, and repair the identified navigation and responsive UI defects.

**Architecture:** Keep upstream canonical values untouched and localize strictly at renderer display boundaries. A small set of explicit helper functions will map built-in card metadata and prompt names; a context-preview presentation helper will derive author-facing sections without modifying the raw assembled payload used by generation.

**Tech Stack:** Vue 3, TypeScript, Vue I18n, Element Plus, Vitest, synthetic fixture runtime.

## Global Constraints

- Do not change canonical IDs, API contract values, schema keys, or user-authored content.
- New defaults may use Polish display titles; never overwrite an existing user title.
- Technical context is opt-in, collapsed by default, and must not log content or affect execution.
- Verify every behavior with a RED-to-GREEN regression before changing production code.

---

### Task 1: Central display adapters

**Files:**
- Modify: `frontend/src/renderer/src/i18n/index.ts`
- Modify: `frontend/src/renderer/src/components/__tests__/localization.test.ts`

- [ ] Write failing tests for built-in prompt labels and known default card titles.
- [ ] Run `npm --prefix frontend exec vitest run src/renderer/src/components/__tests__/localization.test.ts` and confirm the missing mappings fail.
- [ ] Add explicit display-only mappings and a default-title helper; retain all unknown values unchanged.
- [ ] Re-run the focused test and commit the task.

### Task 2: Display-boundary adoption and responsive fixes

**Files:**
- Modify: renderer card, project, relation, schema, prompt, workflow, and table components found by the CJK inventory
- Test: focused Vue tests for each adopted helper

- [ ] Write failing component tests that render canonical built-ins in their user-facing controls.
- [ ] Confirm the focused tests fail with canonical CJK text visible.
- [ ] Apply the adapter at each rendering boundary and add targeted wrapping, ellipsis, min-width, and table label fixes.
- [ ] Re-run focused tests and commit the task.

### Task 3: Author-facing context preview

**Files:**
- Create: `frontend/src/renderer/src/services/contextPreview.ts`
- Create: `frontend/src/renderer/src/services/__tests__/contextPreview.test.ts`
- Modify: `frontend/src/renderer/src/components/panels/ContextPanel.vue`
- Modify: `frontend/src/renderer/src/i18n/locales/pl.ts`

- [ ] Write failing unit tests for Polish author sections, unchanged author excerpts, and isolated technical output.
- [ ] Confirm the helper test fails before the helper exists.
- [ ] Implement a pure presentation helper and render its default author view plus collapsed diagnostic disclosure; do not mutate the assembled object.
- [ ] Run the focused test and component typecheck, then commit the task.

### Task 4: Ideas return navigation

**Files:**
- Modify: `frontend/src/renderer/src/views/IdeasHome.vue`
- Modify: relevant project/card store or App routing boundary
- Test: focused component or store regression

- [ ] Write a failing regression for entering ideas and returning to the previous project/card context.
- [ ] Confirm it fails before adding the return control.
- [ ] Persist only the navigation context needed for return and add an explicit Polish return control; preserve unsaved-editor safeguards.
- [ ] Re-run the focused test and commit the task.

### Task 5: Synthetic runtime review

**Files:**
- Modify: `docs/acceptance/dogfood-01.md`
- Create: approved screenshot evidence under the repository acceptance location

- [ ] Run frontend typecheck, tests, and production web build.
- [ ] Start the synthetic runtime, inspect all listed surfaces on supported desktop and narrow viewports, and export comparison screenshots.
- [ ] Record only redaction-safe findings and exact test/build results in the DOGFOOD-01 record.
- [ ] Stage only task files, inspect the diff, commit, and update the existing draft PR #11.
