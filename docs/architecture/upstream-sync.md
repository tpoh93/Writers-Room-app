# Upstream Synchronization

## Baseline

Writers Room App is forked from `RhythmicWave/NovelForge`.

The frozen Sprint 0 upstream baseline is:

```text
ca7ca584580df0220a6a0d008309e5575b3dc449
```

This commit corresponds to the reviewed NovelForge `v0.9.6` baseline. Product work must not silently move this reference.

## Initial remote setup

Run from the repository root:

```bash
git remote -v
git remote add upstream https://github.com/RhythmicWave/NovelForge.git
git fetch upstream --tags
git branch upstream-baseline ca7ca584580df0220a6a0d008309e5575b3dc449
```

If an `upstream` remote already exists, verify that it points to the exact URL above instead of adding a duplicate remote.

## Importing a later upstream batch

All upstream imports must use a dedicated temporary branch:

```bash
git switch -c upstream-sync/YYYY-MM-DD main
git fetch upstream --tags
git merge --no-commit --no-ff upstream/main
```

Do not resolve conflicts by deleting Writers Room behavior merely to make the merge green. Review changes against the approved architecture and current acceptance matrix.

Before committing an upstream batch:

1. Confirm the upstream commit range and record it in the merge description.
2. Retain `LICENSE`, upstream copyright notices, AGPL notices, and attribution.
3. Run the repository test suite and the Sprint 0 acceptance checks relevant to changed areas.
4. Inspect database migrations, provider adapters, editor selection handling, workflow execution, and web deployment changes with particular care.
5. Add a short modification summary describing accepted upstream changes, local conflict resolutions, and rejected changes.
6. Open a pull request from `upstream-sync/YYYY-MM-DD`; do not merge an upstream batch directly into `main`.

## Modification summary template

```markdown
## Upstream batch YYYY-MM-DD

- Upstream range: `<old>..<new>`
- Accepted changes:
  - ...
- Local conflict resolutions:
  - ...
- Rejected or deferred changes:
  - ...
- Verification:
  - `<command>` → `<result>`
- License and notices checked: yes
```

## Rollback

Before accepting a batch, record the current `main` commit. If the import fails acceptance, close the pull request or revert the merge commit. Never rewrite the frozen `upstream-baseline` branch.
