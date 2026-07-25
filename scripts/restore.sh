#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: scripts/restore.sh /backups/file.db [--force]" >&2
  exit 2
fi

docker compose stop backend
docker compose run --rm backend python -m app.cli.restore "$@"
docker compose up -d backend frontend
