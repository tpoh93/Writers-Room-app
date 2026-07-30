#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
bin="$tmpdir/bin"
mkdir -p "$bin"
calls="$tmpdir/calls"
seeds="$tmpdir/seeds"
touch "$calls" "$seeds"
real_python="$(command -v python3)"

cat > "$bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  info)
    if [[ "${FAKE_DOCKER_INFO_STATUS:-0}" != 0 ]]; then
      printf '%s\n' "${FAKE_DOCKER_INFO_MESSAGE:-permission denied}" >&2
      exit "${FAKE_DOCKER_INFO_STATUS}"
    fi
    ;;
  ps)
    if [[ " $* " == *" --filter publish=18080 "* ]]; then
      printf '%s\n' "${FAKE_PORT_OWNER:-}"
    fi
    ;;
  compose)
    shift
    printf 'compose %s\n' "$*" >> "$FAKE_CALLS"
    printf 'environment APP_BIND_ADDRESS=%s APP_PORT=%s NOVELFORGE_BUILD_META_B64=%s\n' "${APP_BIND_ADDRESS:-}" "${APP_PORT:-}" "${NOVELFORGE_BUILD_META_B64:-}" >> "$FAKE_CALLS"
    exit "${FAKE_COMPOSE_STATUS:-0}"
    ;;
  *) exit 97 ;;
esac
EOF
cat > "$bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${FAKE_CURL_STATUS:-0}" != 0 ]]; then exit "${FAKE_CURL_STATUS}"; fi
headers=""; body=""; url=""
while (($#)); do
  case "$1" in
    -D) headers="$2"; shift 2 ;;
    -o) body="$2"; shift 2 ;;
    *) url="$1"; shift ;;
  esac
done
if [[ "$url" == */build-meta.json ]]; then
  [[ -n "$headers" ]] && printf '%s\n' "${FAKE_HEADERS:-Cache-Control: no-store}" > "$headers"
  [[ -n "$body" ]] && printf '%s' "${FAKE_METADATA:-}" > "$body"
fi
EOF
cat > "$bin/lsof" <<'EOF'
#!/usr/bin/env bash
if [[ -n "${FAKE_LSOF_OUTPUT:-}" ]]; then printf '%s\n' "$FAKE_LSOF_OUTPUT"; exit 0; fi
exit 1
EOF
cat > "$bin/python3" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == *seed-writer-ready-fixture.py ]]; then
  printf '%s\n' "$*" >> "$FAKE_SEEDS"
  exit 0
fi
exec "$REAL_PYTHON" "$@"
EOF
chmod +x "$bin/docker" "$bin/curl" "$bin/lsof" "$bin/python3"

metadata="$(python3 "$repo_root/scripts/novelforge-build-meta.py" emit)"

run() {
  PATH="$bin:$PATH" REAL_PYTHON="$real_python" FAKE_CALLS="$calls" FAKE_SEEDS="$seeds" FAKE_METADATA="$metadata" \
    NOVELFORGE_ACCEPTANCE_READY_TIMEOUT_SECONDS=2 NOVELFORGE_ACCEPTANCE_READY_INTERVAL_SECONDS=1 \
    "$repo_root/scripts/novelforge-acceptance.sh" "$@"
}

assert_fixture_calls() {
  if [[ -s "$calls" ]]; then
    rg '^compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture ' "$calls" >/dev/null
  fi
  if rg -q 'writers-room|down -v|prune|stash|reset|clean' "$calls"; then
    echo "unsafe Compose call" >&2
    exit 1
  fi
}

run up
rg -q '^compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture up --build -d$' "$calls"
rg -q 'environment APP_BIND_ADDRESS=127.0.0.1 APP_PORT=18080 NOVELFORGE_BUILD_META_B64=.+$' "$calls"
assert_fixture_calls

: > "$calls"
run rebuild-frontend
rg -q '^compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture build frontend$' "$calls"
rg -q '^compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture up -d --no-deps frontend$' "$calls"
test "$(rg -c '^environment .*NOVELFORGE_BUILD_META_B64=.+$' "$calls")" = 2
assert_fixture_calls

: > "$calls"
env -u NOVELFORGE_BUILD_META_B64 PATH="$bin:$PATH" REAL_PYTHON="$real_python" FAKE_CALLS="$calls" FAKE_SEEDS="$seeds" FAKE_METADATA="$metadata" "$repo_root/scripts/novelforge-acceptance.sh" status
run down
rg -q '^compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture ps$' "$calls"
rg -q '^compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture down --remove-orphans$' "$calls"
assert_fixture_calls

: > "$seeds"
run seed-writer-ready
run verify-writer-ready
rg -q -- '--base-url http://127.0.0.1:18080 --reset --ids-file ' "$seeds"
rg -q -- '--base-url http://127.0.0.1:18080 --ids-file .* --verify' "$seeds"

if FAKE_PORT_OWNER=writers-room run up >"$tmpdir/foreign.out" 2>&1; then exit 1; else test "$?" = 70; fi
rg -q FOREIGN_PORT_OWNER "$tmpdir/foreign.out"
if FAKE_PORT_OWNER=writers-room run rebuild-frontend >"$tmpdir/foreign.out" 2>&1; then exit 1; else test "$?" = 70; fi
FAKE_PORT_OWNER=writers-room run down

FAKE_PORT_OWNER=writer-ready-fixture run up
if FAKE_LSOF_OUTPUT=listener run up >"$tmpdir/listener.out" 2>&1; then exit 1; else test "$?" = 70; fi
rg -q FOREIGN_PORT_OWNER "$tmpdir/listener.out"

if FAKE_DOCKER_INFO_STATUS=1 FAKE_DOCKER_INFO_MESSAGE='permission denied' run status >"$tmpdir/docker.out" 2>&1; then exit 1; else test "$?" = 69; fi
rg -q DOCKER_UNAVAILABLE "$tmpdir/docker.out"
if FAKE_CURL_STATUS=7 run ready >"$tmpdir/ready.out" 2>&1; then exit 1; else test "$?" = 71; fi
rg -q READINESS_TIMEOUT "$tmpdir/ready.out"

for mode in mismatch missing invalid no_store; do
  case "$mode" in
    mismatch) case_metadata='{"gitSha":"0000000000000000000000000000000000000000","gitBranch":"x","gitDirty":false,"workspaceFingerprint":"0000000000000000000000000000000000000000000000000000000000000000","builtAt":"2026-07-30T12:34:56Z","composeProject":"writer-ready-fixture"}' ;;
    missing) case_metadata='' ;;
    invalid) case_metadata='not-json' ;;
    no_store) case_metadata="$metadata" ;;
  esac
  if FAKE_METADATA="$case_metadata" FAKE_HEADERS="${mode/no_store/Cache-Control: no-store}" run metadata >"$tmpdir/metadata.out" 2>&1; then
    if [[ "$mode" == no_store ]]; then :; else exit 1; fi
  else
    status=$?
    [[ "$mode" != no_store ]] || exit 1
    test "$status" = 72
  fi
done

assert_documentation_contract() {
  local control="$repo_root/docs/acceptance/novelforge-acceptance-control.md"
  local operations="$repo_root/docs/operations/local-compose.md"
  for document in "$control" "$operations"; do
    for command in up rebuild-frontend status ready seed-writer-ready verify-writer-ready metadata down; do
      rg -q "scripts/novelforge-acceptance.sh ${command}" "$document"
    done
    rg -q 'writer-ready-fixture' "$document"
    rg -q '127.0.0.1:18080' "$document"
    rg -q 'compose.yaml' "$document"
    rg -q 'compose.acceptance.yaml' "$document"
    rg -q 'Shell' "$document"
    rg -q 'Chrome DevTools' "$document"
    rg -q 'B\+1' "$document"
    rg -q 'B\+2' "$document"
    rg -q 'B\+3' "$document"
    test "$(rg -c '^Next step:' "$document")" = 1
  done
  rg -q '19af546c069f9dd4e472a58e586124eb363ab927' "$control"
  rg -q 'git branch --show-current' "$control"
  rg -q 'git rev-parse HEAD' "$control"
  rg -q 'git status --short' "$control"
  rg -q '/build-meta.json' "$control"
  rg -q 'matrix' "$control"
  rg -q 'active QA batch' "$control"
  rg -q 'WR-07' "$control"
  rg -q 'Runner never invokes stash, reset or clean\. Protected stash identity is a local execution-capsule constraint and must be verified before work\.' "$control"
  if rg -n 'writer-ready-fixture.*down -v|docker compose -p writer-ready-fixture|dynamic SHA field|local stash index notation' "$control" "$operations"; then
    exit 1
  fi
}

assert_documentation_contract
