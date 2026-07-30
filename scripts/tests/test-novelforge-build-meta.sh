#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

fixture="$tmpdir/repo"
outside="$tmpdir/outside.txt"
mkdir -p "$fixture/bin"
git -C "$fixture" init -q
git -C "$fixture" config user.name fixture
git -C "$fixture" config user.email fixture@example.invalid
printf 'alpha\n' > "$fixture/tracked.txt"
git -C "$fixture" add tracked.txt
git -C "$fixture" commit -qm fixture
cp "$repo_root/scripts/novelforge-build-meta.py" "$fixture/bin/novelforge-build-meta.py"
git -C "$fixture" add bin/novelforge-build-meta.py
git -C "$fixture" commit -qm generator
printf 'actual.json\n' > "$fixture/.git/info/exclude"

run_meta() {
  (cd "$fixture" && python3 bin/novelforge-build-meta.py emit)
}

assert_meta() {
  META_JSON="$1" python3 - <<'PY'
import json
import os
import re

value = json.loads(os.environ["META_JSON"])
assert set(value) == {"gitSha", "gitBranch", "gitDirty", "workspaceFingerprint", "builtAt", "composeProject"}
assert re.fullmatch(r"[0-9a-f]{40}", value["gitSha"])
assert isinstance(value["gitDirty"], bool)
assert re.fullmatch(r"[0-9a-f]{64}", value["workspaceFingerprint"])
assert value["composeProject"] == "writer-ready-fixture"
assert re.fullmatch(r".+Z", value["builtAt"])
PY
}

clean_json="$(run_meta)"
assert_meta "$clean_json"
test "$(printf '%s' "$clean_json" | python3 -c 'import json,sys; assert json.load(sys.stdin)["gitDirty"] is False')" = ""
clean_fingerprint="$(printf '%s' "$clean_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaceFingerprint"])')"

printf 'beta\n' >> "$fixture/tracked.txt"
tracked_json="$(run_meta)"
assert_meta "$tracked_json"
META_JSON="$tracked_json" CLEAN_FINGERPRINT="$clean_fingerprint" python3 - <<'PY'
import json
import os
value = json.loads(os.environ["META_JSON"])
assert value["gitDirty"] is True
assert value["workspaceFingerprint"] != os.environ["CLEAN_FINGERPRINT"]
PY
git -C "$fixture" checkout -- tracked.txt

printf 'one\n' > "$fixture/scratch.txt"
untracked_one_json="$(run_meta)"
untracked_one_fingerprint="$(printf '%s' "$untracked_one_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaceFingerprint"])')"
test "$untracked_one_fingerprint" != "$clean_fingerprint"
printf 'two\n' > "$fixture/scratch.txt"
untracked_two_json="$(run_meta)"
untracked_two_fingerprint="$(printf '%s' "$untracked_two_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaceFingerprint"])')"
test "$untracked_two_fingerprint" != "$untracked_one_fingerprint"
rm "$fixture/scratch.txt"

printf 'first\n' > "$outside"
ln -s "$outside" "$fixture/link-out"
link_one_json="$(run_meta)"
link_one_fingerprint="$(printf '%s' "$link_one_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaceFingerprint"])')"
test "$link_one_fingerprint" != "$clean_fingerprint"
printf 'second\n' > "$outside"
chmod 000 "$outside"
link_two_json="$(run_meta)"
link_two_fingerprint="$(printf '%s' "$link_two_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaceFingerprint"])')"
test "$link_two_fingerprint" = "$link_one_fingerprint"
rm "$fixture/link-out"
ln -s "$tmpdir/./outside.txt" "$fixture/link-out"
link_three_json="$(run_meta)"
link_three_fingerprint="$(printf '%s' "$link_three_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaceFingerprint"])')"
test "$link_three_fingerprint" != "$link_two_fingerprint"
chmod 600 "$outside"
rm "$fixture/link-out"

printf '%s\n' "$clean_json" > "$fixture/actual.json"
(cd "$fixture" && python3 bin/novelforge-build-meta.py compare --actual-file actual.json)
python3 - "$fixture/actual.json" <<'PY'
import json
import sys
path = sys.argv[1]
with open(path, encoding="utf-8") as handle:
    value = json.load(handle)
value["workspaceFingerprint"] = "0" * 64
with open(path, "w", encoding="utf-8") as handle:
    json.dump(value, handle)
PY
if (cd "$fixture" && python3 bin/novelforge-build-meta.py compare --actual-file actual.json 2>"$tmpdir/compare.err"); then
  echo "expected compare to reject mismatched workspace fingerprint" >&2
  exit 1
fi
rg -q 'METADATA_MISMATCH field=workspaceFingerprint' "$tmpdir/compare.err"
