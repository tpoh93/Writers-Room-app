# DOGFOOD-01 — redaction-safe acceptance evidence

Status: completed against the isolated synthetic fixture; normal-stack health was checked without reading user content.

## Safety gate

- A fresh local database backup was created before private use. Its contents were never inspected.
- Normal runtime health and the disabled acceptance-only fault endpoint were verified before the session.
- Reproduction and runtime verification used only `writer-ready-fixture` data. The separate Test Interfejsu project was excluded.

## Material findings and fixes

| Severity | Finding | Resolution | Evidence |
| --- | --- | --- | --- |
| BLOCKER privacy | Workflow/editor diagnostic logs could emit workflow code, node values, SSE payloads, assistant structures, IPC arguments, and raw errors. | Removed content-bearing browser logging; workflow failure UI now uses safe generic messages. Stream handling retains only application callbacks and no diagnostic payloads. | Synthetic success/error marker regression; fixture console review reports no console messages. |
| MAJOR | Built-in card types, template labels, schema titles/descriptions, relation kinds, and stances could expose canonical Chinese values. | Added explicit display-only mappings in their respective UI surfaces; raw values, schema keys, IDs, and author content remain unchanged. | Localization regression tests and fixture workflow/project dialog review. |
| MAJOR | Prompt collection calls followed a slash redirect that could lose the local development port and surface a network error. | Use canonical trailing-slash collection endpoints. | API regression test and fixture request to `/api/prompts/` returned 200. |
| MAJOR | `__free__` and workflow header/category layout exposed technical labels or collided visually. | Added contextual display name and responsive truncation/spacing. | Fixture accessibility snapshot confirmed separate workflow header texts and Polish display copy. |

## Verification

- `npm --prefix frontend run typecheck` — pass.
- `npm --prefix frontend test` — 18 files, 99 tests pass.
- Isolated fixture rebuild and `verify-writer-ready` — pass.
- Browser runtime review at the fixture URL: Polish workflow labels rendered, `/api/prompts/` returned 200, and no browser console messages were present after reload.

## Limits

- No private prose, payload, screenshot, or marker value is included in this record.
- Pixel-level screenshot export was unavailable in the browser tooling, so this evidence relies on runtime accessibility snapshots and test/runtime results.
- The visible sample-node category remains a minor product-content follow-up; it was not expanded within DOGFOOD-01.

## Context preview contract

- The default **Podgląd kontekstu** is an author-facing Polish summary. It explains which context sections and excerpts will be used, while rendering author content without rewriting it.
- The default view never exposes template syntax, JSON paths, internal IDs, or transport-only field names. It is a presentation layer over the same assembled context; switching views must not alter the context sent to the model or workflow execution.
- **Widok techniczny** is a separate, collapsed-by-default diagnostic disclosure. It is visually distinct, scrollable for long content, and is the only place where raw template syntax and technical keys may be shown.
- Rendering either view is local UI work only: it adds no content-bearing logging or requests. Both views wrap long text safely and retain vertical scrolling on narrow viewports.
