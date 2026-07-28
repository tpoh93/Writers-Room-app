# Visual Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` task by task. Use test-first verification for
> behavior-preservation seams and `superpowers:verification-before-completion`
> before claiming a wave complete.

**Goal:** Implement the accepted Writers Room Visual Language in six bounded
waves while preserving the local-first architecture, editor behavior,
`Thinking p*rn` safety, and the frozen upstream baseline.

**Architecture:** Introduce a four-layer CSS token system, map it centrally to
Element Plus, migrate representative surfaces from shell to editor and workflow
states, then close with responsive and accessibility acceptance. Keep Vue
component logic intact and move styles in narrow, reviewable slices.

**Tech Stack:** Vue 3, TypeScript, CSS custom properties, Element Plus 2.x,
Pinia, Vitest, Vite, existing browser/web runtime, existing backend Pytest
suite.

**Contract:** `docs/design/visual-language.md`

## Global constraints

- Base each wave on the latest accepted `main`.
- Keep the frozen upstream baseline at
  `ca7ca584580df0220a6a0d008309e5575b3dc449`.
- Each wave is one logical commit or pull request. Do not combine waves merely
  because files overlap.
- No wave may change backend behavior, API contracts, selection transactions,
  project/card persistence, workflow definitions, or provider handling.
- Do not refactor the 2,142-line `Editor.vue` or the 5,162-line
  `CodeMirrorEditor.vue` as part of visual migration.
- Do not change `Thinking p*rn` behavior, ordering, retry, persistence, conflict
  protection, safe errors, or apply/reject semantics.
- Do not combine Visual Language with Premium Polish or full localization.
- Do not add dependencies or change `package.json` or `package-lock.json`
  without a separate approved decision.
- Do not add Storybook, Playwright, Vitest Browser Mode, Percy, Chromatic,
  Visual Truth, or another visual-test framework.
- Do not expand a wave's allowlist during implementation. Stop and request a
  separate decision if a required file is outside it.
- Every wave preserves green frontend and backend gates.
- Screenshot fixtures use invented local prose and synthetic projects only.
  Never capture private writing, credentials, model payloads, or tailnet data.

## Shared verification contract

Every wave runs, at minimum:

```bash
cd frontend
npm test -- --run
npm run typecheck
npm run build:web:container
cd ..

test -x /opt/homebrew/bin/python3.11
command -v uv

VL_BACKEND_ENV_ROOT="$(mktemp -d /tmp/writers-room-vl-env.XXXXXX)"
VL_BACKEND_VENV="$VL_BACKEND_ENV_ROOT/venv"
uv venv --python /opt/homebrew/bin/python3.11 "$VL_BACKEND_VENV"
source "$VL_BACKEND_VENV/bin/activate"
test "$(python -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')" = \
  "3.11"
uv pip install -r backend/requirements-dev.txt

VL_BACKEND_DB_ROOT="$(mktemp -d /tmp/writers-room-vl-db.XXXXXX)"
export NOVELFORGE_DB_PATH="$VL_BACKEND_DB_ROOT/writers-room-vl.db"
export BOOTSTRAP_OVERWRITE=false
test -d "$VL_BACKEND_DB_ROOT"
test "$NOVELFORGE_DB_PATH" != "/data/novelforge.db"

PYTHONPATH=backend pytest -q backend/tests \
  -W error::pydantic.warnings.PydanticDeprecatedSince20

rm -rf "$VL_BACKEND_DB_ROOT"
unset NOVELFORGE_DB_PATH
unset BOOTSTRAP_OVERWRITE
deactivate
rm -rf "$VL_BACKEND_ENV_ROOT"

bash scripts/verify-upstream.sh
git diff --check
```

This is the controlled Python 3.11 pattern proven by Stabilization Closure 1.1
Attempt 2. The environment is external and ephemeral, and each mandatory
backend invocation must create a fresh explicit SQLite database under `/tmp`
through `NOVELFORGE_DB_PATH`. Do not source, read, modify, or use the root
`.env` as the database configuration for a mandatory gate. Cleanup of the
temporary database and environment remains mandatory after either PASS or
terminal failure.

If a controlled backend run resolves `NOVELFORGE_DB_PATH` to
`/data/novelforge.db` or another non-portable path, stop the wave as `BLOCKED`
before commit. Do not retry with inherited configuration.

If a wave does not touch a behavior seam, existing tests are still the
regression authority. Do not weaken or delete a test to make a visual migration
pass.

Screenshot evidence is local, redacted, and review-only. It does not require a
new committed framework. For every target state, record viewport, theme,
density, fixture name, and source commit. A screenshot is supporting evidence,
not a substitute for keyboard, contrast, overflow, or automated behavior tests.

---

## VL-01 — Tokens and themes

### Goal

Create the minimal primitive, semantic, component-alias, and Element Plus token
layers. Make light and dark mappings explicit without changing rendered
component structure or behavior.

### Allowlist

- Create: `frontend/src/renderer/src/assets/tokens.css`
- Create: `frontend/src/renderer/src/assets/themes.css`
- Modify: `frontend/src/renderer/src/assets/base.css`
- Modify: `frontend/src/renderer/src/assets/main.css`
- Modify: `frontend/src/renderer/src/main.ts`
- Create: `docs/acceptance/visual-language-vl-01.md`

`package.json`, `package-lock.json`, Vue components, and backend files are not
allowed.

### High-risk files

- `frontend/src/renderer/src/assets/base.css`: current Electron-Vite dark-first
  template primitives and global reset.
- `frontend/src/renderer/src/assets/main.css`: competing light-first tokens,
  global Element Plus overrides, `!important`, glass utility, and
  `transition: all`.
- `frontend/src/renderer/src/main.ts`: stylesheet ordering controls whether
  Element Plus light/dark variables or Writers Room mappings win.

### Actions

- [ ] Run the one-time `VL-01 token-layer ownership assertion` below before any
  style change and record its expected non-zero `RED` result. Run the identical
  command after the migration and record its zero-exit `GREEN` result in
  `docs/acceptance/visual-language-vl-01.md`. This is a pre-change assertion,
  not a new committed test or script:

  ```bash
  test -f frontend/src/renderer/src/assets/tokens.css &&
  test -f frontend/src/renderer/src/assets/themes.css &&
  rg -q -- '--wr-primitive-' \
    frontend/src/renderer/src/assets/tokens.css &&
  rg -q -- '--wr-(header|editor|dialog)' \
    frontend/src/renderer/src/assets/tokens.css &&
  rg -q -- '--wr-(color|shadow)-' \
    frontend/src/renderer/src/assets/themes.css &&
  rg -q -- '--el-' \
    frontend/src/renderer/src/assets/themes.css &&
  ! rg -n -- '--wr-(primitive|header|editor|dialog)' \
    frontend/src/renderer/src/assets/themes.css &&
  ! rg -n -- '--wr-(color|shadow)-' \
    frontend/src/renderer/src/assets/tokens.css &&
  ! rg -n -- '--wr-(primitive|color|shadow|header|editor|dialog)' \
    frontend/src/renderer/src/assets/base.css \
    frontend/src/renderer/src/assets/main.css
  ```

- [ ] Define the small primitive scales listed in the contract.
- [ ] Define light semantic roles at `:root`.
- [ ] Define dark semantic roles under `html.dark`.
- [ ] Define only the shared component aliases needed by known surfaces.
- [ ] Map semantic roles to stable global `--el-*` variables after the Element
  Plus dark-variable import.
- [ ] Remove or alias the duplicate `--ev-*`, `--primary-*`, `--bg-*`,
  `--text-*`, radius, and shadow definitions without changing behavior outside
  the allowlist.
- [ ] Replace the global premium/glass naming with neutral semantic ownership;
  do not introduce new decorative use.
- [ ] Document every retained temporary global override and its VL-02 removal
  condition.

### Tests

- Shared verification contract.
- Static checks:

```bash
rg -n -- '--wr-primitive-|--wr-color-|--wr-shadow-|--wr-(header|editor|dialog)' \
  frontend/src/renderer/src/assets
rg -n 'transition:\\s*all|shadow-premium' \
  frontend/src/renderer/src/assets
```

- Contrast measurement for primary/secondary text, accent, focus, and status
  pairs in both themes.
- Theme toggle persistence test remains green.

### Screenshot evidence

- App shell and an empty dashboard at 1440 by 900 in light and dark.
- Same synthetic fixture before and after the wave for regression comparison.
- No private project names or prose.

### Acceptance criteria

- Four token layers are explicit and centrally owned.
- Light and dark have the same semantic roles and surface order.
- No feature component is changed.
- No new `transition: all`, unexplained `!important`, glass effect, or gradient
  is introduced.
- `VL-AC-01` through `VL-AC-09`, `VL-AC-28`, and `VL-AC-29` pass where
  applicable.

### Rollback boundary

Revert only the VL-01 commit. The previous `main.css`, `base.css`, and
stylesheet import order must fully restore the prior theme.

### Excluded scope

Component migration, layout changes, responsive behavior, typography redesign,
new fonts, illustrations, and dependency work.

### Stop conditions

- A component or backend change appears necessary.
- Element Plus mapping requires a new Sass or build dependency.
- Theme toggle, dark import order, or production build changes behavior.
- Contrast cannot pass without expanding the colour decision beyond the
  approved minimal palette.

---

## VL-02 — Element Plus and base states

### Goal

Centralize Element Plus integration and establish shared control, focus,
dialog, form, loading, empty, disabled, notification, and reduced-motion
contracts.

### Allowlist

- Modify: `frontend/src/renderer/src/assets/tokens.css`
- Modify: `frontend/src/renderer/src/assets/themes.css`
- Modify: `frontend/src/renderer/src/assets/main.css`
- Create: `frontend/src/renderer/src/assets/element-plus.css`
- Create: `frontend/src/renderer/src/assets/states.css`
- Modify: `frontend/src/renderer/src/main.ts`
- Modify only for focused behavior-preservation assertions:
  `frontend/src/renderer/src/components/pipelines/__tests__/SelectionPipelineDialog.test.ts`
- Create: `docs/acceptance/visual-language-vl-02.md`

### High-risk files

- `main.css`: existing global selectors override buttons, inputs, textarea, and
  tags with `!important`.
- `main.ts`: style order is the Element Plus theme boundary.
- Pipeline dialog test: safety behavior must not be reinterpreted as a visual
  state.

### Actions

- [ ] Add centralized mappings for button, input, select, form, tabs, dropdown,
  message, tooltip, popover, and dialog primitives supported by Element Plus.
- [ ] Define reusable global state patterns for loading, empty, error, timeout,
  conflict, success, disabled, offline, running, paused, and cancelled.
- [ ] Add a common `:focus-visible` contract.
- [ ] Add reduced-motion rules for nonessential animations and transitions.
- [ ] Replace global `!important` overrides with variables or narrowly scoped
  selectors.
- [ ] Define responsive dialog width and viewport-gutter defaults.
- [ ] Verify that message/toast remains transient while blocking surface state
  stays persistent.
- [ ] Record any unavoidable `:deep()` or `!important` exception with its
  upstream reason and removal condition.

### Tests

- Shared verification contract.
- Existing dialog tests prove that conflict and run error still disable apply.
- Static scans:

```bash
rg -n '!important|transition:\\s*all|:deep\\(' \
  frontend/src/renderer/src/assets
rg -n 'prefers-reduced-motion|focus-visible' \
  frontend/src/renderer/src/assets
```

- Keyboard spot checks for button, input, select, tabs, dropdown, tooltip
  trigger, and dialog close.
- State fixture review in both themes.

### Screenshot evidence

- Synthetic state sheet showing every state in light and dark.
- Dialog and form at 1440, 1024, and 768 px widths.
- Focus-visible examples captured after keyboard navigation.

### Acceptance criteria

- Central Element Plus mapping owns shared variables.
- Base states use text/icon or shape in addition to colour.
- Reduced motion preserves state without decorative animation.
- Dialog actions remain ordered and operable when wrapped.
- `VL-AC-04` through `VL-AC-09`, `VL-AC-18` through `VL-AC-22`, and
  `VL-AC-28` pass.

### Rollback boundary

Revert VL-02 only; VL-01 tokens remain valid but unused by the reverted base
integration.

### Excluded scope

Shell, dashboard, editor, workflow surface migration; content translation;
component refactors; new notification behavior.

### Stop conditions

- A public Element Plus variable or prop cannot preserve current semantics and
  the required selector would affect unrelated screens.
- A base state requires new application data or backend behavior.
- A dependency or lockfile change becomes necessary.

---

## VL-03 — App shell, header, and dashboard

### Goal

Apply the accepted hierarchy, tokens, density, state, and responsive contracts
to the first complete product path: shell, header, dashboard, and project card.

### Allowlist

- Modify: `frontend/src/renderer/src/App.vue`
- Modify: `frontend/src/renderer/src/components/common/Header.vue`
- Modify: `frontend/src/renderer/src/views/Dashboard.vue`
- Modify: `frontend/src/renderer/src/assets/tokens.css`
- Modify: `frontend/src/renderer/src/assets/themes.css`
- Create:
  `frontend/src/renderer/src/views/tests/Dashboard.visual-contract.test.ts`
- Create: `docs/acceptance/visual-language-vl-03.md`

### High-risk files

- `App.vue`: owns full-viewport layout, scrolling, and global overlays.
- `Header.vue`: navigation and theme actions; currently contains an inline
  style and labels that may overflow.
- `Dashboard.vue`: mixes application behavior with hardcoded gradients,
  hover-only actions, hardcoded cover palettes, and a single 768 px breakpoint.

### Actions

- [ ] Add behavior-preservation assertions for project selection, creation,
  edit/delete actions, sorting, search, and theme toggle.
- [ ] Migrate shell backgrounds, content overflow, and header dimensions to
  semantic roles.
- [ ] Migrate header identity, navigation, action grouping, focus, and narrow
  behavior without changing handlers.
- [ ] Remove the inline margin in the header.
- [ ] Align dashboard hero, toolbar, empty state, and grid to one content
  gutter and bounded width.
- [ ] Replace decorative hero treatment with hierarchy-led surface styling.
- [ ] Map project cover colours through reviewed semantic/component aliases or
  retain them as an explicitly bounded content-identity exception.
- [ ] Make project actions visible on keyboard focus and discoverable without
  hover-only dependency.
- [ ] Add wide, standard, narrow, and minimum layout rules.

### Tests

- Shared verification contract.
- Dashboard behavior assertions for loading, empty, populated, search, sort,
  project selection, and destructive-action separation.
- Keyboard navigation through header and project-card actions.
- Horizontal-overflow checks at 1440, 1180, 900, and 768 px.
- 200% text zoom check.

### Screenshot evidence

- Header and dashboard in light/dark at all four target widths.
- Synthetic empty, loading, populated, long-title, and fetch-error fixtures.
- Keyboard-focus screenshot for a project card.

### Acceptance criteria

- Shell has one predictable scroll owner.
- Header actions remain reachable.
- Dashboard states are distinct.
- Project actions do not depend only on hover.
- No project behavior or data flow changes.
- `VL-AC-10` through `VL-AC-13`, `VL-AC-18`, `VL-AC-21`, `VL-AC-26` through
  `VL-AC-29` pass.

### Rollback boundary

Revert the VL-03 commit. Token and Element Plus waves remain intact, and the
shell/dashboard return to their prior component styles and markup.

### Excluded scope

Editor, workflow UI, project data changes, new card artwork, localization, and
Premium Polish.

### Stop conditions

- A proposed visual change needs new project metadata or navigation behavior.
- Fixing hover-only controls requires changing authorization or delete logic.
- Scroll ownership cannot be corrected within the listed three components.

---

## VL-04 — Editor workspace

### Goal

Apply the layout, density, surface, overflow, panel, and responsive contracts to
the editor without a large component refactor or any change to editor behavior.

### Allowlist

- Modify: `frontend/src/renderer/src/views/Editor.vue`
- Modify: `frontend/src/renderer/src/composables/useSidebarResizer.ts`
- Modify: `frontend/src/renderer/src/components/common/EditorHeader.vue`
- Modify: `frontend/src/renderer/src/assets/tokens.css`
- Create:
  `frontend/src/renderer/src/views/tests/Editor.visual-contract.test.ts`
- Create:
  `frontend/src/renderer/src/composables/tests/useSidebarResizer.test.ts`
- Create: `docs/acceptance/visual-language-vl-04.md`

No other editor, card, assistant, panel, store, API, or backend file is allowed.

### High-risk files

- `Editor.vue`: 2,142 lines combining layout, card actions, drag/drop, dialogs,
  assistant context, and state.
- `useSidebarResizer.ts`: width limits affect pointer behavior and canvas
  availability.
- `EditorHeader.vue`: shared editor actions and compact density.

`CodeMirrorEditor.vue`, `AssistantPanel.vue`, and card editors are observation
boundaries only in this wave.

### Actions

- [ ] Freeze behavior with focused assertions for active card, card
  multiselect, drag/drop hooks, dialog open/close, assistant panel, and sidebar
  toggle.
- [ ] Introduce only computed presentation state needed for responsive panels;
  do not move domain logic or extract a giant component.
- [ ] Map left and right sidebar bounds, canvas minimum, resizer hit area,
  header, panel gap, and elevations to aliases.
- [ ] Clamp resizers before the canvas crosses its minimum.
- [ ] Implement one-sidebar-at-a-time behavior in narrow mode and a
  canvas-first minimum mode using existing panel state.
- [ ] Give collapsed/overlay panels visible, reversible keyboard and pointer
  controls.
- [ ] Define regional overflow so shell, sidebars, canvas, tabs, and dialog
  content do not compete.
- [ ] Convert the 500 px and 900 px editor dialogs to responsive preferred
  widths and safe gutters.
- [ ] Migrate inline style literals only when presentation-only and inside the
  allowlist.
- [ ] Remove or justify local glass, blur, raw shadows, and `!important`.

### Tests

- Shared verification contract.
- Focused editor tests for preserved handlers and state.
- Resizer unit tests for left/right bounds and canvas minimum.
- Layout checks at 1600, 1280, 1024, 900, 768 px.
- Keyboard panel toggle and resizer alternatives.
- No app-level horizontal overflow; each region scrolls independently.
- Long synthetic card title, long project title, empty tree, search loading,
  and no-active-card fixtures.

### Screenshot evidence

- Light/dark editor at wide, standard, narrow, and minimum modes.
- Left open/right open/canvas-only states.
- Create and import dialogs at 900 and 768 px.
- Synthetic prose only; no real project data.

### Acceptance criteria

- Canvas minimum is enforced.
- Three columns are never accidentally squeezed.
- Panel state is reversible and keyboard-operable.
- Dialogs fit supported viewports.
- Card, editor, drag/drop, assistant, and persistence behavior is unchanged.
- `VL-AC-14` through `VL-AC-19`, `VL-AC-21`, `VL-AC-26` through `VL-AC-29`
  pass.

### Rollback boundary

Revert VL-04 as one unit. The editor's previous widths, styles, and resizer
logic return without reverting VL-01 through VL-03.

### Excluded scope

Editor decomposition, CodeMirror changes, card schema changes, assistant
behavior, workflow changes, localization, and Premium Polish.

### Stop conditions

- Correct responsive behavior requires moving editor domain logic or changing
  an event contract.
- An additional component outside the allowlist must change.
- A synthetic or existing behavior test exposes regression.
- Layout requires supporting widths below the declared 768 px minimum.

---

## VL-05 — Thinking p*rn and workflow states

### Goal

Apply the state language and responsive presentation to `Thinking p*rn` and
workflow status while preserving the stabilized workflow and provider privacy
contracts exactly.

### Allowlist

- Modify:
  `frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue`
- Modify:
  `frontend/src/renderer/src/components/pipelines/__tests__/SelectionPipelineDialog.test.ts`
- Modify:
  `frontend/src/renderer/src/components/workflow/WorkflowStatusBar.vue`
- Create:
  `frontend/src/renderer/src/components/workflow/__tests__/WorkflowStatusBar.visual-contract.test.ts`
- Modify: `frontend/src/renderer/src/assets/tokens.css`
- Create: `docs/acceptance/visual-language-vl-05.md`

Workflow definitions, selection API clients, stores, backend endpoints, and
provider-error modules are not allowed.

### High-risk files

- `SelectionPipelineDialog.vue`: accept safety, conflict, retry, and persisted
  prior output are product-critical.
- `WorkflowStatusBar.vue`: movable fixed surface with `z-index: 2000`,
  hover-dependent expansion, `transition: all`, glass treatment, flashing
  animation, and hardcoded light/dark values.

### Actions

- [ ] Extend existing tests before style changes to lock accept/reject, conflict,
  provider error, timeout, retry, output preservation, and terminal states.
- [ ] Migrate pipeline setup, steps, outputs, comparison, and actions to the
  shared surface/state contracts.
- [ ] Preserve safe fixed provider messages; do not expose new error detail.
- [ ] Make running and terminal states visible without depending on hover.
- [ ] Replace status-bar `transition: all`, decorative flashing, and raw glass
  values with named functional motion and semantic surfaces.
- [ ] Constrain a dragged status bar to the usable viewport without changing
  stored workflow state.
- [ ] Add keyboard reachability and a non-drag activation path.
- [ ] Stack model fields and comparison at narrow widths while preserving
  output order and action order.
- [ ] Verify reduced motion.

### Tests

- Shared verification contract.
- Existing full `SelectionPipelineDialog` suite, including failed-run
  acceptance blocking.
- Focused status-bar tests for running, paused, timeout, cancelled, success,
  error, empty history, clear completed, click, and drag bounds.
- No backend test may be skipped; the provider privacy regression remains
  green.
- Keyboard, 200% zoom, reduced-motion, and overflow checks.

### Screenshot evidence

- Synthetic Kimi success, Grok error/timeout, Aion not started.
- All-success comparison with invented prose.
- Conflict, retry, running, paused, cancelled, and empty status states.
- Light/dark at 1440, 1024, 900, and 768 px.

### Acceptance criteria

- Safe provider code/message presentation remains unchanged.
- Conflict or run error continues to block apply.
- Kimi output remains visible after later failure.
- Status is visible without hover and not communicated by colour alone.
- Status bar cannot be dragged beyond the usable viewport.
- `VL-AC-18` through `VL-AC-25`, `VL-AC-27` through `VL-AC-29` pass.

### Rollback boundary

Revert VL-05 only. The previous pipeline and status-bar presentation returns;
workflow/backend behavior is unaffected because those files were never in
scope.

### Excluded scope

`Thinking p*rn` definition, store/API changes, provider error contract, new
retry behavior, output formatting changes, localization, and Premium Polish.

### Stop conditions

- Any behavior, API, store, workflow, backend, or privacy change appears
  necessary.
- Acceptance blocking, retry, output preservation, or source safety regresses.
- A new dependency or visual-test framework is proposed.

---

## VL-06 — Responsive and acceptance QA

### Goal

Verify the complete migrated system across themes, widths, density, keyboard,
zoom, reduced motion, and state fixtures; fix only in-scope visual defects and
produce final acceptance evidence.

### Allowlist

- Modify only files already changed in VL-01 through VL-05 when a documented
  acceptance defect requires a focused correction.
- Modify existing focused tests created in VL-01 through VL-05.
- Create: `docs/acceptance/visual-language-vl-06.md`
- Modify: `docs/acceptance/visual-language-vl-00.md` only to add links to final
  accepted wave evidence, without rewriting VL-00 history.

Before work begins, replace this inherited set with an exact file list based on
merged VL-01 through VL-05 history. A wildcard allowlist is not acceptable for
execution.

### High-risk files

- Any file touched by multiple waves.
- `Editor.vue`, `WorkflowStatusBar.vue`, and global theme files.
- Acceptance documentation, because it must distinguish observed evidence from
  unverified claims.

### Actions

- [ ] Freeze the exact VL-06 allowlist from accepted wave history.
- [ ] Build a synthetic QA matrix covering all states, four widths, two themes,
  keyboard, 200% zoom, reduced motion, and compact/comfortable density where
  supported.
- [ ] Execute each `VL-AC-01` through `VL-AC-30` criterion and record exact
  evidence.
- [ ] Compare screenshots by meaning: hierarchy, state, readability, overflow,
  and focus, not pixel identity.
- [ ] Run static scans for raw values, `transition: all`, unexplained
  `!important`, scattered `--el-*`, fixed dialogs, and hover-only actions.
- [ ] Review every correction against functional diffs and behavior tests.
- [ ] Record known nonblocking observations separately from accepted criteria.
- [ ] Confirm no private prose, credentials, provider payload, tailnet data, or
  generated user content entered screenshots or Git.

### Tests

- Shared verification contract.
- All frontend tests, not only visual-contract tests.
- Full backend Pydantic warning gate.
- Restore-recovery, local-exposure, credential-shape, private-marker, and
  frozen-upstream gates used by Stabilization Closure 1.1.
- Exact allowlist, `git diff --check`, and manual full-diff review.
- Keyboard, contrast, text zoom, reduced motion, and overflow matrix.

### Screenshot evidence

- One indexed local set for every representative surface:
  shell/header/dashboard, project cards, editor modes, dialogs,
  `Thinking p*rn`, and workflow status.
- Light and dark at 1440, 1180, 900, and 768 px.
- Synthetic long labels and prose.
- Evidence index records commit, viewport, theme, state, and reviewer.

### Acceptance criteria

- All 30 Visual Language acceptance criteria are PASS or the wave is BLOCKED.
- No failed, pending, or unexecuted required gate.
- No functional diff, new dependency, frozen-baseline change, private evidence,
  or Premium Polish.
- `VL-AC-30` passes after independent full-diff review.

### Rollback boundary

VL-06 corrections are one commit and can be reverted without erasing accepted
VL-01 through VL-05 history. If the problem belongs to an earlier wave's
architecture, stop and open a dedicated corrective task instead of hiding it in
QA.

### Excluded scope

New feature work, general refactoring, localization, new test infrastructure,
automated pixel regression, dependency upgrades, and Premium Polish.

### Stop conditions

- Any acceptance criterion, mandatory gate, or exact allowlist check fails.
- Fixing a finding requires behavior, backend, workflow, dependency, or
  out-of-allowlist change.
- Evidence contains private or secret material.
- Review identifies decoration-first work or screen-specific perfectionism.

## Program completion rule

Visual Language is complete only after VL-06 records all 30 criteria as PASS on
the final reviewed commit. “Mostly green,” a screenshot-only review, or a
passing build with unresolved accessibility or behavior findings is not
completion. Premium Polish remains blocked until that result is accepted.
