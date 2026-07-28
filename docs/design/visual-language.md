# Writers Room Visual Language

Status: VL-00 implementation contract
Applies to: future VL-01 through VL-06 work
Baseline: `0b1479a032a40bb2d27f55dc3ccca35119609da7`

## 1. Purpose

Visual Language is the shared contract for how Writers Room expresses hierarchy,
workspace density, interaction state, and theme across the existing Vue 3 and
Element Plus interface. It gives future implementation waves a small token
system, explicit surface rules, responsive modes, and testable boundaries.

Visual Language is not a redesign of application behavior, a localization
project, or a collection of decorative effects. It must not change persistence,
editor commands, selection safety, workflow execution, provider handling,
navigation, or the local-first deployment model.

The relationship between stages is:

- Foundation established the local-first, private, web-canonical product and
  the safe selected-text workflow.
- Stabilization made persistence and provider failure paths durable and safe.
- Visual Language makes the existing product coherent and legible without
  changing those contracts.
- Premium Polish may later refine delight and finish after the Visual Language
  system is complete and accepted.

## 2. Product character

Writers Room follows five concrete character rules:

1. **Quiet for long sessions.** Writing surfaces use stable contrast, restrained
   accent, and low visual noise so the interface can stay open for hours.
2. **Dense but scannable.** Multi-panel workspaces may be compact, but headings,
   grouping, spacing rhythm, and state labels must keep dense information
   readable.
3. **Local and private in feel.** The interface should feel like a dependable
   personal instrument, not a public social feed, marketplace, or growth
   dashboard.
4. **Functional before decorative.** Decoration may reinforce hierarchy or
   state; it may not compete with prose, controls, or system feedback.
5. **Equivalent in light and dark.** Theme changes preserve hierarchy,
   affordances, state meaning, and comfortable contrast rather than merely
   inverting colours.

## 3. Design principles

### Hierarchy before decoration

Use position, spacing, typography, and surface contrast before shadows,
gradients, blur, or animation. A user should understand the primary action,
active workspace, and current system state without decorative cues.

### Semantic colour before literal colour

Components consume semantic roles such as `text-primary`, `surface-panel`, or
`status-error`, never raw blue, gray, red, or a numbered Element Plus shade
unless the value is being defined in the central mapping layer.

### Restrained elevation

Elevation distinguishes overlays, dialogs, floating status, and intentionally
raised panels. Ordinary nested cards use borders or surface contrast, not a
stack of competing shadows.

### Workspace density with readable rhythm

Compact controls and panels are allowed where they increase useful workspace.
Density must preserve readable line height, visible group boundaries, and
minimum target sizes. Dense does not mean compressed prose.

### Visible system state

Loading, running, paused, offline, conflict, timeout, and error states must be
visible near the affected scope. A transient toast cannot be the only record of
a blocking state.

### Motion only when functional

Motion may explain a state change, panel transition, progress, or focus move.
Animate named properties only. `transition: all` is prohibited in migrated
styles. Reduced-motion preferences must disable nonessential movement.

### Accessibility and keyboard clarity

Keyboard focus, selection, disabled state, and readonly state must remain
distinguishable in both themes. Status is never communicated by colour alone.

### No hidden behavior changes

Visual migrations preserve event handlers, data flow, keyboard commands,
workflow semantics, editor transactions, API payloads, and persistence. A
behavior change requires a separate product task.

## 4. Token architecture

The target system has four layers. New component styles must not skip from a
component directly to a primitive value.

### A. Primitives

Primitives are the small reusable scales from which themes are built. They are
not used directly by feature components.

| Category | Minimal core |
|---|---|
| Colour | neutral scale, one accent scale, success, warning, error, info |
| Typography | UI sans family, writing family alias, mono family; 12, 13, 14, 16, 20, 24 px steps; regular, medium, semibold |
| Spacing | 0, 2, 4, 6, 8, 12, 16, 20, 24, 32 px |
| Radius | 0, 4, 6, 8, 12 px, pill |
| Border | 1 px default, 2 px emphasis/focus |
| Shadow | none, low, overlay, dialog |
| Motion | instant, fast, standard; standard and emphasized easing |
| Control size | compact 28, default 32, comfortable 40, minimum target 40 px |
| Layout | header 60 px, panel minima, readable canvas range, dialog gutters |

Primitive names use the `--wr-primitive-*` prefix. The colour scale should be
small enough to review visually and by contrast measurement; it is not a
general-purpose palette.

### B. Semantic tokens

Semantic tokens are theme-specific roles consumed by surfaces:

- `--wr-color-bg-app`
- `--wr-color-surface-canvas`
- `--wr-color-surface-panel`
- `--wr-color-surface-raised`
- `--wr-color-surface-overlay`
- `--wr-color-text-primary`
- `--wr-color-text-secondary`
- `--wr-color-text-muted`
- `--wr-color-text-inverse`
- `--wr-color-border-default`
- `--wr-color-border-strong`
- `--wr-color-focus-ring`
- `--wr-color-accent`
- `--wr-color-accent-subtle`
- `--wr-color-selection`
- `--wr-color-status-success`
- `--wr-color-status-warning`
- `--wr-color-status-error`
- `--wr-color-status-info`
- `--wr-shadow-panel`
- `--wr-shadow-overlay`
- `--wr-shadow-dialog`
- semantic typography, spacing, motion, and z-index roles.

Status roles include foreground, subtle background, and border variants derived
from the same semantic family. Components must not infer state from a palette
index.

### C. Component aliases

Component aliases translate semantic roles into stable component contracts
only where a component needs a meaningful specialization. Examples:

- `--wr-header-height`
- `--wr-editor-left-panel-width`
- `--wr-editor-right-panel-width`
- `--wr-editor-canvas-min-width`
- `--wr-dialog-max-width`
- `--wr-card-padding`
- `--wr-control-height`
- `--wr-resizer-hit-area`
- `--wr-statusbar-z`

Aliases must earn their existence through repeated use or a stable surface
contract. One-off literal values are not automatically promoted to tokens.

### D. Element Plus mapping

One central theme file maps Writers Room semantic tokens to supported `--el-*`
variables. Feature components consume Writers Room roles or standard Element
Plus roles; they do not recreate theme palettes.

The central mapping covers at least:

- primary and status colours;
- page, base, overlay, and fill backgrounds;
- primary, regular, secondary, placeholder, and disabled text;
- border tiers;
- focus and control states;
- mask/overlay;
- border radius;
- component size where Element Plus exposes a stable variable.

The existing Element Plus dark CSS variable import remains the foundation.
Writers Room overrides load after it. This matches current Element Plus
guidance: dark mode is driven by CSS variables under `html.dark`, and custom
variables must load after the library dark-variable stylesheet.

### Supporting scales

The semantic system also defines:

- **Elevation:** `base`, `sticky`, `dropdown`, `floating-status`, `overlay`,
  `dialog`, `critical-modal`.
- **Z-index:** a documented ordered scale rather than isolated values such as
  `1`, `10`, `30`, and `2000`.
- **Breakpoints:** `wide`, `standard`, `narrow`, and `minimum`.
- **Layout dimensions:** header, sidebars, canvas minimum and maximum readable
  width, dialog maximum, and safe viewport gutter.

## 5. Light and dark themes

### Shared values

Typography, spacing, control sizes, layout dimensions, radius, motion duration,
breakpoints, and z-index are shared. The meaning and order of surfaces are also
shared.

### Separately mapped values

Backgrounds, text tiers, borders, shadows, selection, focus, accent variants,
status variants, masks, and editor canvas colours are mapped independently for
light and dark.

### Contrast rules

- Body-size text targets WCAG AA contrast of at least 4.5:1.
- Large text and essential graphical controls target at least 3:1.
- Focus indicators target at least 3:1 against adjacent colours.
- Muted text may be visually quieter but must remain readable at its actual
  rendered size.
- Disabled state may reduce contrast only when the control is also
  programmatically disabled and distinguishable by more than colour.

### Surface hierarchy

From lowest to highest:

1. app background;
2. editor or content canvas;
3. panel;
4. raised/sticky panel;
5. dropdown/popover;
6. dialog;
7. blocking overlay.

Light mode uses subtle luminance and border separation. Dark mode avoids pure
black stacks and distinguishes adjacent surfaces without relying on heavy
shadows.

### Theme roles

- **Accent:** one restrained primary action and focus family. Accent is not a
  decoration applied to every card.
- **Text tiers:** primary for content, secondary for supporting labels, muted
  for nonessential metadata, inverse only on verified inverse surfaces.
- **Borders:** default for ordinary separation, strong for selected or active
  boundaries, focus ring for keyboard focus.
- **States:** success, warning, error, and info each use icon/text plus colour.
- **Selection:** clear in both themes and distinct from hover and focus.
- **Editor canvas:** quieter and more readable than navigation panels.
- **Panels:** subordinate to the writing canvas unless a blocking state is
  active.
- **Dialogs:** use overlay contrast and viewport gutters; they do not inherit a
  transparent glass treatment by default.
- **Overlays:** communicate modality and preserve readable underlying context
  without inviting interaction.

## 6. Element Plus strategy

### Central mapping

Global `--el-*` values are set in one theme integration file from Writers Room
semantic tokens. Existing scattered overrides are migrated incrementally; they
are not duplicated during migration.

### Selector rules

- Use standard Element Plus props and variables before CSS selectors.
- Use `:deep()` only inside a component when a documented child element cannot
  be styled through props, slots, or public variables.
- Every `:deep()` rule must be scoped beneath a Writers Room component class
  and record why a public variable or prop is insufficient.
- `!important` is prohibited by default. A temporary use requires a comment
  naming the upstream selector, a removal condition, and a focused regression
  check.
- Do not create global element selectors for a single screen.

### Component contracts

- **Dialog:** responsive max width, safe viewport gutters, scrollable body,
  stable title and action hierarchy.
- **Form:** aligned labels at standard widths and stacked labels when narrow;
  validation remains adjacent to its field.
- **Input and select:** common control height, focus ring, error state, disabled
  and readonly distinction.
- **Button:** primary action is singular per local action group; destructive
  actions require explicit danger treatment.
- **Tabs:** active state uses more than colour and remains keyboard-visible.
- **Dropdown:** overlay surface, safe edge collision, readable selected and
  disabled items.
- **Message:** transient feedback only; persistent blocking state remains on
  its surface.
- **Tooltip:** supplementary text, never the sole location of required
  instructions or status.

Light and dark mapping must be verified together. A component is not migrated
if it passes in only one theme.

## 7. Layout system

### App shell

The shell owns viewport height, app background, header, primary content
overflow, and global overlays. Exactly one element owns scrolling for each
primary region.

### Header

The header stays 60 px in the default density, has a stable logo/navigation
zone and an action zone, and does not shrink. At narrow widths, lower-priority
labels may collapse before targets become too small.

### Dashboard

The dashboard uses one responsive content gutter and a bounded content width.
Hero, toolbar, empty state, and project grid share the same alignment. Project
card actions cannot depend only on pointer hover.

### Editor workspace

The editor is a writing canvas with optional primary and secondary sidebars:

- primary sidebar: project/card navigation;
- canvas: market, editor, or relationship content;
- secondary sidebar: assistant and contextual tools;
- resizers: explicit hit areas, visual hover/focus state, pointer and keyboard
  operability;
- sidebars never force the canvas below its minimum usable width.

### Content canvas

Long-form prose uses a readable measure. The target maximum is 76 characters
for primary prose and approximately 720–880 px for form/editor surfaces,
depending on the editor implementation. Utility tables and graphs may use the
available width.

### Dialogs

Dialogs use `min(preferred-width, viewport - 2 * gutter)` rather than an
unbounded fixed pixel width. Body content scrolls inside the dialog. Action
groups wrap without changing action order.

### Density

- **Compact:** navigation trees, metadata, status lists, and tool-heavy panels.
- **Comfortable:** writing surfaces, dialogs with prose, forms, and primary
  dashboard content.

Density may change spacing and control height; it does not change information,
permissions, or behavior.

## 8. Responsive behavior

The target modes are:

| Mode | Viewport | Contract |
|---|---:|---|
| Wide desktop | `>= 1440px` | Three editor regions may remain visible with comfortable canvas |
| Standard desktop | `1180–1439px` | Three regions allowed only while canvas minimum is preserved |
| Narrow desktop / tablet-like | `900–1179px` | One sidebar at a time; the other collapses or becomes an overlay |
| Minimum supported | `768–899px` | Canvas is primary; navigation and assistant use controlled overlays |

Below 768 px, the web UI must fail safely: preserve data, avoid destructive
controls being clipped, and present a bounded minimum-width notice or a
documented reduced workspace. Full mobile product design is a non-goal.

### Editor rules

- The canvas minimum usable width is 560 px for structured editing and 480 px
  only for a focused plain-text state.
- The current left sidebar range of 180–400 px and right sidebar range of
  280–500 px become bounded aliases, not independent hardcoded assumptions.
- At standard width, a resizer clamps before the canvas crosses its minimum.
- At narrow width, do not squeeze all three columns. The left navigation
  collapses first when inactive; the right assistant becomes an overlay or
  exclusive panel when opened.
- At minimum width, only the canvas and one explicitly opened supporting panel
  are present.
- Collapsed state is visible and reversible by keyboard and pointer.
- Resizers are disabled when their panel is overlaid and cannot move a panel
  beyond the viewport.
- Each region owns its overflow; the app shell must not gain accidental
  horizontal scrolling.
- Dialogs use viewport gutters and single-column forms where needed.

These rules specify presentation only. They must not change active card,
selection, assistant context, or workflow state.

## 9. State language

Every state has a label, appropriate icon or shape, semantic colour, and
placement at the smallest scope that can explain it.

| State | Presentation contract |
|---|---|
| Loading | Skeleton or bounded spinner with a stable layout; include text when longer than a brief fetch |
| Empty | Explain what is empty and offer one valid next action when one exists |
| Error | Persistent message at the affected scope, recovery action where safe, technical detail only when non-sensitive |
| Provider timeout | Warning/error treatment with fixed safe message `Provider timeout`; retry may be offered without exposing provider detail |
| Conflict | Blocking surface state; explain that source changed and disable destructive apply |
| Success | Confirm completed action without keeping permanent celebratory decoration |
| Disabled | Lower emphasis plus disabled semantics; if reason is not obvious, expose it adjacent to the control |
| Offline/local service unavailable | Global or surface-level connection state; preserve unsaved work and never imply cloud fallback |
| Running | Progress or activity label that remains visible without hover |
| Paused | Explicit paused label and resume affordance only where behavior supports it |
| Cancelled | Terminal neutral state distinct from failure |

State scopes:

- **Global:** local service unavailable, initialization failure, app-wide
  maintenance state.
- **Surface:** dashboard load, editor panel error, workflow run state.
- **Inline:** form validation, field-level error, local disabled reason.
- **Transient notification:** nonblocking confirmation or short-lived notice;
  never the sole carrier of a blocking state.

## 10. Surface contracts

| Surface | Hierarchy | State handling | Responsive requirement | Functional boundary |
|---|---|---|---|---|
| App shell | Header, primary workspace, global overlays | Global loading/error/offline is visible without hiding recoverable content | One viewport owner; no accidental body overflow | No route, lifecycle, update, or store behavior change |
| Header | Identity/navigation first, utilities second | Active destination and update state remain visible | Labels collapse before targets; actions remain reachable | No navigation or theme behavior change |
| Dashboard | Page title/action, toolbar, grid/empty state | Load, empty, fetch failure, and delete confirmation are distinct | Shared gutter; toolbar stacks; cards retain actions without hover dependency | No project query, sort, create, edit, delete, or selection change |
| Project card | Title, description, secondary actions | Hover, focus, selected, disabled, destructive action | Grid adapts; text truncates with accessible full name | No project data or click-target semantics change |
| Editor | Canvas primary; navigation and assistant supporting | Empty selection, load, save/error, and panel state stay local | Never squeeze three columns; enforce canvas minimum | No card tree, editor transaction, drag/drop, context, or assistant behavior change |
| Thinking p*rn | Setup, step states, outputs, comparison, decision | Conflict/error/timeout blocks apply; prior outputs remain visible | Three model fields and comparison stack when narrow; dialog stays in viewport | No workflow definition, SSE contract, retry, accept/reject, or selection safety change |
| WorkflowStatusBar | Current activity before history | Running, success, failed, timeout, paused, cancelled and empty are named | Floating control remains reachable and cannot leave viewport | No run tracking, clearing, dragging, or store behavior change |
| Settings/forms | Section title, fields, validation, actions | Inline validation; save result persists at form scope | Labels stack and actions wrap without reordering | No settings schema, provider config, or persistence change |
| Cards and writing surfaces | Prose/content first, metadata and tools second | Save, dirty, readonly, empty, validation, AI operation states | Readable measure and safe overflow | No schema, content, selection, or AI invocation change |

## 11. Accessibility

- Every interactive element has a visible `:focus-visible` treatment in light
  and dark themes.
- Keyboard order follows visual order; overlays trap and restore focus using
  established Element Plus behavior.
- Resizers and collapsible panels require keyboard-operable alternatives before
  their migration is accepted.
- Text and essential controls meet the contrast targets in section 5.
- `prefers-reduced-motion: reduce` removes decorative transitions, pulsing, and
  transform movement while preserving state changes.
- Disabled and readonly are visually and semantically distinct.
- Primary pointer targets are at least 40 by 40 px. Dense row actions may use a
  smaller visible icon only when the interactive hit area remains at least
  32 px and has sufficient separation.
- Status includes text or icon/shape; colour is redundant.
- At 200% text zoom, primary actions, state messages, and dialog dismissal do
  not clip or overlap.
- Long names, translated labels, provider messages, and private prose wrap or
  truncate safely without forcing page-level horizontal overflow.
- Hover-only actions gain focus-visible and non-hover discoverability.

## 12. Premium Polish boundary

Visual Language explicitly excludes:

- decorative animation;
- effects whose only purpose is “wow”;
- repeated or excessive glassmorphism;
- custom illustrations;
- microinteractions without functional value;
- perfectionist tuning of a single screen before shared contracts exist.

Premium Polish may later consider refined transitions, distinctive
illustration, authored empty states, richer project-card identity, nuanced
microinteractions, and screen-specific finish. It starts only after VL-06 has
accepted tokens, themes, state language, layout, responsive behavior, and
accessibility across representative surfaces.

Existing gradients, blur, `shadow-premium`, and status flashing are migration
inputs, not endorsement. Visual Language either removes them or retains a
minimal instance only when it serves hierarchy or state.

## 13. Migration strategy

1. **VL-01 Tokens and themes:** introduce the four-layer token architecture and
   map light/dark semantics without changing component behavior.
2. **VL-02 Element Plus and base states:** centralize supported `--el-*`
   mappings, base focus, controls, dialogs, messages, loading, empty, disabled,
   and reduced motion.
3. **VL-03 App shell, header and dashboard:** migrate the shell and first
   end-to-end surface using the accepted tokens and responsive rules.
4. **VL-04 Editor workspace:** migrate layout boundaries and panels in narrow
   slices without refactoring `Editor.vue` logic.
5. **VL-05 Thinking p*rn and workflow states:** migrate presentation only while
   preserving workflow, privacy, retry, conflict, and acceptance contracts.
6. **VL-06 Responsive and acceptance QA:** verify themes, widths, keyboard,
   zoom, reduced motion, state fixtures, and screenshot evidence across all
   migrated surfaces.

Each wave is a separate logical commit or pull request and keeps frontend and
backend gates green.

## 14. Non-goals

- backend changes;
- workflow behavior changes;
- full localization;
- dependency or lockfile upgrades;
- giant component refactors;
- Storybook;
- automated pixel regression;
- Playwright, Vitest Browser Mode, Percy, Chromatic, or another new visual
  testing dependency;
- public networking, authentication, multi-user isolation, Postgres,
  Kubernetes, or SaaS;
- Premium Polish.

## 15. Acceptance criteria

The Visual Language program is accepted only when all applicable criteria pass:

1. **VL-AC-01:** One reviewed source defines primitives, semantic tokens,
   component aliases, and Element Plus mappings.
2. **VL-AC-02:** Feature components do not consume new primitive colour values
   directly.
3. **VL-AC-03:** Light and dark themes preserve the same surface hierarchy.
4. **VL-AC-04:** Body text, essential controls, and focus indicators meet the
   contrast targets in section 5.
5. **VL-AC-05:** Every migrated interactive control has a visible keyboard
   focus state.
6. **VL-AC-06:** Reduced-motion mode removes nonessential animation.
7. **VL-AC-07:** Migrated styles contain no unapproved `transition: all`.
8. **VL-AC-08:** Migrated styles contain no unexplained `!important`.
9. **VL-AC-09:** New Element Plus overrides are centralized or have a documented
   component-local exception.
10. **VL-AC-10:** App shell owns viewport sizing and does not introduce page
    horizontal overflow at supported widths.
11. **VL-AC-11:** Header actions remain reachable at every supported width.
12. **VL-AC-12:** Dashboard loading, empty, populated, and error fixtures have
    distinct visible states.
13. **VL-AC-13:** Project-card actions are reachable with keyboard and without
    relying only on hover.
14. **VL-AC-14:** Editor canvas never falls below its mode-specific minimum.
15. **VL-AC-15:** Three editor columns are not simultaneously compressed in
    narrow and minimum modes.
16. **VL-AC-16:** Editor panel collapse or overlay state is reversible by
    keyboard and pointer.
17. **VL-AC-17:** Editor resizers clamp to documented bounds and do not create
    viewport overflow.
18. **VL-AC-18:** Dialogs fit within the viewport with safe gutters at every
    supported width.
19. **VL-AC-19:** Dialog actions remain in logical order when wrapped.
20. **VL-AC-20:** Loading, empty, error, provider timeout, conflict, success,
    disabled, offline, running, paused, and cancelled have documented fixtures.
21. **VL-AC-21:** No required state is communicated by colour alone.
22. **VL-AC-22:** Blocking errors persist at their affected scope rather than
    existing only as a toast.
23. **VL-AC-23:** Thinking p*rn conflict or run error continues to block apply.
24. **VL-AC-24:** Thinking p*rn workflow definition, SSE contract, retry,
    accepted replacement, and source-safety behavior are unchanged.
25. **VL-AC-25:** WorkflowStatusBar remains reachable, names all terminal
    states, and cannot be dragged outside the usable viewport.
26. **VL-AC-26:** At 200% text zoom, primary actions and blocking messages remain
    readable and operable.
27. **VL-AC-27:** Representative screenshot evidence uses synthetic,
    non-private prose in light and dark themes.
28. **VL-AC-28:** Frontend tests, typecheck, production build, backend suite,
    frozen-upstream verification, and privacy/safety gates remain green for
    every implementation wave.
29. **VL-AC-29:** No Visual Language wave adds a dependency or changes a
    lockfile without a separate approved decision.
30. **VL-AC-30:** VL-06 review finds no Premium Polish work, hidden functional
    change, or file outside the approved per-wave allowlists.
