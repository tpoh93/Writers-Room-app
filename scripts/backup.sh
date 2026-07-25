#!/usr/bin/env bash
set -euo pipefail

docker compose exec -T backend python -m app.cli.backup "$@"
