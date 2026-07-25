# Task 1 Review

## Verdict

CAUTION until the executable bit on `scripts/verify-upstream.sh` is verified in a real checkout.

## Scope reviewed

- `.gitignore`
- `docs/architecture/upstream-sync.md`
- `docs/acceptance/sprint-0-matrix.md`
- `scripts/verify-upstream.sh`
- Task 1 requirements from `docs/superpowers/plans/2026-07-25-sprint-0-foundation-spike.md`

## Findings

### P2

- The GitHub Contents API does not expose or set Unix executable mode. The script content is correct and passed `bash -n` in an isolated shell check, but `./scripts/verify-upstream.sh` must be verified after a real checkout and marked executable with `chmod +x` if needed.

## Spec compliance

- Required baseline commit is recorded.
- AGPL verification is present.
- Dedicated `upstream-sync/*` process is documented.
- Acceptance matrix contains all required Gate A through Gate E rows and evidence columns.
- Runtime data, secrets, private evidence, SQLite files, and Superdesign temporary files are ignored.
- The upstream blanket ignores for `docs/`, Markdown, and shell scripts were removed because they conflicted with the approved project workflow.

## Validation

- `bash -n scripts/verify-upstream.sh`: PASS against the exact committed content in an isolated shell.
- Functional fixture check with AGPL marker and pinned baseline: PASS.
- GitHub branch diff: four intended files only.

## Required next verification

In the first real repository checkout:

```bash
chmod +x scripts/verify-upstream.sh
./scripts/verify-upstream.sh
git diff --check
```

The review becomes `Looks good` when these commands pass and the executable mode is committed.
