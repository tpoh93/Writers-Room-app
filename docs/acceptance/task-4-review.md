# Task 4 Review

## Verdict

CAUTION pending automated backup, restore, and persistence evidence.

## Scope prepared

- `backend/app/core/storage.py`
- `backend/app/services/backup_service.py`
- `backend/app/cli/`
- `backend/tests/services/test_backup_service.py`
- `scripts/backup.sh`
- `scripts/restore.sh`
- `docs/operations/local-compose.md`

## Safety properties under review

- SQLite online backup API is used instead of copying a live database file.
- Every produced backup receives an integrity check.
- Existing databases cannot be overwritten without `--force`.
- Forced restore creates a safety backup first.
- Restore validates a temporary copy before atomic replacement.
- Stale SQLite WAL and SHM sidecars are removed before replacement.
- Host restore stops the backend before database replacement.
- Corrupt backups are rejected without modifying the live database.

The verdict becomes `LOOKS GOOD` only after unit tests and the Compose persistence/restore drill pass in GitHub Actions.
