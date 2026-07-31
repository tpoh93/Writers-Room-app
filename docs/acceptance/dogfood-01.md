# DOGFOOD-01 — redaction-safe acceptance evidence

Status: remediation verified against the isolated synthetic fixture; no user content was opened.

## Safety gate

- A fresh local database backup was created before private use. Its contents were never inspected.
- Normal runtime health and the disabled acceptance-only fault endpoint were verified before the session.
- Reproduction and runtime verification used only `writer-ready-fixture` data. The separate Test Interfejsu project was excluded.

## Material findings and fixes

| Severity | Finding | Resolution | Evidence |
| --- | --- | --- | --- |
| BLOCKER privacy | Workflow/editor diagnostic logs could emit workflow code, node values, SSE payloads, prompts, responses, IPC arguments, and raw errors. | Removed content-bearing browser logging and made workflow state/SSE error messages generic; log redaction now covers execution, retry, resume, triggers, generation and IPC paths. | Frontend source regression, backend source regression, and 55 backend tests with synthetic privacy markers. |
| MAJOR | Context preview was not rendering the author-facing projection and could make empty facts ambiguous. | Render `authorPreview.sections`, show the Polish no-facts state when empty, and leave the technical disclosure collapsed. | Component regression and fixture DOM snapshot. |
| MAJOR | Built-in workflow, prompt and node labels could expose canonical CJK/technical values. | Added display-only maps for built-ins while preserving persisted names, IDs, schema keys and author-entered values. | Localization regression and fixture workflow snapshot. |
| MAJOR | Knowledge collection calls followed a slash redirect that could lose the local development port and surface a network error. | Use canonical trailing-slash collection endpoints. | API regression test. |
| MAJOR | AI controls and right-panel tabs could clip on narrow desktop widths. | Toolbar/status controls wrap; right tabs expose horizontal scrolling instead of hidden overflow. | Real screenshots and DOM measurements at 1440×900, 1280×800, 1024×768 and 768×900. |
| MAJOR | The default parallel Vitest invocation relied on Node process `localStorage`, which is unavailable or shared across workers. | Each jsdom test environment installs an isolated in-memory `Storage` implementation. | Default parallel `npm test`: 22 files, 107 tests pass. |

## Verification

- `npm --prefix frontend run typecheck:web` — pass.
- `npm --prefix frontend test` — 22 files, 107 tests pass in the default parallel configuration.
- `python3 -m py_compile` for touched backend modules — pass.
- Backend suite in a one-shot read-only container with a temporary database — 55 passed.
- Isolated fixture rebuild, synthetic seed and `verify-writer-ready` — pass.
- Browser runtime review: Polish workflow labels rendered; the no-facts context state is visible and `Widok techniczny` is collapsed by default; the missing-model alert was traced to the deliberately unconfigured synthetic fixture.
- Layout DOM results: document `scrollWidth === clientWidth` for all four required viewports; the 768 px AI status strip has equal `scrollWidth`/`clientWidth`; right tabs have explicit usable `overflow-x: auto`.

## Limits

- No private prose, payload, screenshot, or marker value is included in this record.
- Screenshots are stored outside the repository evidence tree and contain only the synthetic fixture.
- The `npm` configuration warnings and backend dependency deprecation warnings are non-blocking environment follow-ups.

## Context preview contract

- The default **Podgląd kontekstu** is an author-facing Polish summary. It explains which context sections and excerpts will be used, while rendering author content without rewriting it.
- The default view never exposes template syntax, JSON paths, internal IDs, or transport-only field names. It is a presentation layer over the same assembled context; switching views must not alter the context sent to the model or workflow execution.
- **Widok techniczny** is a separate, collapsed-by-default diagnostic disclosure. It is visually distinct, scrollable for long content, and is the only place where raw template syntax and technical keys may be shown.
- Rendering either view is local UI work only: it adds no content-bearing logging or requests. Both views wrap long text safely and retain vertical scrolling on narrow viewports.
