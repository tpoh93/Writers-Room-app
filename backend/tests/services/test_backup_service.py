import sqlite3
from pathlib import Path
from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, Session, create_engine

import app.core.startup as startup_module
import app.db as db_package
from app.db import session as db_session
from app.db.models import Card, CardType, Project
from app.db.session import get_session
from app.services.backup_service import create_backup, restore_backup
import main
from main import app


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


def test_restore_real_writer_models_requires_fresh_engine_and_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    database_path = tmp_path / "writer-ready-restore.db"
    backup_dir = tmp_path / "backups"
    old_engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(old_engine)

    old_request_sessions: list[Session] = []
    closed_request_sessions: list[Session] = []

    def install_runtime_engine(engine: Engine, sessions: list[Session] | None = None) -> None:
        monkeypatch.setattr(db_session, "engine", engine)
        monkeypatch.setattr(db_package, "engine", engine)
        monkeypatch.setattr(main, "engine", engine)
        monkeypatch.setattr(startup_module, "engine", engine)

        def get_runtime_session() -> Generator[Session, None, None]:
            session = Session(engine)
            if sessions is not None:
                sessions.append(session)
            try:
                yield session
            finally:
                session.close()
                if sessions is not None:
                    closed_request_sessions.append(session)

        app.dependency_overrides[get_session] = get_runtime_session

    install_runtime_engine(old_engine, old_request_sessions)
    try:
        with Session(old_engine) as setup_session:
            project = Project(name="Task 11 synthetic project", description="real model restore test")
            card_type = CardType(
                name="章节正文",
                model_name="Chapter",
                editor_component="CodeMirrorEditor",
            )
            setup_session.add(project)
            setup_session.add(card_type)
            setup_session.commit()
            setup_session.refresh(project)
            setup_session.refresh(card_type)
            card = Card(
                title="Backup title",
                content={"content": "Backup content"},
                project_id=project.id,
                card_type_id=card_type.id,
                ai_context_template="Backup generation template",
                ai_context_template_review="Backup review template",
            )
            setup_session.add(card)
            setup_session.commit()
            setup_session.refresh(card)
            card_id = card.id

        assert card_id is not None
        backed_up_snapshot = {
            "title": "Backup title",
            "content": {"content": "Backup content"},
            "ai_context_template": "Backup generation template",
            "ai_context_template_review": "Backup review template",
        }
        mutated_snapshot = {
            "title": "Mutated title",
            "content": {"content": "Mutated content"},
            "ai_context_template": "Mutated generation template",
            "ai_context_template_review": "Mutated review template",
        }

        backup_path = create_backup(database_path, backup_dir, label="writer-ready")
        with TestClient(app) as old_client:
            mutation = old_client.put(f"/api/cards/{card_id}", json=mutated_snapshot)
            assert mutation.status_code == 200
            for field, expected_value in mutated_snapshot.items():
                assert mutation.json()[field] == expected_value

        assert old_request_sessions == closed_request_sessions
        with patch.object(old_engine, "dispose", wraps=old_engine.dispose) as dispose:
            old_engine.dispose()
            dispose.assert_called_once_with()

        safety_backup = restore_backup(backup_path, database_path, force=True)
        assert safety_backup is not None
        safety_engine = create_engine(f"sqlite:///{safety_backup}")
        try:
            with Session(safety_engine) as safety_session:
                safety_card = safety_session.get(Card, card_id)
                assert safety_card is not None
                for field, expected_value in mutated_snapshot.items():
                    assert getattr(safety_card, field) == expected_value
        finally:
            safety_engine.dispose()

        fresh_engine = create_engine(
            f"sqlite:///{database_path}",
            connect_args={"check_same_thread": False},
        )
        install_runtime_engine(fresh_engine)
        try:
            with TestClient(app) as fresh_client:
                restored = fresh_client.get(f"/api/cards/{card_id}")
            assert restored.status_code == 200
            for field, expected_value in backed_up_snapshot.items():
                assert restored.json()[field] == expected_value
        finally:
            fresh_engine.dispose()
    finally:
        app.dependency_overrides.pop(get_session, None)
        old_engine.dispose()
