# Visual Language VL-00 Acceptance Evidence

Status: `READY FOR REVIEW`

Base:
`0b1479a032a40bb2d27f55dc3ccca35119609da7`

Branch:
`feature/visual-language`

Frozen upstream baseline:
`ca7ca584580df0220a6a0d008309e5575b3dc449`

## Scope

VL-00 is a read-only UI/source audit plus a documentation contract and
implementation plan. It does not implement a visual change.

The task:

- closed the already merged Stabilization Closure 1.1 feature branch locally
  and remotely after verifying that PR #3 was merged as squash commit
  `0b1479a032a40bb2d27f55dc3ccca35119609da7`;
- created the local, unpushed `feature/visual-language` branch at that exact
  commit;
- audited the current UI architecture, styles, representative surfaces, state
  presentation, and existing Foundation/Stabilization constraints;
- defined the Visual Language contract and six-wave implementation plan;
- changed no application source, dependencies, workflow definitions, or
  frozen-upstream evidence.

## Method and source quality

The named `ask-matt` router placed this work on a specification/planning path,
not an implementation path. Keystone context-survey and project-audit rules
were used to separate observed facts, risks, and planned follow-up. The
visualization guidance was applied as an operational-workspace and
accessibility review; no chart or concept image was appropriate for this
documentation-only task.

Element Plus integration decisions were checked against current official
Element Plus documentation through Context7. The official guidance confirms
that dark mode uses CSS variables, the dark-variable stylesheet is imported in
the application entry point, and custom dark CSS variables load after that
stylesheet. It also supports central global CSS-variable theming rather than
piecemeal selector overrides.

Visual Truth was not installed or executed. Its current workflow targets React
and requires package/build changes, while this repository uses Vue and VL-00
forbids dependencies and application changes. Future screenshot evidence uses
the existing local browser workflow and synthetic data.

## Sources read

The user-facing paths under `frontend/src/` map to the repository's canonical
Electron-Vite renderer root, `frontend/src/renderer/src/`. The following files
were read:

- `frontend/src/renderer/src/assets/base.css`
- `frontend/src/renderer/src/assets/main.css`
- `frontend/src/renderer/src/App.vue`
- `frontend/src/renderer/src/components/common/Header.vue`
- `frontend/src/renderer/src/views/Dashboard.vue`
- `frontend/src/renderer/src/views/Editor.vue`
- `frontend/src/renderer/src/components/pipelines/SelectionPipelineDialog.vue`
- `frontend/src/renderer/src/components/workflow/WorkflowStatusBar.vue`
- `frontend/src/renderer/src/stores/useAppStore.ts`
- `frontend/src/renderer/src/main.ts`
- `frontend/src/renderer/src/composables/useSidebarResizer.ts` as the editor
  width-boundary dependency.

Architecture and acceptance sources:

- `docs/superpowers/specs/2026-07-25-local-first-vps-ready-design.md`
- `docs/superpowers/plans/2026-07-25-sprint-0-foundation-spike.md`
- `docs/superpowers/plans/2026-07-26-stabilization-sprint-1.md`
- `docs/acceptance/stabilization-sprint-1.md`
- `docs/acceptance/stabilization-closure-1-1.md`
- `docs/architecture/upstream-sync.md`

No listed source file was modified.

## Current UI audit

### Finding VL00-F01 — competing global token systems

- Severity: `WATCH`
- Evidence: `base.css` defines Electron-Vite `--ev-*` dark-first primitives,
  while `main.css` defines a separate light-first set for primary, background,
  text, border, radius, and shadow. Components also consume Element Plus
  variables directly.
- Impact: theme ownership and migration order are ambiguous; equivalent light
  and dark hierarchy cannot be reviewed from one source.
- Confidence: high.
- Planned boundary: VL-01 central token and theme layers only.

### Finding VL00-F02 — scattered framework and literal styling

- Severity: `WATCH`
- Evidence: global Element Plus button/input/tag selectors use `!important`;
  representative components contain hardcoded colours, raw shadows, fixed
  radii, inline styles, component-local `:deep()` selectors, and isolated
  `--el-*` choices.
- Repository scan context: current renderer sources contain 38 `!important`
  matches, 112 inline `style` attributes, and 192 `:deep()` matches. These are
  inventory signals, not blanket defects; each future wave reviews only its
  allowlist.
- Impact: local fixes can override unrelated themes and make component state
  inconsistent.
- Confidence: high.
- Planned boundary: VL-01 and VL-02; no out-of-scope cleanup.

### Finding VL00-F03 — decoration precedes shared hierarchy

- Severity: `WATCH`
- Evidence: the audited surfaces include gradients, blur, glass treatment,
  multiple raw shadow recipes, `shadow-premium`, status flashing, and
  `transition: all`. Current renderer sources contain 14 `transition: all`,
  10 `backdrop-filter`, and 13 `linear-gradient` matches.
- Impact: visual noise and theme-specific assumptions compete with state and
  long-form writing.
- Confidence: high.
- Planned boundary: retain only effects that serve hierarchy or system state;
  defer decorative finish to Premium Polish.

### Finding VL00-F04 — editor responsive boundary is implicit

- Severity: `WATCH`
- Evidence: `Editor.vue` renders left sidebar, canvas, and right sidebar in one
  flex row and defines no component media query. Current resizer bounds are
  left 180–400 px and right 280–500 px, with default widths 285 and 340 px.
  The canvas has no enforced minimum. Only the left sidebar has an explicit
  collapse control.
- Impact: narrower desktop widths can compress the writing canvas, create
  competing overflow, or hide important controls.
- Confidence: high.
- Planned boundary: VL-04 presentation-only migration, one sidebar at a time at
  narrow widths, canvas minimum, bounded resizers, no editor logic refactor.

### Finding VL00-F05 — large-component change risk

- Severity: `WATCH`
- Evidence: `CodeMirrorEditor.vue` has 5,162 lines, `Editor.vue` 2,142,
  `NodeBlockEditor.vue` 2,038, `GenericCardEditor.vue` 1,543, and
  `AssistantPanel.vue` 1,357.
- Impact: broad visual refactors could silently affect editor transactions,
  card behavior, selection safety, assistant context, or workflow integration.
- Confidence: high.
- Planned boundary: small style and presentation slices, behavior tests first,
  exact per-wave allowlists, and explicit stop conditions.

### Finding VL00-F06 — dialog sizing is inconsistent

- Severity: `WATCH`
- Evidence: the audited editor includes fixed 500 px and 900 px dialogs;
  repository components use a mixture of fixed pixels, percentages, and one
  responsive `min(960px, 94vw)` pipeline dialog.
- Impact: fixed dialogs can overflow at minimum supported widths, while
  percentage-only dialogs can become excessively wide.
- Confidence: high.
- Planned boundary: shared preferred width, maximum width, viewport gutters,
  internal scroll, and wrapped action contract in VL-02 and per-surface waves.

### Finding VL00-F07 — state vocabulary exists but is fragmented

- Severity: `WATCH`
- Evidence: the dashboard and editor use Element Plus loading/empty states;
  `Thinking p*rn` explicitly models conflict, run error, queued, running,
  success, and error; `WorkflowStatusBar` maps succeeded, failed, running,
  paused, pending, timeout, and cancelled. Offline/local-service unavailable
  and global versus surface state do not share a presentation contract.
- Impact: equivalent states can look and behave differently by surface, and a
  transient message may be mistaken for durable error state.
- Confidence: high.
- Planned boundary: VL-02 base state language and VL-05 workflow surface
  migration without changing state machines.

### Finding VL00-F08 — partial light/dark integration

- Severity: `INFO`
- Evidence: `main.ts` imports Element Plus light CSS and dark CSS variables;
  `useAppStore` toggles `html.dark` and persists the choice. Many components use
  `--el-*`, but `main.css`, Dashboard covers/text shadows, and
  WorkflowStatusBar also contain light/dark literal values.
- Impact: the theme mechanism is sound, but surface equivalence is not centrally
  enforceable.
- Confidence: high.
- Planned boundary: preserve the existing class toggle and import mechanism,
  then layer reviewed semantic mappings.

### Finding VL00-F09 — local-first and stabilization boundaries are healthy

- Severity: `INFO`
- Evidence: the accepted architecture keeps the web frontend canonical,
  provider access behind FastAPI, SQLite local-first, and Tailscale-only remote
  access. Stabilization acceptance explicitly excludes Visual Language and
  records safe workflow/provider failure behavior.
- Impact: visual work has a clear nonfunctional boundary and needs no deployment
  or backend redesign.
- Confidence: high.
- Planned boundary: every wave keeps frozen-upstream, backend, privacy, restore,
  exposure, and workflow gates green.

No `CRITICAL` audit finding was identified in VL-00.

## Token decisions

- Four layers: primitives, semantic roles, component aliases, central Element
  Plus mapping.
- Prefix Writers Room tokens with `--wr-*`.
- Keep primitives small: neutral/accent/status colours, constrained typography,
  spacing, radius, shadow, motion, control, and layout scales.
- Components consume semantic roles; primitives are not feature APIs.
- Light and dark share structure but map backgrounds, text, borders, focus,
  selection, status, masks, and shadows independently.
- Element Plus dark CSS remains imported in `main.ts`; Writers Room mappings
  load afterward.
- `:deep()` and `!important` become reviewed exceptions, not default tools.
- Breakpoints are wide `>=1440`, standard `1180–1439`, narrow `900–1179`, and
  minimum supported `768–899` px.
- Editor canvas remains primary and is never accidentally squeezed between
  three visible columns at narrow widths.

## Premium Polish boundary

Visual Language excludes decorative animation, effect-only “wow,” excessive
glassmorphism, custom illustrations, nonfunctional microinteractions, and
single-screen perfectionism. Existing gradients, blur, premium shadow naming,
and flashing are audit inputs, not requirements.

Premium Polish may begin only after VL-06 accepts the shared token, theme,
state, layout, responsive, keyboard, contrast, zoom, and reduced-motion
contracts. It remains a separate scope and decision.

## Implementation waves

- **VL-01 — Tokens and themes:** central four-layer token system and light/dark
  mapping.
- **VL-02 — Element Plus and base states:** framework integration, controls,
  focus, dialogs, states, and reduced motion.
- **VL-03 — App shell, header and dashboard:** first complete migrated product
  path.
- **VL-04 — Editor workspace:** canvas-first responsive layout in narrow slices,
  without a large editor refactor.
- **VL-05 — Thinking p*rn and workflow states:** presentation-only migration
  with privacy and source-safety contracts frozen.
- **VL-06 — Responsive and acceptance QA:** all 30 acceptance criteria, themes,
  widths, keyboard, zoom, reduced motion, and synthetic screenshot evidence.

Each wave is a separate logical commit or pull request.

## Files created

- `docs/design/visual-language.md`
- `docs/superpowers/plans/2026-07-26-visual-language.md`
- `docs/acceptance/visual-language-vl-00.md`

No other file is part of VL-00.

## Documentation verification

Required VL-00 checks:

```bash
git status --short
git diff --stat
git diff --name-only
git diff --check
```

Additional documentation checks:

```bash
test "$({ git diff --name-only; git ls-files --others --exclude-standard; } | sort)" = "$(printf '%s\n' \
  docs/acceptance/visual-language-vl-00.md \
  docs/design/visual-language.md \
  docs/superpowers/plans/2026-07-26-visual-language.md | sort)"
rg -n '^## ([1-9]|1[0-5])\\.' docs/design/visual-language.md
rg -n '^## VL-0[1-6] ' docs/superpowers/plans/2026-07-26-visual-language.md
rg -n 'VL-AC-(0[1-9]|[12][0-9]|30)' docs/design/visual-language.md
! rg -n 'TO''DO|TB''D' \
  docs/design/visual-language.md \
  docs/superpowers/plans/2026-07-26-visual-language.md \
  docs/acceptance/visual-language-vl-00.md
```

VL-00 is documentation-only, so no frontend or backend runtime suite is
required for this commit. Every future implementation wave must run both full
relevant suites and the safety gates defined in the implementation plan.

## Independent review corrective pass

Review status before correction: `CHANGES REQUESTED`.

- Finding 1: the mandatory backend gate lacked the controlled Python 3.11 and
  temporary SQLite isolation already proven in Stabilization Closure 1.1. The
  plan now requires `/opt/homebrew/bin/python3.11`, a fresh external ephemeral
  `uv` environment, and a new explicit `/tmp` SQLite path through
  `NOVELFORGE_DB_PATH` for every backend run. The root `.env` cannot supply the
  mandatory gate's database configuration, and resolving
  `/data/novelforge.db` or another non-portable path blocks the wave before
  commit.
- Finding 2: VL-03, VL-04, and VL-05 contained non-exact test allowlists. Each
  wave now names every permitted existing test modification and every permitted
  new test path; directory-level and conditional alternatives were removed.
- Finding 3: VL-01 requested a durable failing check without an allowlisted
  file. It now uses one named, one-time static pre-change assertion whose `RED`
  and `GREEN` results must be recorded in
  `docs/acceptance/visual-language-vl-01.md`; it creates no hidden test or
  script.

Application implementation started: `NO`.

Visual Language decisions changed: `NO`.

Status after correction: `READY FOR REVIEW`.

### Fail-closed gate follow-up

The follow-up review found that the controlled Python 3.11 runtime and
temporary SQLite isolation were correct, but the shared block did not guarantee
termination on the first mandatory `FAIL`.

- The shared gate now starts with `set -euo pipefail`.
- Cleanup now runs through an `EXIT` trap after PASS or FAIL; narrow
  `INT`/`TERM`/`HUP` handlers route interruptions through the same cleanup.
- Cleanup preserves and returns the original exit code.
- A frontend or backend failure cannot be hidden by a later successful command.

Application implementation started: `NO`.

Visual Language decisions changed: `NO`.

Status: `READY FOR REVIEW`.

## Decision

VL-00 is `READY FOR REVIEW`.

- Contract acceptance criteria: `30`.
- Contradictions with local-first architecture: `NONE`.
- Contradictions with frozen upstream: `NONE`.
- New dependency or test framework: `NONE`.
- Application, CSS, Vue, TypeScript, backend, or workflow implementation
  started: `NO`.
- Premium Polish started: `NO`.
