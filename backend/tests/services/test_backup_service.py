import sqlite3
from pathlib import Path

import pytest

from app.services.backup_service import create_backup, restore_backup


def write_value(path: Path, value: str) -> None:
    with sqlite3.connect(path) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS sample(value TEXT NOT NULL)")
        conn.execute("DELETE FROM sample")
        conn.execute("INSERT INTO sample(value) VALUES (?)", (value,))
        conn.commit()


def read_value(path: Path) -> str:
    with sqlite3.connect(path) as conn:
        row = conn.execute("SELECT value FROM sample").fetchone()
    assert row is not None
    return row[0]


def test_backup_and_restore_round_trip(tmp_path: Path) -> None:
    db_path = tmp_path / "live.db"
    backup_dir = tmp_path / "backups"
    write_value(db_path, "before")

    backup_path = create_backup(db_path, backup_dir, label="roundtrip")
    write_value(db_path, "after")
    safety_backup = restore_backup(backup_path, db_path, force=True)

    assert backup_path.parent == backup_dir
    assert "roundtrip" in backup_path.name
    assert read_value(db_path) == "before"
    assert safety_backup is not None
    assert read_value(safety_backup) == "after"


def test_restore_refuses_existing_database_without_force(tmp_path: Path) -> None:
    db_path = tmp_path / "live.db"
    backup_dir = tmp_path / "backups"
    write_value(db_path, "before")
    backup_path = create_backup(db_path, backup_dir)

    with pytest.raises(FileExistsError):
        restore_backup(backup_path, db_path, force=False)

    assert read_value(db_path) == "before"


def test_restore_rejects_corrupt_backup_without_touching_live_database(tmp_path: Path) -> None:
    db_path = tmp_path / "live.db"
    corrupt_backup = tmp_path / "corrupt.db"
    write_value(db_path, "safe")
    corrupt_backup.write_bytes(b"not a sqlite database")

    with pytest.raises(ValueError, match="integrity check"):
        restore_backup(corrupt_backup, db_path, force=True)

    assert read_value(db_path) == "safe"


def test_restore_removes_stale_sqlite_sidecars(tmp_path: Path) -> None:
    db_path = tmp_path / "live.db"
    backup_dir = tmp_path / "backups"
    write_value(db_path, "before")
    backup_path = create_backup(db_path, backup_dir)
    write_value(db_path, "after")

    wal = Path(f"{db_path}-wal")
    shm = Path(f"{db_path}-shm")
    wal.write_bytes(b"stale")
    shm.write_bytes(b"stale")

    restore_backup(backup_path, db_path, force=True)

    assert read_value(db_path) == "before"
    assert not wal.exists()
    assert not shm.exists()


def test_backup_label_cannot_create_subdirectories(tmp_path: Path) -> None:
    db_path = tmp_path / "live.db"
    backup_dir = tmp_path / "backups"
    write_value(db_path, "value")

    backup_path = create_backup(db_path, backup_dir, label="../../unsafe label")

    assert backup_path.parent == backup_dir
    assert "/" not in backup_path.name
    assert "unsafe" in backup_path.name
