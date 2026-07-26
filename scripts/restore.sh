#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: scripts/restore.sh /backups/file.db [--force]" >&2
  exit 2
fi

restart_stack() {
  docker compose up -d backend frontend || {
    echo "ERROR: restore finished but the application stack could not restart" >&2
    return 1
  }
}

backend_stopped=false
cleanup() {
  status=$?
  trap - EXIT

  if [[ "$backend_stopped" == true ]]; then
    restart_stack || true
  fi

  exit "$status"
}
trap cleanup EXIT

docker compose stop backend
backend_stopped=true
docker compose run --rm backend python -m app.cli.restore "$@"
