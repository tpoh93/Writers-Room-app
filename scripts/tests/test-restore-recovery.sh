#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp_dir="$(mktemp -d)"
calls_file="$tmp_dir/docker-calls"
fake_docker="$tmp_dir/docker"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

cat > "$fake_docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >> "$FAKE_DOCKER_CALLS"

case "$*" in
  "compose stop backend") exit "${FAKE_STOP_STATUS:-0}" ;;
  "compose run --rm backend python -m app.cli.restore"*) exit "${FAKE_RESTORE_STATUS:-23}" ;;
  "compose up -d backend frontend") exit "${FAKE_RESTART_STATUS:-0}" ;;
  *) exit 99 ;;
esac
EOF
chmod +x "$fake_docker"

run_restore() {
  local stop_status="$1"
  local restore_status="$2"
  local restart_status="$3"

  : > "$calls_file"
  set +e
  PATH="$tmp_dir:$PATH" \
    FAKE_DOCKER_CALLS="$calls_file" \
    FAKE_STOP_STATUS="$stop_status" \
    FAKE_RESTORE_STATUS="$restore_status" \
    FAKE_RESTART_STATUS="$restart_status" \
    "$repo_root/scripts/restore.sh" /backups/broken.db --force >/dev/null 2>&1
  actual_status=$?
  set -e
}

assert_status() {
  local expected_status="$1"

  if [[ "$actual_status" -ne "$expected_status" ]]; then
    echo "FAIL: expected restore exit status $expected_status, got $actual_status" >&2
    exit 1
  fi
}

assert_restarted() {
  local last_call
  last_call="$(tail -n 1 "$calls_file")"

  if [[ "$last_call" != "compose up -d backend frontend" ]]; then
    echo "FAIL: expected final Docker call to restart backend and frontend; got: $last_call" >&2
    exit 1
  fi
}

assert_not_restarted() {
  if grep -Fqx "compose up -d backend frontend" "$calls_file"; then
    echo "FAIL: restart must not run when stopping the backend fails" >&2
    exit 1
  fi
}

run_restore 0 23 0
assert_status 23
assert_restarted

run_restore 0 0 0
assert_status 0
assert_restarted

run_restore 41 23 0
assert_status 41
assert_not_restarted

run_restore 0 23 47
assert_status 23
assert_restarted

echo "PASS: restore recovery preserves original statuses and restart behavior"
