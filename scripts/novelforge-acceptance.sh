#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

compose_project="writer-ready-fixture"
bind_address="127.0.0.1"
app_port="18080"
base_url="http://${bind_address}:${app_port}"
ready_timeout_seconds="${NOVELFORGE_ACCEPTANCE_READY_TIMEOUT_SECONDS:-90}"
ready_interval_seconds="${NOVELFORGE_ACCEPTANCE_READY_INTERVAL_SECONDS:-2}"
ids_file="${TMPDIR:-/tmp}/novelforge-writer-ready-fixture-ids.json"

die() {
  local status="$1"
  shift
  printf '%s\n' "$*" >&2
  exit "$status"
}

require_docker() {
  local output status
  if output="$(docker info 2>&1)"; then
    return 0
  else
    status=$?
  fi
  if printf '%s' "$output" | rg -qi 'permission denied|cannot connect to the docker daemon|is the docker daemon running|docker\.sock'; then
    die 69 "DOCKER_UNAVAILABLE"
  fi
  printf '%s\n' "$output" >&2
  return "$status"
}

assert_fixture_port_is_safe() {
  local owners listener
  owners="$(docker ps --filter "publish=${app_port}" --format '{{.Label "com.docker.compose.project"}}')"
  if [[ -n "$owners" ]] && ! printf '%s\n' "$owners" | awk -v expected="$compose_project" 'NF && $0 != expected { exit 1 }'; then
    die 70 "FOREIGN_PORT_OWNER"
  fi
  if command -v lsof >/dev/null 2>&1; then
    if listener="$(lsof -nP -iTCP:"${app_port}" -sTCP:LISTEN 2>/dev/null)" && [[ -n "$listener" ]] && [[ -z "$owners" ]]; then
      die 70 "FOREIGN_PORT_OWNER"
    fi
  fi
}

compose_fixture() {
  local metadata="${1:-}"
  if [[ -n "$metadata" ]]; then
    shift
    APP_BIND_ADDRESS="$bind_address" APP_PORT="$app_port" NOVELFORGE_BUILD_META_B64="$metadata" \
      docker compose -f compose.yaml -f compose.acceptance.yaml -p "$compose_project" "$@"
  else
    shift || true
    env -u NOVELFORGE_BUILD_META_B64 APP_BIND_ADDRESS="$bind_address" APP_PORT="$app_port" \
      docker compose -f compose.yaml -f compose.acceptance.yaml -p "$compose_project" "$@"
  fi
}

emit_metadata_base64() {
  local metadata
  metadata="$(python3 scripts/novelforge-build-meta.py emit-base64)"
  [[ -n "$metadata" ]] || die 72 "METADATA_GENERATION_FAILED"
  printf '%s\n' "$metadata"
}

wait_ready() {
  local elapsed=0
  while ! curl -fsS "${base_url}/healthz/ready" >/dev/null; do
    if (( elapsed >= ready_timeout_seconds )); then
      compose_fixture '' ps >&2 || true
      die 71 "READINESS_TIMEOUT"
    fi
    sleep "$ready_interval_seconds"
    elapsed=$((elapsed + ready_interval_seconds))
  done
}

run_seed() {
  local mode="$1"
  if [[ "$mode" == reset ]]; then
    python3 scripts/seed-writer-ready-fixture.py --base-url "$base_url" --reset --ids-file "$ids_file"
  else
    python3 scripts/seed-writer-ready-fixture.py --base-url "$base_url" --ids-file "$ids_file" --verify
  fi
}

fault_request() {
  local method="$1"
  local endpoint="$2"
  curl -fsS -X "$method" "${base_url}/api/acceptance/writer-put-fault${endpoint}"
}

require_positive_delay_seconds() {
  local seconds="${1:-}"
  [[ "$seconds" =~ ^([1-9][0-9]*(\.[0-9]+)?|0\.[0-9]*[1-9][0-9]*|\.[0-9]*[1-9][0-9]*)$ ]]
}

compare_metadata() {
  local headers body curl_status
  headers="$(mktemp)"
  body="$(mktemp)"
  trap 'rm -f "$headers" "$body"' RETURN
  if curl -fsS -D "$headers" -o "$body" "${base_url}/build-meta.json"; then
    :
  else
    curl_status=$?
    die 72 "METADATA_DOWNLOAD_FAILED status=${curl_status}"
  fi
  if ! rg -qi '^Cache-Control:.*no-store' "$headers"; then
    die 72 "METADATA_CACHE_CONTROL_MISSING"
  fi
  if ! python3 scripts/novelforge-build-meta.py compare --actual-file "$body"; then
    die 72 "METADATA_MISMATCH"
  fi
}

command="${1:-}"
case "$command" in
  up)
    require_docker
    assert_fixture_port_is_safe
    metadata="$(emit_metadata_base64)"
    compose_fixture "$metadata" up --build -d
    wait_ready
    ;;
  rebuild-frontend)
    require_docker
    assert_fixture_port_is_safe
    metadata="$(emit_metadata_base64)"
    compose_fixture "$metadata" build frontend
    compose_fixture "$metadata" up -d --no-deps frontend
    wait_ready
    ;;
  status)
    require_docker
    compose_fixture '' ps
    ;;
  ready)
    require_docker
    wait_ready
    ;;
  seed-writer-ready)
    require_docker
    wait_ready
    run_seed reset
    ;;
  verify-writer-ready)
    require_docker
    wait_ready
    run_seed verify
    ;;
  metadata)
    require_docker
    compare_metadata
    ;;
  fault-status)
    require_docker
    wait_ready
    fault_request GET ""
    ;;
  fault-http-500)
    require_docker
    wait_ready
    fault_request POST "/http-500"
    ;;
  fault-delay)
    if [[ "$#" -ne 2 ]] || ! require_positive_delay_seconds "${2:-}"; then
      die 2 "Usage: $0 fault-delay <seconds>"
    fi
    require_docker
    wait_ready
    fault_request POST "/delay?seconds=$2"
    ;;
  fault-hold)
    require_docker
    wait_ready
    fault_request POST "/hold"
    ;;
  fault-release)
    require_docker
    wait_ready
    fault_request POST "/release"
    ;;
  fault-clear)
    require_docker
    wait_ready
    fault_request DELETE ""
    ;;
  down)
    require_docker
    compose_fixture '' down --remove-orphans
    ;;
  *)
    die 2 "Usage: $0 {up|rebuild-frontend|status|ready|seed-writer-ready|verify-writer-ready|metadata|fault-status|fault-http-500|fault-delay|fault-hold|fault-release|fault-clear|down}"
    ;;
esac
