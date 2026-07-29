from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.engine import Engine

import app.core.startup as startup_module
import app.db as db_package
from app.db import session as db_session
from app.db.models import Card, CardType, Project
from app.db.session import get_session
import main
from main import app


@pytest.fixture()
def isolated_engine(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[Engine, None, None]:
    database_path = tmp_path / "writer-ready-api.db"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    monkeypatch.setattr(db_session, "engine", engine)
    monkeypatch.setattr(db_package, "engine", engine)
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(startup_module, "engine", engine)

    def isolated_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = isolated_session
    try:
        yield engine
    finally:
        app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def test_writer_ready_put_persists_complete_snapshot_in_fresh_session(
    isolated_engine: Engine,
) -> None:
    with Session(isolated_engine) as setup_session:
        project = Project(
            name="Syntetyczny projekt API",
            description="Izolowany test writer-ready",
        )
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
            title="Tytuł początkowy",
            content={"content": "Treść początkowa"},
            project_id=project.id,
            card_type_id=card_type.id,
            ai_context_template="Początkowy szablon generowania",
            ai_context_template_review="Początkowy szablon recenzji",
            display_order=1,
            needs_confirmation=True,
        )
        setup_session.add(card)
        setup_session.commit()
        setup_session.refresh(card)
        card_id = card.id

    assert card_id is not None
    expected_snapshot = {
        "title": "Syntetyczna scena",
        "content": {"content": "Bezpieczny tekst"},
        "ai_context_template": "Szablon generowania",
        "ai_context_template_review": "Szablon recenzji",
        "needs_confirmation": False,
    }

    with TestClient(app) as client:
        response = client.put(f"/api/cards/{card_id}", json=expected_snapshot)

    assert response.status_code == 200
    response_card = response.json()
    for field, expected_value in expected_snapshot.items():
        assert response_card[field] == expected_value

    with Session(isolated_engine) as fresh_session:
        persisted = fresh_session.get(Card, card_id)
        assert persisted is not None
        assert persisted.title == expected_snapshot["title"]
        assert persisted.content == expected_snapshot["content"]
        assert persisted.ai_context_template == expected_snapshot["ai_context_template"]
        assert (
            persisted.ai_context_template_review
            == expected_snapshot["ai_context_template_review"]
        )
        assert persisted.needs_confirmation is False
