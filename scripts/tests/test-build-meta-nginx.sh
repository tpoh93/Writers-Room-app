#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
NGINX_CONF="$repo_root/frontend/nginx.conf" python3 - <<'PY'
import os
import re
from pathlib import Path

contents = Path(os.environ["NGINX_CONF"]).read_text(encoding="utf-8")
match = re.search(r"location\s+=\s+/build-meta\.json\s*\{(?P<body>.*?)\n\s*\}", contents, re.DOTALL)
assert match, "missing exact /build-meta.json location"
body = match.group("body")
assert re.search(r"try_files\s+/build-meta\.json\s+=404\s*;", body), "metadata must not use SPA fallback"
assert re.search(r'add_header\s+Cache-Control\s+"no-store"\s+always\s*;', body), "metadata must be no-store"
assert "/index.html" not in body, "metadata location must not fall back to the SPA"
PY
