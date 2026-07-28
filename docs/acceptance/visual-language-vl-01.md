# Visual Language VL-01 Acceptance Evidence

Status: `READY FOR REVIEW`

## Base

- Base SHA: `ee2ca21d4939375d631d8317b2f4c226e44226b3`
- Branch: `feature/visual-language-vl-01`
- Frozen upstream baseline:
  `ca7ca584580df0220a6a0d008309e5575b3dc449`

## Scope

VL-01 establishes the minimal primitive, shared-role, theme-semantic,
component-alias, and Element Plus mapping layers. It changes stylesheet
ownership and import order only. It does not migrate a feature component or
change application behavior.

Exact allowlist:

- `frontend/src/renderer/src/assets/tokens.css`
- `frontend/src/renderer/src/assets/themes.css`
- `frontend/src/renderer/src/assets/base.css`
- `frontend/src/renderer/src/assets/main.css`
- `frontend/src/renderer/src/main.ts`
- `docs/acceptance/visual-language-vl-01.md`

Vue components changed: `NO`. Backend changed: `NO`. Tests changed: `NO`.
Package or lock files changed: `NO`. Application behavior changed: `NO`.

## RED assertion

Command:

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

- Expected result: non-zero.
- Assertion exit code: `1`.
- RED reason: `tokens.css` and `themes.css` did not exist at the base SHA.
- Timestamp: `2026-07-28T05:13:53Z`.
- Source SHA: `ee2ca21d4939375d631d8317b2f4c226e44226b3`.

The command was run once before the first repository mutation. It created no
test, script, or log file.

## Legacy inventory

| Legacy family or path | Source and use | Decision | VL-02 removal condition |
|---|---|---|---|
| `--ev-*` | Defined and consumed only in `assets/base.css` | Removed | Not applicable |
| `--primary-*`, `--secondary-*` | Defined and consumed only in `assets/main.css` | Migrated to central semantic and Element Plus mapping | Not applicable |
| `--bg-*`, `--text-*`, `--border-*`, `--shadow-*` | Defined and consumed only in `assets/main.css` | Migrated; no independent legacy value remains | Not applicable |
| Global primary-button override | `assets/main.css`, three `!important` declarations | Removed in favor of stable global `--el-*` variables | Not applicable |
| Global input and textarea override | `assets/main.css`, two `!important` declarations and `transition: all` | Removed in favor of stable global variables and existing Element Plus states | Not applicable |
| `.glass` | Definition in `assets/main.css`; no consumer found in the renderer inventory | Removed | Not applicable |
| `shadow-premium` and primary gradient | Definitions in `assets/main.css`; no consumer found | Removed | Not applicable |

Retained compatibility aliases: `NONE`.

Retained `!important`: `NONE` in the migrated global assets.

Retained `.glass` compatibility paths: `NONE`.

No out-of-allowlist consumer required a VL-02 compatibility alias. Existing
component-local effects and overrides outside the VL-01 allowlist remain
untouched and are not claimed as migrated.

## Token architecture

- Primitives owner: `tokens.css`; small neutral/accent/status colour scales,
  system font families, 12/13/14/16/20/24 px type, weights, spacing, radius,
  borders, shadows, motion, control sizes, and layout dimensions.
- Shared semantic roles owner: `tokens.css`; typography, spacing, shape,
  control density, motion, elevation, z-index, layout, and documented
  breakpoints.
- Theme semantic roles owner: `themes.css`; 41 matching colour and shadow
  roles under light `:root` and `html.dark`.
- Component aliases owner: `tokens.css`; header height, editor panel widths,
  editor canvas minimum, dialog maximum, card padding, control height,
  resizer hit area, and status-bar z-index only.
- Element Plus mapping owner: `themes.css`; brand/status colours, surfaces,
  fills, text tiers, border tiers, focus and disabled states, masks, shape,
  elevation, and stable component sizes.
- `base.css` and `main.css` define none of those layers; they consume the
  central mapping and shared non-colour roles.

The effective value flow is:

`primitives` → `semantic roles` → `component/framework mappings` → `surfaces`.

`themes.css` consumes primitive colour, RGB, and shadow values when defining
the light and dark semantic roles. Element Plus consumes only those semantic
Writers Room roles plus shared radius, border, and control-size roles.
Component aliases consume shared layout, spacing, control, and z-index roles.
Feature components do not consume primitives directly.

## Import order

Final stylesheet order in `frontend/src/renderer/src/main.ts`:

1. `element-plus/dist/index.css`
2. `element-plus/theme-chalk/dark/css-vars.css`
3. `./assets/tokens.css`
4. `./assets/themes.css`
5. `./assets/base.css`
6. `./assets/main.css`

The Writers Room mappings load after the Element Plus dark-variable
stylesheet. Light mapping uses `html:root` and dark mapping uses `html.dark`,
so both central mappings win without `!important`. Live computed-style checks
confirmed `--el-color-primary: #2563eb` and the expected Writers Room page
background in both themes.

## Light and dark

- Both themes define the same 41 semantic colour/shadow roles; role-set diff:
  empty.
- Both preserve the order app background, canvas, panel, raised surface, and
  overlay.
- Dark surfaces are `#111827`, `#18212f`, `#1f2937`, `#273449`, and `#2b3a50`;
  the stack contains no pure black and adjacent surfaces remain distinct.
- Colours, status variants, masks, selection, focus, and shadows are mapped
  independently for light and dark.
- The same synthetic empty dashboard rendered with no horizontal overflow and
  no console error or warning in both themes.

## Contrast

The ratios below were recalculated after resolving the final primitive-to-
semantic references. Text and status pairs use the stricter `4.5:1` threshold;
focus indicators use `3:1`.

| Theme | Foreground token | Background token | Ratio | Threshold | Result |
|---|---|---|---:|---:|---|
| Light | `--wr-color-text-primary` | `--wr-color-bg-app` | 17.06 | 4.5 | PASS |
| Light | `--wr-color-text-primary` | `--wr-color-surface-canvas` | 17.85 | 4.5 | PASS |
| Light | `--wr-color-text-secondary` | `--wr-color-surface-panel` | 6.92 | 4.5 | PASS |
| Light | `--wr-color-text-muted` | `--wr-color-surface-panel` | 5.26 | 4.5 | PASS |
| Light | `--wr-color-text-inverse` | `--wr-color-accent` | 5.17 | 4.5 | PASS |
| Light | `--wr-color-focus-ring` | `--wr-color-bg-app` | 6.41 | 3.0 | PASS |
| Light | `--wr-color-focus-ring` | `--wr-color-surface-canvas` | 6.70 | 3.0 | PASS |
| Light | success foreground | success background | 6.81 | 4.5 | PASS |
| Light | warning foreground | warning background | 8.38 | 4.5 | PASS |
| Light | error foreground | error background | 7.60 | 4.5 | PASS |
| Light | info foreground | info background | 8.01 | 4.5 | PASS |
| Dark | `--wr-color-text-primary` | `--wr-color-bg-app` | 16.96 | 4.5 | PASS |
| Dark | `--wr-color-text-primary` | `--wr-color-surface-canvas` | 15.47 | 4.5 | PASS |
| Dark | `--wr-color-text-secondary` | `--wr-color-surface-panel` | 9.89 | 4.5 | PASS |
| Dark | `--wr-color-text-muted` | `--wr-color-surface-panel` | 6.92 | 4.5 | PASS |
| Dark | `--wr-color-text-inverse` | `--wr-color-accent` | 5.17 | 4.5 | PASS |
| Dark | `--wr-color-focus-ring` | `--wr-color-bg-app` | 9.84 | 3.0 | PASS |
| Dark | `--wr-color-focus-ring` | `--wr-color-surface-canvas` | 8.98 | 3.0 | PASS |
| Dark | success foreground | success background | 11.35 | 4.5 | PASS |
| Dark | warning foreground | warning background | 11.45 | 4.5 | PASS |
| Dark | error foreground | error background | 10.96 | 4.5 | PASS |
| Dark | info foreground | info background | 10.34 | 4.5 | PASS |

Failed pairs: `NONE`.

Minimum measured ratio: `5.17:1`.

## Historical VL-01 GREEN assertion

This records the ownership assertion run for the initial VL-01 commit, before
the independent-review correction. The command was identical to the RED
assertion above and its result remains historical evidence; its prohibition on
primitive references in `themes.css` cannot validate the required
primitive-to-semantic linkage and is superseded for the corrective diff by the
linkage assertion below. Declaration ownership remains unchanged:
`tokens.css` declares primitives, while `themes.css` declares semantic roles.

- Assertion exit code: `0`.
- Base HEAD: `ee2ca21d4939375d631d8317b2f4c226e44226b3`.
- Checked: both files exist; primitive and component aliases are in
  `tokens.css`; colour/shadow semantics and `--el-*` mapping are in
  `themes.css`; forbidden cross-layer names are absent.
- First GREEN timestamp: `2026-07-28T05:18:20Z`.
- Final identical GREEN after live mapping correction and evidence creation:
  exit `0` at `2026-07-28T05:32:12Z`.

## Independent review corrective pass

Review status before correction: `CHANGES REQUESTED`.

### Finding

- Primitive colour and shadow scales existed in `tokens.css`.
- Semantic theme roles used independent raw colour and shadow values, so the
  primitive layer was not the actual source from which themes were built.
- Components could not consume primitives directly, while Element Plus mapped
  only from semantic roles; the missing primitive-to-semantic edge therefore
  left much of the first layer unused.
- `--wr-editor-left-panel-width` and
  `--wr-editor-right-panel-width` contained direct `285px` and `340px`
  literals.

The pre-correction linkage assertion failed as expected with exit `1` at
`2026-07-28T06:47:09Z` on source
`25ec98971a3d09b7ee833751e95692fa5aa5012c`.

### Correction

- Corrective allowlist: `tokens.css`, `themes.css`, and this acceptance
  evidence document; no other path changed.
- Every semantic colour role now references a primitive colour token.
- Every semantic shadow role now references a primitive shadow token.
- Masks derive their base colour from space-separated primitive RGB
  companions and retain only the semantic alpha composition.
- The previously unused `--wr-primitive-neutral-950` was normalized from
  `#0b0f14` to the approved dark-mask base `#020617`, allowing its new RGB
  companion to represent the same colour; no pre-correction consumer or
  rendered value changed.
- Accent and status RGB companions use the comma-separated representation
  required by Element Plus and represent the exact same primitive colours.
- Element Plus still maps only from semantic Writers Room roles and shared
  non-colour roles; it never maps directly from a primitive.
- Left and right panel aliases now reference shared default-width layout roles
  while preserving `285px` and `340px`.
- All 82 light/dark semantic computed values and 14 key Element Plus computed
  values remain equivalent to the pre-correction values.
- No feature component, application behavior, or dependency changed.
- VL-02 started: `NO`.
- Premium Polish started: `NO`.

### Primitive-to-semantic linkage assertion

A one-off Python heredoc checked primitive colour and shadow families,
primitive consumption by semantic roles, light/dark role parity, absence of
raw semantic hex/shadow values, absence of direct Element Plus-to-primitive
mapping, shared sidebar-width roles, alias indirection, prohibited CSS
constructs, and consumer coverage for every primitive added by the corrective
diff.

- Exit code: `0`.
- Final timestamp: `2026-07-28T07:01:09Z`.
- Source: `25ec98971a3d09b7ee833751e95692fa5aa5012c` plus the corrective
  three-file working diff.
- Primitive colour families present: `PASS`.
- Primitive shadow families present: `PASS`.
- Semantic layer consumes primitives: `PASS`.
- Light/dark role parity: `PASS` — 41 roles in each.
- Raw non-RGB semantic hex values: `NONE`.
- Raw semantic shadow definitions: `NONE`.
- Element Plus direct primitive mappings: `NONE`.
- New primitives without consumers: `NONE` — 31/31 have consumers.
- Direct component-alias width literals: `NONE`.
- Shared left/right default-width roles: `PASS`.
- Computed-value equivalence: `PASS`.

## Static scans

Scans were run over `frontend/src/renderer/src/assets` after migration.

| Scan | Migrated-assets result | Explanation |
|---|---|---|
| `transition:\s*all` | No matches | The inherited global input transition was removed |
| `shadow-premium` | No matches | Unused legacy definition removed |
| `!important` | No matches | Global selector overrides replaced by variables |
| `linear-gradient` | No matches | Unused legacy gradient definition removed |
| `backdrop-filter` | No matches | Unused `.glass` definition removed |
| `.glass` | No matches | No renderer consumer existed |

No new transition-all, `!important`, glass, gradient, blur, or decorative
animation was introduced. Out-of-allowlist component-local matches found by
the inventory were not changed in VL-01.

## Screenshot evidence

Workflow: existing `npm run dev:web` browser path with an isolated browser
session and a fresh SQLite database under `/tmp`. Fixture: synthetic empty
dashboard with no user project, prose, credential, provider payload, or private
database content. Viewport: exactly `1440 × 900`.

| Path | Phase | Theme | Viewport | Fixture | Source |
|---|---|---|---|---|---|
| `/tmp/writers-room-vl01-before-light.png` | Before | Light | 1440 × 900 | Synthetic empty dashboard | `ee2ca21d4939375d631d8317b2f4c226e44226b3` |
| `/tmp/writers-room-vl01-before-dark.png` | Before | Dark | 1440 × 900 | Synthetic empty dashboard | `ee2ca21d4939375d631d8317b2f4c226e44226b3` |
| `/tmp/writers-room-vl01-after-light.png` | Corrected after | Light | 1440 × 900 | Same synthetic empty dashboard | `25ec98971a3d09b7ee833751e95692fa5aa5012c` + corrective three-file diff |
| `/tmp/writers-room-vl01-after-dark.png` | Corrected after | Dark | 1440 × 900 | Same synthetic empty dashboard | `25ec98971a3d09b7ee833751e95692fa5aa5012c` + corrective three-file diff |

Observed in the after workflow:

- application rendered after the stylesheet import-order change;
- theme toggle changed `html.dark` and persisted across reload;
- light and dark central `--el-*` mappings resolved to Writers Room roles;
- corrective primitive linkage resolved to the same approved semantic and
  Element Plus computed values;
- surface hierarchy was equivalent;
- document width and client width were both 1440 px;
- browser console error/warning list was empty.

The corrected AFTER screenshots were recreated at
`2026-07-28T06:53:56Z` and `2026-07-28T06:54:35Z`. Private data captured:
`NO`. Screenshots are outside Git.

## Shared verification gate

The exact fail-closed Shared verification contract from the VL-00 plan was run
unchanged on the VL-01 working tree with `set -euo pipefail`, `EXIT` cleanup,
and `INT`/`TERM`/`HUP` routed through cleanup.

| Gate | Result |
|---|---|
| Frontend full suite | PASS — 5 files, 25 tests |
| Typecheck | PASS — node and web |
| Production web bundle | PASS — Vite build completed |
| Python 3.11 | PASS — `/opt/homebrew/bin/python3.11`, version 3.11.15 |
| Ephemeral uv environment | PASS — created outside repo |
| Temporary SQLite | PASS — fresh explicit path under `/tmp`, never `/data/novelforge.db` |
| Backend suite | PASS — 35 tests |
| Pydantic warning gate | PASS — no `PydanticDeprecatedSince20` warning |
| Upstream verification | PASS — frozen baseline and AGPL notice |
| `git diff --check` | PASS |
| Cleanup after PASS | PASS — gate environment and database removed |
| Cleanup after FAIL | NOT EXERCISED — structurally covered by the same exit-code-preserving `EXIT` trap |

Observed nonblocking inherited warnings:

- npm reports deprecated underscore-form mirror configuration names;
- Vite reports existing mixed static/dynamic imports and large chunks;
- backend reports one `StarletteDeprecationWarning`, outside the Pydantic
  warning-as-error category.

The corrective-pass mandatory gate exit code was `0` at
`2026-07-28T06:59:08Z`.

## Acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| Four layers explicit, linked, and centrally owned | PASS | Corrective linkage assertion and architecture section |
| Same semantic roles in light/dark | PASS | 41 roles in each theme; empty role-set diff |
| No feature component changed | PASS | Exact diff allowlist |
| No new `transition: all` | PASS | Static scan empty |
| No unexplained `!important` | PASS | Migrated-assets scan empty |
| No new glass | PASS | `.glass` and backdrop scans empty |
| No new gradient | PASS | Gradient scan empty |
| VL-AC-01 | PASS after linkage correction | Primitives feed semantic roles; aliases feed through shared roles; Element Plus consumes semantics |
| VL-AC-02 | PASS | No component changed or given primitive consumption |
| VL-AC-03 | PASS | Matching role sets and equivalent screenshot hierarchy |
| VL-AC-04 | PASS | All 22 measured pairs meet thresholds |
| VL-AC-05 | PASS where applicable | No interactive component migrated; central focus role maps to Element Plus |
| VL-AC-06 | PASS where applicable | No component motion migrated or decorative motion added |
| VL-AC-07 | PASS | No `transition: all` in migrated assets |
| VL-AC-08 | PASS | No `!important` in migrated assets |
| VL-AC-09 | PASS | Every new Element Plus override is in `themes.css` |
| VL-AC-28 | PASS | Frontend, typecheck, build, backend, upstream, and diff gates passed |
| VL-AC-29 | PASS | No dependency or lockfile change |

VL-02 declared: `NO`.

Premium Polish declared: `NO`.

Merge approval declared: `NO`.
