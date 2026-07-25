from __future__ import annotations

import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def _integrity_check(path: Path) -> None:
    uri = f"file:{path.as_posix()}?mode=ro"
    try:
        with sqlite3.connect(uri, uri=True) as conn:
            result = conn.execute("PRAGMA integrity_check").fetchone()
    except sqlite3.DatabaseError as exc:
        raise ValueError(f"SQLite integrity check failed for {path}: {exc}") from exc
    if not result or result[0] != "ok":
        raise ValueError(f"SQLite integrity check failed for {path}: {result}")


def _safe_label(label: str | None) -> str:
    if not label:
        return ""
    sanitized = "".join(character for character in label if character.isalnum() or character in "-_")
    return f"-{sanitized}" if sanitized else ""


def _remove_sqlite_sidecars(db_path: Path) -> None:
    for suffix in ("-wal", "-shm"):
        sidecar = Path(f"{db_path}{suffix}")
        try:
            sidecar.unlink()
        except FileNotFoundError:
            pass


def create_backup(db_path: Path, backup_dir: Path, label: str | None = None) -> Path:
    """Create an integrity-checked SQLite backup using SQLite's online backup API."""
    db_path = db_path.resolve()
    backup_dir = backup_dir.resolve()

    if not db_path.is_file():
        raise FileNotFoundError(db_path)

    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = backup_dir / f"novelforge-{stamp}{_safe_label(label)}.db"

    with sqlite3.connect(db_path) as source, sqlite3.connect(destination) as target:
        source.backup(target)

    _integrity_check(destination)
    return destination


def restore_backup(backup_path: Path, db_path: Path, force: bool = False) -> Path | None:
    """Atomically restore an integrity-checked SQLite backup.

    When replacing an existing database, a safety backup is created first and
    returned to the caller. The caller must stop application writers before
    invoking this function.
    """
    backup_path = backup_path.resolve()
    db_path = db_path.resolve()

    if not backup_path.is_file():
        raise FileNotFoundError(backup_path)

    _integrity_check(backup_path)

    safety_backup: Path | None = None
    if db_path.exists():
        if not force:
            raise FileExistsError(db_path)
        safety_backup = create_backup(
            db_path,
            db_path.parent / "pre-restore",
            label="pre-restore",
        )

    db_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = db_path.with_suffix(db_path.suffix + ".restore-tmp")

    try:
        shutil.copy2(backup_path, temporary)
        _integrity_check(temporary)
        _remove_sqlite_sidecars(db_path)
        os.replace(temporary, db_path)
        _integrity_check(db_path)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass

    return safety_backup
