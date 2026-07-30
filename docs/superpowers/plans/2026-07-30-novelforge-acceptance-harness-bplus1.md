# NovelForge Acceptance Harness B+1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Subagents: OFF. Execute sequentially in the shared worktree because Compose, the metadata contract, and checkpoint review are shared dependencies. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build a safe deterministic acceptance foundation that runs only writer-ready-fixture and proves the repository state used by the running frontend.

**Architecture:** A root Python tool computes metadata before the frontend Docker build. compose.acceptance.yaml, loaded only by the runner with compose.yaml, carries its Base64 JSON as the acceptance-only frontend build argument; a container-only Node tool writes a Vite public asset only when that argument is present. A Bash runner owns fixture Compose calls, fixed constants, bounded readiness, seeder delegation, and served-metadata comparison.

**Tech Stack:** Bash 3.2, Python 3 standard library, Node 22 CJS, Vite 6, Nginx 1.27, Docker Compose v2, curl, Git.

## Global Constraints

- Implement B+1 only. Do not add fault controls, alter WR matrix, begin Task 11/12, run browser QA, or change writer behavior.
- The fixture is only writer-ready-fixture at 127.0.0.1:18080 and http://127.0.0.1:18080.
- Runner always uses compose.yaml plus compose.acceptance.yaml for fixture operations, never operates on writers-room, never invokes stash/reset/clean, and ordinary down never uses -v.
- Runner calls existing scripts/seed-writer-ready-fixture.py and does not copy its HTTP logic.
- Metadata has exactly gitSha, gitBranch, gitDirty, workspaceFingerprint, builtAt, composeProject. It contains no path, username, secret, .env value, file name, or file content.
- Every task ends RED, GREEN, regression and git diff --check. A checkpoint commit is proposed only for a task that creates a nonempty intended diff. Do not commit until authorized.
- Real Compose smoke is final environment gate; it does not replace no-Docker tests.

---

## Repository map and boundaries

| File | Change | Responsibility |
|---|---|---|
| scripts/novelforge-build-meta.py | Create | Produce and compare strict repository build metadata. |
| scripts/novelforge-acceptance.sh | Create | Own fixture commands, Docker/port safety, readiness, seeding, and metadata verification. |
| scripts/tests/test-novelforge-build-meta.sh | Create | Disposable-Git tests of fingerprint and comparison. |
| scripts/tests/test-novelforge-acceptance.sh | Create | Fake Docker/curl/Python runner tests, no Docker daemon. |
| frontend/scripts/write-build-meta.cjs | Create | Decode, validate, and write Vite public metadata during image build. |
| frontend/scripts/__tests__/write-build-meta.test.cjs | Create | Node tests for writer contract. |
| frontend/.gitignore | Modify | Explicitly retain the acceptance metadata writer despite the generic CJS ignore rule. |
| frontend/Dockerfile.web | Modify | Declare build metadata argument and generate asset before Vite. |
| frontend/nginx.conf | Modify | Serve exact metadata URL with no-store and no SPA fallback. |
| compose.acceptance.yaml | Create | Acceptance-only frontend build argument and fixture configuration overlay; it leaves base Compose usable without metadata. |
| scripts/tests/test-build-meta-nginx.sh | Create | Static Nginx contract test. |
| docs/operations/local-compose.md | Modify | Replace manual fixture lifecycle with runner procedure. |
| docs/acceptance/novelforge-acceptance-control.md | Create | Compact canonical control document. |

The Python tool is sole producer and validator of provenance. The Node tool only validates supplied data and never invokes Git. The Bash runner is sole B+1 Compose caller and always supplies both Compose files. The existing seeder remains sole fixture-data creator and verifier. Nginx serves generated static data only. Base compose.yaml remains unchanged and supports normal writers-room build on 8080 without NOVELFORGE_BUILD_META_B64.

## Exact interfaces

~~~
scripts/novelforge-build-meta.py emit
  stdout: one compact UTF-8 JSON object with the six exact keys

scripts/novelforge-build-meta.py emit-base64
  stdout: Base64 encoding of the exact compact emit JSON, plus newline

scripts/novelforge-build-meta.py compare --actual-file PATH
  exit 0: exact schema and gitSha/gitBranch/gitDirty/workspaceFingerprint/composeProject match; builtAt valid UTC
  exit 1: invalid/missing schema or mismatch; stderr names all failing fields

frontend/scripts/write-build-meta.cjs BASE64_JSON OUTPUT_PATH
  exit 0: compact validated JSON written mode 0644
  exit 1: invalid Base64/JSON/schema/type/format/project/output location

scripts/novelforge-acceptance.sh COMMAND
  COMMAND: up | rebuild-frontend | status | ready | seed-writer-ready | verify-writer-ready | metadata | down
  exit 2: invalid command or use error
  exit 69: Docker daemon or socket unavailable
  exit 70: foreign host listener or Compose project owns 18080
  exit 71: readiness deadline elapsed
  exit 72: served metadata invalid or mismatched
  otherwise: preserve child exit status
~~~

Readonly runner constants: compose_project=writer-ready-fixture, bind_address=127.0.0.1, app_port=18080, base_url=http://127.0.0.1:18080, ready_timeout_seconds=90, ready_interval_seconds=2, ids_file under TMPDIR named novelforge-writer-ready-fixture-ids.json. Tests may override only NOVELFORGE_ACCEPTANCE_READY_TIMEOUT_SECONDS and NOVELFORGE_ACCEPTANCE_READY_INTERVAL_SECONDS.

One helper always invokes Compose with APP_BIND_ADDRESS=127.0.0.1, APP_PORT=18080 and docker compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture. NOVELFORGE_BUILD_META_B64 is generated, required, and exported only for up and rebuild-frontend build calls; status, ready, seed-writer-ready, verify-writer-ready, metadata and down do not require it. compose.acceptance.yaml interpolates the build argument as `${NOVELFORGE_BUILD_META_B64:-}` so non-build commands remain valid when the variable is unset. Port preflight runs docker info, then docker ps --filter publish=18080 with project/name format, then lsof -nP -iTCP:18080 -sTCP:LISTEN. An owner labeled writer-ready-fixture is allowed. Empty or non-fixture Compose label is foreign. A listener without a matching writer-ready-fixture container is foreign. Foreign ownership stops up and rebuild-frontend; it never blocks down.

Fingerprint bytes are SHA-256 of prefix novelforge-workspace-fingerprint-v1 followed by exact bytes from git diff --binary HEAD -- followed by sorted raw untracked paths from git ls-files --others --exclude-standard -z. For regular file use path NUL file NUL SHA-256(file bytes) NUL. For symlink use lstat and path NUL symlink NUL SHA-256(os.readlink raw target bytes) NUL; do not open or resolve target. Git normally enumerates regular files and symlinks here; the implementation still fails closed with readable non-zero if a returned path changes type or is neither. Raw path bytes are not decoded for sorting or comparison. gitDirty is true exactly when diff or untracked list is nonempty. builtAt is UTC second precision with Z suffix.

## Task 1: Lock provenance contract and fingerprint generator

**Files:**

- Create: scripts/novelforge-build-meta.py
- Create: scripts/tests/test-novelforge-build-meta.sh

**Interfaces:** Produces emit, emit-base64, compare --actual-file PATH for Tasks 2–4. Consumes Git and Python standard library only.

- [ ] **Step 1: Write failing shell contract test.**

Create test with mktemp -d cleanup. Initialize disposable Git repo; set user.name=fixture and user.email=fixture@example.invalid; commit tracked.txt=alpha; copy generator into bin/. Define run_meta as a subshell that runs python3 bin/novelforge-build-meta.py emit from fixture root.

Assert with python3 that JSON has exactly six keys, 40-hex gitSha, boolean false gitDirty, 64-hex fingerprint, composeProject writer-ready-fixture, and Z timestamp. Capture clean fingerprint. Append beta to tracked.txt and require a different fingerprint plus gitDirty true. Restore tracked file; write scratch.txt=one and require changed fingerprint; rewrite it to two and require a third fingerprint.

Create outside.txt outside the disposable repo with value first, then create untracked link-out pointing to that file. Require a fingerprint different from clean. Change outside.txt to second without changing link-out and require identical fingerprint. Replace link-out with a symlink whose raw target text differs while still pointing outside and require changed fingerprint. The test must assert generator never opens outside.txt, by using a target path made unreadable after link creation and expecting the fingerprint command to continue succeeding. Do not claim empty directories or FIFOs are discoverable through git ls-files --others; Git does not enumerate them as untracked fingerprint entries. Save clean JSON as actual.json and require compare to succeed. Replace workspaceFingerprint by 64 zeroes and require compare exit 1 and stderr field workspaceFingerprint.

- [ ] **Step 2: Run RED.**

Run: bash scripts/tests/test-novelforge-build-meta.sh

Expected: FAIL because generator does not exist.

- [ ] **Step 3: Implement generator.**

Use argparse and subprocess.run argument arrays with root cwd, check=True, stdout/stderr captured. Split untracked names as NUL bytes, sort raw bytes, and inspect each returned entry with os.lstat without decoding. For a regular file hash 64 KiB reads. For a symlink use os.readlink with the bytes path, hash the raw target bytes with a symlink type marker, and never call open, resolve or stat on the target. Fail closed with readable non-zero if a path returned by Git is missing, changes type during inspection, or is neither a regular file nor a symlink. Also reject non-Git root, Git command failure, and undecodable branch. Serialize with json.dumps sort_keys and compact separators.

compare parses supplied file only, rejects nonexact key set, validates UTC timestamp with datetime.fromisoformat after Z replacement, recomputes once, and reports every difference as METADATA_MISMATCH field=<name> expected=<redacted-value> actual=<redacted-value>. It never prints workspace path or source data.

- [ ] **Step 4: Run GREEN and regression.**

Run: bash scripts/tests/test-novelforge-build-meta.sh

Run: python3 scripts/novelforge-build-meta.py emit | python3 -c 'import json,sys; assert set(json.load(sys.stdin)) == {"gitSha","gitBranch","gitDirty","workspaceFingerprint","builtAt","composeProject"}'

Expected: both exit 0.

- [ ] **Step 5: Check and proposed checkpoint.**

Run: git diff --check

Proposed commit when authorized: test: add acceptance build provenance generator

## Task 2: Make metadata a generated frontend asset

**Files:**

- Create: frontend/scripts/write-build-meta.cjs
- Create: frontend/scripts/__tests__/write-build-meta.test.cjs
- Modify: frontend/.gitignore
- Modify: frontend/Dockerfile.web
- Create: compose.acceptance.yaml
- Modify: frontend/nginx.conf
- Create: scripts/tests/test-build-meta-nginx.sh

**Interfaces:** compose.acceptance.yaml consumes NOVELFORGE_BUILD_META_B64 from runner. Base compose.yaml has no metadata requirement. Dockerfile produces static /build-meta.json only when the acceptance argument is present; Nginx has exact HTTP cache contract whenever that asset exists.

- [ ] **Step 1: Write failing Node and Nginx tests.**

Use node:test, assert/strict and temporary directory. Invoke writer with Base64 and temp build-meta.json. Test valid six-key JSON writes compact bytes. Test seventh key, short gitSha, string gitDirty, non-64-hex fingerprint, non-UTC timestamp, non-fixture project, malformed Base64, and an output path whose parent cannot be created all exit non-zero. Add a Dockerfile text contract asserting the metadata writer is inside an explicit nonempty-argument conditional, so ordinary Dockerfile build does not run it.

Use Python re in test-build-meta-nginx.sh to require exact location = /build-meta.json containing try_files /build-meta.json =404; and add_header Cache-Control "no-store" always;. Reject SPA fallback in this block.

- [ ] **Step 2: Run RED.**

Run: node --test frontend/scripts/__tests__/write-build-meta.test.cjs

Run: bash scripts/tests/test-build-meta-nginx.sh

Expected: both fail because writer and exact Nginx location are absent.

- [ ] **Step 3: Implement generation and serving.**

CJS uses Buffer.from(value, base64), canonical round-trip validation, JSON.parse, exact key/type/format validation, mkdirSync parent and writeFileSync compact JSON plus newline mode 0644. It imports no Git and reads no environment file.

In Dockerfile add optional ARG NOVELFORGE_BUILD_META_B64 with empty default. After COPY . . and before npm run build:web:container, run the Node writer only when the argument is nonempty; otherwise do not create public/build-meta.json. Create compose.acceptance.yaml with frontend build.args mapping NOVELFORGE_BUILD_META_B64 to `${NOVELFORGE_BUILD_META_B64:-}`. The empty default keeps status/down/config valid without metadata; the runner itself requires a freshly generated nonempty value before up or rebuild-frontend. It must not alter base compose.yaml. The runner exports APP_BIND_ADDRESS=127.0.0.1 and APP_PORT=18080 while loading both files, so base port interpolation retains its normal default for ordinary writers-room use. Add exact Nginx metadata block before generic location /.

- [ ] **Step 4: Run GREEN and regressions.**

Run: node --test frontend/scripts/__tests__/write-build-meta.test.cjs

Run: bash scripts/tests/test-build-meta-nginx.sh

Run: env -u NOVELFORGE_BUILD_META_B64 docker compose -f compose.yaml config >/dev/null

Run: env -u NOVELFORGE_BUILD_META_B64 docker compose -f compose.yaml -f compose.acceptance.yaml config >/dev/null

Run: NOVELFORGE_BUILD_META_B64=fixture-test docker compose -f compose.yaml -f compose.acceptance.yaml config --no-interpolate >/dev/null

Expected: all exit 0; normal base Compose requires no acceptance argument, the acceptance overlay remains valid for non-build operations with the variable unset, and it accepts a supplied build value without Docker daemon.

- [ ] **Step 5: Check and proposed checkpoint.**

Run: git diff --check

Proposed commit when authorized: feat: expose acceptance build metadata

The Task 2 checkpoint includes `frontend/.gitignore` because it adds the narrow `!scripts/write-build-meta.cjs` exception required to track the approved writer. It also includes this plan update.

## Task 3: Write fake-Docker runner contract before implementation

**Files:**

- Create: scripts/tests/test-novelforge-acceptance.sh
- Create: scripts/novelforge-acceptance.sh

**Interfaces:** Defines runner contract for Tasks 4–6. Test uses no daemon, server, or mutation outside mktemp -d.

- [ ] **Step 1: Write failing harness.**

Create temporary bin ahead of PATH, call log, body and headers. Fake docker appends NUL-safe quoted argv records to FAKE_CALLS; succeeds for info; returns FAKE_PORT_OWNER for exact port ps; records and exits FAKE_COMPOSE_STATUS for Compose. Fake curl writes metadata body and HTTP 200 plus Cache-Control: no-store for metadata, exits FAKE_CURL_STATUS for readiness. lsof is absent unless test adds fake listener output. The assertion helper requires every emitted fixture Compose call from every command to contain, in order, -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture.

Use copied Task 1 generator in temporary Git repo for emit-base64 and compare. Fake python3 records exact existing seeder invocation.

Assert named cases:

1. up logs only compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture up --build -d, carries APP_BIND_ADDRESS, APP_PORT and a nonempty NOVELFORGE_BUILD_META_B64, then reaches ready.
2. rebuild-frontend logs compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture build frontend then the same file pair/project with up -d --no-deps frontend; both build-affecting calls receive the same nonempty metadata value.
3. status and down work with NOVELFORGE_BUILD_META_B64 unset. down logs compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture down --remove-orphans and never -v.
4. seed-writer-ready and verify-writer-ready delegate to existing seed path and canonical URL, never direct HTTP and never require build metadata.
5. Every success fails if calls include writers-room, down -v, prune, stash, reset, or clean.
6. Foreign writers-room port owner makes up exit 70, print FOREIGN_PORT_OWNER, and no Compose call; it makes rebuild-frontend exit 70 with no Compose call; it does not block down, which still has both Compose files and no -v.
7. Existing port owner labeled writer-ready-fixture allows both up and rebuild-frontend; a host listener with no matching fixture container remains foreign and blocks both.
8. Socket permission-denied from docker info makes status exit 69 and print DOCKER_UNAVAILABLE.
9. Readiness curl failure under test timeout=2 interval=1 makes ready exit 71 with READINESS_TIMEOUT and no down.
10. Mismatched metadata body, missing metadata, invalid JSON, or missing no-store each make metadata exit 72 with clear reason.

- [ ] **Step 2: Run RED.**

Run: bash scripts/tests/test-novelforge-acceptance.sh

Expected: FAIL because runner does not exist.

- [ ] **Step 3: Implement runner helpers.**

Use Bash shebang, set -euo pipefail, resolve root from BASH_SOURCE and cd there. Implement die, require_docker, assert_fixture_port_is_safe, compose_fixture, emit_metadata_base64, wait_ready, run_seed, download_metadata, compare_metadata. compose_fixture always supplies -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture plus APP_BIND_ADDRESS and APP_PORT. It accepts an optional metadata argument used only by up and rebuild-frontend; all other commands call it without metadata. Only documented socket phrases map to 69; unexpected Docker failure preserves original status. Port safety runs before up and rebuild-frontend only, allows an existing writer-ready-fixture owner, never stops a foreign owner and never blocks down. Use mktemp and EXIT trap only for metadata files.

Dispatch exactly: up does fixture up --build -d then wait_ready; rebuild-frontend does fixture build frontend then fixture up -d --no-deps frontend then wait_ready; status does fixture ps; ready waits; seed waits then calls existing seeder with base URL reset ids file; verify waits then calls existing seeder with ids file verify; metadata downloads headers/body then calls Task 1 compare; down does fixture down --remove-orphans. Provide build metadata only to up and rebuild-frontend.

- [ ] **Step 4: Run GREEN and regression.**

Run: bash scripts/tests/test-novelforge-acceptance.sh

Run: bash scripts/tests/test-novelforge-build-meta.sh

Run: bash -n scripts/novelforge-acceptance.sh scripts/tests/test-novelforge-acceptance.sh

Expected: all exit 0.

- [ ] **Step 5: Check and proposed checkpoint.**

Run: git diff --check

Proposed commit when authorized: feat: add isolated acceptance runner

## Task 4: Add canonical operational control documents

**Files:**

- Modify: docs/operations/local-compose.md
- Create: docs/acceptance/novelforge-acceptance-control.md
- Test: scripts/tests/test-novelforge-acceptance.sh

**Interfaces:** Consumes eight runner commands and produces unique B+1 through B+3 entrypoint without modifying writer-ready-01-working-matrix.md.

- [ ] **Step 1: Write failing documentation contract check.**

Extend runner test with assert_documentation_contract. Require both documents to list all eight commands, writer-ready-fixture, 127.0.0.1:18080, both fixture Compose files, Shell/Chrome DevTools role split, B+1/B+2/B+3 status, matrix-classification reference, active batch, open decisions, and exactly one labeled next step. Require B+ implementation base 19af546c069f9dd4e472a58e586124eb363ab927 plus statements that live local state comes from git branch --show-current, git rev-parse HEAD and git status --short, and that runtime provenance comes from /build-meta.json. Require the exact local-constraint statement: Runner never invokes stash, reset or clean. Protected stash identity is a local execution-capsule constraint and must be verified before work. Reject a dynamic SHA field, local stash index notation, down -v and manual fixture compose lifecycle commands.

- [ ] **Step 2: Run RED.**

Run: bash scripts/tests/test-novelforge-acceptance.sh

Expected: FAIL because control document absent and local Compose has manual fixture procedure.

- [ ] **Step 3: Write canonical documents.**

Replace fixture section in local-compose.md with control-document link, eight runner commands, and statement raw fixture Compose lifecycle is not acceptance procedure. Preserve normal writers-room port-8080 guidance.

Create control document with B+ implementation base 19af546c069f9dd4e472a58e586124eb363ab927, never a dynamic SHA value, and no stash index. Include runner/URL and both Compose files; metadata required before evidence; Shell lifecycle/provenance and DevTools UI/network roles; B+1 IN PROGRESS, B+2 NOT STARTED, B+3 NOT STARTED; reference current matrix instead of copied rows; WR-08 as historical FAIL resolved by the named 19af546 checkpoint; active QA batch none until B+1 complete; only open decision WR-07 product/spec; and exactly one next step: complete B+1 and Docker smoke gate. Include exactly the protected local-constraint statement required by the test.

- [ ] **Step 4: Run GREEN and regression.**

Run: bash scripts/tests/test-novelforge-acceptance.sh

Run: rg -n 'writer-ready-fixture.*down -v|docker compose -p writer-ready-fixture|dynamic SHA field|local stash index notation' docs/operations/local-compose.md docs/acceptance/novelforge-acceptance-control.md

Expected: first exits 0; second has no output.

- [ ] **Step 5: Check and proposed checkpoint.**

Run: git diff --check

Proposed commit when authorized: docs: add acceptance control procedure

## Task 5: Run complete no-Docker verification gate

**Files:**

- Test: scripts/tests/test-novelforge-build-meta.sh
- Test: frontend/scripts/__tests__/write-build-meta.test.cjs
- Test: scripts/tests/test-build-meta-nginx.sh
- Test: scripts/tests/test-novelforge-acceptance.sh

**Interfaces:** Consumes all B+1 implementation and produces Docker-independent foundation verdict.

- [ ] **Step 1: Establish RED collection output.**

Run separately before fixes:

~~~
bash scripts/tests/test-novelforge-build-meta.sh
node --test frontend/scripts/__tests__/write-build-meta.test.cjs
bash scripts/tests/test-build-meta-nginx.sh
bash scripts/tests/test-novelforge-acceptance.sh
~~~

Expected before Tasks 1–4: at least one fails because target absent.

- [ ] **Step 2: Apply no new production behavior.**

Correct only a disagreement between implemented B+1 contract and Tasks 1–4. Do not loosen expected project, port, headers, schema, or forbidden-command assertions.

- [ ] **Step 3: Run GREEN collection.**

Run:

~~~
bash scripts/tests/test-novelforge-build-meta.sh
node --test frontend/scripts/__tests__/write-build-meta.test.cjs
bash scripts/tests/test-build-meta-nginx.sh
bash scripts/tests/test-novelforge-acceptance.sh
env -u NOVELFORGE_BUILD_META_B64 docker compose -f compose.yaml config >/dev/null
env -u NOVELFORGE_BUILD_META_B64 docker compose -f compose.yaml -f compose.acceptance.yaml config >/dev/null
NOVELFORGE_BUILD_META_B64=fixture-test docker compose -f compose.yaml -f compose.acceptance.yaml config --no-interpolate >/dev/null
git diff --check
~~~

Expected: every command exits 0.

- [ ] **Step 4: Record the gate without a commit.**

Task 5 is verification only. Do not propose or create a commit unless a separately identified corrective change from this gate creates an intended nonempty diff; that corrective change belongs to its producing task.

## Task 6: Perform real Compose smoke as final B+1 gate

**Files:**

- Test: scripts/novelforge-acceptance.sh
- Test: compose.yaml
- Test: compose.acceptance.yaml
- Test: frontend/Dockerfile.web
- Test: frontend/nginx.conf
- Modify: docs/acceptance/novelforge-acceptance-control.md

**Interfaces:** Uses Task 3 runner after Task 5 is green. Do not open browser, modify matrix, exercise faults, or start Task 11/12.

- [ ] **Step 1: Establish pre-smoke eligibility.**

Run all Task 5 tests, env -u NOVELFORGE_BUILD_META_B64 docker compose -f compose.yaml config, env -u NOVELFORGE_BUILD_META_B64 docker compose -f compose.yaml -f compose.acceptance.yaml config, NOVELFORGE_BUILD_META_B64=fixture-test docker compose -f compose.yaml -f compose.acceptance.yaml config --no-interpolate, and git diff --check. Expected: all exit 0. Any failure stops smoke.

- [ ] **Step 2: Run isolated smoke.**

Run in order:

~~~
./scripts/novelforge-acceptance.sh up
./scripts/novelforge-acceptance.sh status
./scripts/novelforge-acceptance.sh ready
./scripts/novelforge-acceptance.sh metadata
curl -fsSI http://127.0.0.1:18080/build-meta.json | rg -i '^cache-control:.*no-store'
./scripts/novelforge-acceptance.sh seed-writer-ready
./scripts/novelforge-acceptance.sh verify-writer-ready
./scripts/novelforge-acceptance.sh down
~~~

Expected: every command exits 0. Record only outcome, provenance fields, service state and synthetic IDs.

- [ ] **Step 3: Apply environment stop conditions.**

After every terminal smoke outcome, update the control document so it has exactly one current next step. On full smoke PASS set B+1: COMPLETE, Compose smoke: PASS, and Next step: owner review of separate B+2 plan. If implementation and no-Docker gate pass but Docker access is unavailable, set B+1 implementation: COMPLETE, Compose smoke: NOT VERIFIED — Docker access unavailable, and Next step: execute B+1 smoke from a host-authorized shell. If smoke reveals B+1 failure, set B+1: INCOMPLETE, Compose smoke: FAIL, and Next step: diagnose the named B+1 failure.

Exit 69: update to the Docker-access-unavailable state and stop with no code change other than control-document finalization. Exit 70: record NOT VERIFIED — foreign owner 18080 and stop without stopping owner; control document next step is diagnose the foreign port owner. Build/pull/network failure before startup: record NOT VERIFIED — environment/build dependency with command and status, then set exactly one next step naming that environment failure. Readiness, metadata, seed, verify, or Cache-Control failure after startup: update to B+1 INCOMPLETE / Compose smoke FAIL and stop; no browser QA or repair. Run down only for fixture started by runner, preserving original failure status.

- [ ] **Step 4: Final checks and proposed checkpoint.**

Run: git diff --check

Run: git status --short

Expected: only B+1 implementation paths modified. Propose feat: add acceptance harness foundation only when the diff includes the Task 6 control-document finalization and any real-smoke corrections. Do not propose an empty commit.

## Planned checkpoints

1. test: add acceptance build provenance generator after Task 1.
2. feat: expose acceptance build metadata after Task 2.
3. feat: add isolated acceptance runner after Task 3.
4. docs: add acceptance control procedure after Task 4.
5. No Task 5 commit: it is verification only.
6. feat: add acceptance harness foundation after Task 6 finalizes the control document and includes any real-smoke corrections; do not create an empty commit.

## Stop conditions

- Initial branch, HEAD, origin SHA, or clean tree differ from canonical state.
- Any fake-Docker, metadata, Node, Nginx, Compose-config, or diff-check test fails.
- Host or container outside writer-ready-fixture owns 18080 before up or rebuild-frontend; this does not block safe down.
- Docker socket unavailable: real smoke is NOT VERIFIED, never application failure.
- Served metadata absent, lacks no-store, invalid, or mismatches local repository.
- Work would require faults, matrix reconciliation, WR-07 decision, a new writer defect fix, backup/restore, browser QA, Task 11, or Task 12.

## Required phase order

1. Complete and review B+1 with no-Docker tests and final smoke.
2. Obtain owner approval for separate B+2 deterministic fault plan.
3. Obtain owner approval for separate B+3 matrix reconciliation and batched QA plan.

No B+2 or B+3 implementation enters B+1 change set.

## Plan self-review checklist

- Tasks 1–6 cover fixed constants, acceptance Compose overlay, optional metadata interpolation for non-build commands, normal writers-room compatibility, safe down, bounded readiness, seeder delegation, Docker classification, foreign-port guard with own-fixture allowance, symlink-safe metadata generation, cache behavior, fake-Docker tests, final smoke, and control-document finalization.
- B+2/B+3 are boundaries only and create no B+1 task.
- Names, keys, exit codes, and commands are consistent.
- Task 6 is final gate, never replacement for independent tests.
- Each task has independently testable result, RED, GREEN, regression and diff check; Task 5 never proposes an empty commit, and Task 6 proposes one only with finalization diff.
