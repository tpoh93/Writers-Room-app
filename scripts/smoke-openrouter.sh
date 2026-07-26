#!/usr/bin/env bash
set -euo pipefail

required=(OPENROUTER_API_KEY KIMI_MODEL_ID GROK_MODEL_ID AION_MODEL_ID)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "FAIL: $name is not set" >&2
    exit 2
  fi
done

if [[ "$KIMI_MODEL_ID" == "$GROK_MODEL_ID" \
  || "$KIMI_MODEL_ID" == "$AION_MODEL_ID" \
  || "$GROK_MODEL_ID" == "$AION_MODEL_ID" ]]; then
  echo "FAIL: Kimi, Grok, and Aion must use three distinct model IDs" >&2
  exit 2
fi

if git grep -qF "$OPENROUTER_API_KEY" -- . ':!scripts/smoke-openrouter.sh'; then
  echo "FAIL: the runtime API key appears in tracked repository content" >&2
  exit 1
fi

if git grep -qE 'sk-or-v1-[A-Za-z0-9_-]{20,}|OPENROUTER_API_KEY=[^[:space:]]+' -- . ':!.env.example'; then
  echo "FAIL: an OpenRouter-style credential appears in tracked repository content" >&2
  exit 1
fi

curl -fsS http://127.0.0.1:8080/healthz/frontend >/dev/null
curl -fsS http://127.0.0.1:8080/healthz/ready >/dev/null

models_file="$(mktemp)"
trap 'rm -f "$models_file"' EXIT

curl -fsS \
  -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
  -H 'Accept: application/json' \
  https://openrouter.ai/api/v1/models \
  -o "$models_file"

python3 - "$models_file" "$KIMI_MODEL_ID" "$GROK_MODEL_ID" "$AION_MODEL_ID" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
available = {
    item.get("id")
    for item in payload.get("data", [])
    if isinstance(item, dict) and isinstance(item.get("id"), str)
}
missing = [model_id for model_id in sys.argv[2:] if model_id not in available]
if missing:
    raise SystemExit("FAIL: model IDs unavailable from OpenRouter: " + ", ".join(missing))
PY

printf 'PASS: runtime, OpenRouter key, and model availability are ready\n'
printf 'Model chain: %s -> %s -> %s\n' \
  "$KIMI_MODEL_ID" "$GROK_MODEL_ID" "$AION_MODEL_ID"
printf 'Continue with the synthetic accepted, rejected, and provider-failure fixtures in docs/acceptance/openrouter-smoke.md\n'
