# Stabilization Closure 1.1

Status: `READY FOR REVIEW`

Base:
`5deace267b80a7eb2bdddacc633ae01d01f0f166`

Frozen upstream baseline:
`ca7ca584580df0220a6a0d008309e5575b3dc449`

Closure revision: the closure commit containing this document. Its exact SHA
is recorded in the final Attempt 2 report rather than in the commit itself.

## Attempt 1 — BLOCKED

Attempt 1 correctly ended as `BLOCKED`. Its initial full-backend invocation
inherited `NOVELFORGE_DB_PATH=/data/novelforge.db` from the ignored root
`.env`. That container-only path was unavailable locally, so two health tests
failed with `unable to open database file`. This was an environmental failure,
not an application regression.

A controlled temporary-database rerun subsequently passed all 35 tests, but
the mandatory-gate policy preserved the first failure. Attempt 1 therefore
created no commit and performed no push.

## Attempt 2 — controlled verification

Attempt 2 resumed the same working tree without reset, stash, or discarded
changes. Every backend invocation used Python 3.11.15 from a fresh external
`uv` environment and a new explicit SQLite path under `/tmp`; none inherited
the root `.env` database path.

All pre-commit gates listed below passed. The current closure status is
`READY FOR REVIEW`. Post-commit verification and the final commit SHA are
reported by the final Attempt 2 task report because this document cannot
contain the SHA of its own commit.

## Reason and privacy contract

A post-merge review found that a generic exception from the text provider
crossed the model invocation boundary without normalization. Its text could
then reach workflow logs, node error persistence, and SSE/API output.

The closure introduces two explicit internal domain errors:

- `provider_timeout` / `Provider timeout`;
- `provider_error` / `Provider request failed`.

Only exceptions raised while building the provider model or invoking it are
normalized. Cancellation and post-response validation keep their existing
behavior. The conversion uses `from None`; the source exception is not logged
before conversion. The sanitizer returns only the fixed code and message and
does not inspect exception text, arguments, attributes, cause, context,
traceback, payload, or content hashes.

`AsyncExecutor`, `ErrorHandler`, `RunManager`, and the workflow endpoint
special-case only those two domain types. Persistent and external structures
contain only the stable code, stable message, and existing non-secret technical
identifiers. Other exception paths remain functionally unchanged.

## Changed files

- provider error contract and the direct `generate_review` boundary;
- workflow executor, error handler, run manager, and streaming endpoint;
- workflow/provider privacy and timeout regressions;
- Stabilization Sprint 1 acceptance records.

No frontend, workflow definition, Visual Language, dependency manifest, or
lockfile is changed.

## Regression evidence

The focused Python 3.11 suite reports `5 passed`. Its generic-provider scenario
executes the real `Thinking p*rn` workflow with successful Kimi output, a
generic Grok provider failure, and no Aion execution.

The synthetic private marker remains confined to test code and is negatively
asserted across:

- captured application logs and emitted logger traceback;
- `WorkflowRun.error_json`;
- persisted node `error_message`;
- every serialized SSE/API event.

The run ends as `failed`, the node and run persistence use
`Provider request failed`, and the client receives `code=provider_error`.
The timeout regression still ends as `timeout` with
`code=provider_timeout`. The existing frontend regression confirms that a run
error keeps acceptance disabled.

## Attempt 2 pre-commit verification results

- Python: `/opt/homebrew/bin/python3.11`, version `3.11.15`;
- environment: ephemeral `uv` environment plus an isolated SQLite database
  under `/tmp`; no repository virtual environment;
- controlled backend suite: `35 passed`;
- Pydantic deprecation gate: `PASS`, zero Pydantic warnings;
- known external warning: one `StarletteDeprecationWarning`;
- restore recovery: `PASS`;
- frozen upstream verification: `PASS`;
- local exposure: `PASS`;
- OpenRouter credential-shape scan: `PASS`;
- private marker outside tests: `PASS`;
- frontend: `5` files and `25` tests passed;
- frontend typecheck: `PASS`;
- frontend production web build: `PASS`;
- diff check before documentation: `PASS`.

The build retains the existing mixed static/dynamic import and chunk-size
warnings. No frontend source was changed.

## Dependency triage

`npm audit --json` was analyzed from a temporary file and removed. No
dependency changes were made. The current totals are `1 critical`, `42 high`,
`8 moderate`, and `4 low`.

The sole critical finding is transitive `tar` in the development/build-only
`electron-builder` chain. Exploitation requires processing a crafted archive
through that tooling, and the available remediation requires the major upgrade
to `electron-builder@26.15.3`. It is not a confirmed production-runtime path:
`ACCEPT_TEMPORARILY` and track separately.

High findings:

- production-direct or runtime-relevant: `axios`, `electron-updater`,
  `lodash-es`, and the packaged Electron runtime; `TRACK`;
- production-transitive or requiring reachability follow-up:
  `builder-util-runtime`, `form-data`, `immutable`, `js-yaml`, `linkify-it`,
  `lodash`, and `@xmldom/xmldom`; `TRACK`;
- install/build-only in the current application path: `tar-fs`, `postcss`,
  `rollup`, `picomatch`, `@isaacs/brace-expansion`, `brace-expansion`,
  `flatted`, and the `electron-builder`/archive/node-gyp dependency chains;
  `ACCEPT_TEMPORARILY`;
- direct development findings: `electron-builder`, `vite`, and
  `@vue/test-utils`; `ACCEPT_TEMPORARILY`;
- peer-resolution warning: Vue 2 requested by transitive `vue-frag` while the
  application uses Vue 3; `TRACK`.

The remaining named high transitive build-chain packages are
`@electron/asar`, `@electron/rebuild`, `@electron/universal`,
`@npmcli/move-file`, `app-builder-lib`, `archiver`, `archiver-utils`,
`builder-util`, `cacache`, `dmg-builder`, `editorconfig`,
`electron-builder-squirrel-windows`, `electron-publish`, `glob`,
`js-beautify`, `make-fetch-happen`, `minimatch`, `node-gyp`, `rimraf`, `tmp`,
and `zip-stream`.

Source review found no import of `electron-updater`; current update checks use
browser `fetch`. The application uses only `set`, `get`, `debounce`,
`cloneDeep`, and `isEqual` from `lodash-es`, not the vulnerable `unset`,
`omit`, or `template` APIs. Axios is used by the renderer for local API calls;
the audited Node-adapter and attacker-controlled configuration paths are not
confirmed in that flow. `linkify-it` processes renderer text and therefore
retains a possible algorithmic-DoS reachability requiring separate dependency
work. No confirmed production-reachable critical blocker was found.

## Closure decision

Attempt 1 remains recorded as `BLOCKED` for its inherited environmental
database failure. Attempt 2 isolates every backend invocation from that
environment and passes the focused regression, full backend, frontend,
recovery, upstream, exposure, credential, marker, scope, allowlist, and diff
gates before commit. The closure is `READY FOR REVIEW`; Visual Language remains
unstarted.
