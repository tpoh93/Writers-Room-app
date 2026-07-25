#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "FAIL: .env is missing; copy .env.example to .env first" >&2
  exit 2
fi

resolved="$(docker compose config --format json)"

printf '%s' "$resolved" | python3 - <<'PY'
import json
import sys

config = json.load(sys.stdin)
services = config.get("services", {})
frontend = services.get("frontend")
backend = services.get("backend")

if not isinstance(frontend, dict):
    raise SystemExit("FAIL: frontend service is missing from Compose config")
if not isinstance(backend, dict):
    raise SystemExit("FAIL: backend service is missing from Compose config")

frontend_ports = frontend.get("ports") or []
if not frontend_ports:
    raise SystemExit("FAIL: frontend has no published localhost port")

for mapping in frontend_ports:
    if not isinstance(mapping, dict):
        raise SystemExit(f"FAIL: unsupported frontend port mapping: {mapping!r}")

    host_ip = mapping.get("host_ip")
    target = str(mapping.get("target", ""))

    if host_ip != "127.0.0.1":
        raise SystemExit(
            "FAIL: frontend port is not restricted to 127.0.0.1 "
            f"(target={target}, host_ip={host_ip!r})"
        )

backend_ports = backend.get("ports") or []
if backend_ports:
    raise SystemExit(f"FAIL: backend publishes host ports: {backend_ports!r}")

print("PASS: Compose defaults to a local-only frontend binding and no backend host port")
PY

if command -v lsof >/dev/null 2>&1; then
  app_port="${APP_PORT:-8080}"
  lsof -nP -iTCP:"$app_port" -sTCP:LISTEN || true
fi
