#!/usr/bin/env bash
set -euo pipefail

EXPECTED_UPSTREAM="ca7ca584580df0220a6a0d008309e5575b3dc449"

if [[ ! -f LICENSE ]]; then
  echo "FAIL: LICENSE is missing" >&2
  exit 1
fi

if ! grep -qi "GNU AFFERO GENERAL PUBLIC LICENSE" LICENSE; then
  echo "FAIL: LICENSE is not AGPL" >&2
  exit 1
fi

if [[ ! -f docs/architecture/upstream-sync.md ]]; then
  echo "FAIL: upstream sync documentation is missing" >&2
  exit 1
fi

if ! grep -q "$EXPECTED_UPSTREAM" docs/architecture/upstream-sync.md; then
  echo "FAIL: expected upstream baseline is not recorded" >&2
  exit 1
fi

printf 'PASS: upstream baseline %s is recorded and AGPL notice exists\n' "$EXPECTED_UPSTREAM"
