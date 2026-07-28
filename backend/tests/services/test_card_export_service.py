from __future__ import annotations

import json
import re

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

from app.db.models import Card, CardType, Project
from app.schemas.card import CardExportRequest
from app.services.card_export_service import CardExportService


@pytest.fixture()
def session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as database_session:
        project = Project(name="Projekt testowy")
        card_type = CardType(name="Typ prozy", model_name="Text")
        database_session.add(project)
        database_session.add(card_type)
        database_session.commit()
        database_session.refresh(project)
        database_session.refresh(card_type)

        root_first = Card(
            title="Pierwsza karta",
            content={"content": "Pierwszy syntetyczny akapit."},
            project_id=project.id,
            card_type_id=card_type.id,
            display_order=1,
        )
        root_second = Card(
            title="Druga karta",
            content={"content": "Drugi syntetyczny akapit."},
            project_id=project.id,
            card_type_id=card_type.id,
            display_order=2,
        )
        database_session.add(root_first)
        database_session.add(root_second)
        database_session.commit()
        database_session.refresh(root_first)

        child = Card(
            title="Podrzędna karta",
            content={"content": "Trzeci syntetyczny akapit."},
            project_id=project.id,
            card_type_id=card_type.id,
            parent_id=root_first.id,
            display_order=0,
        )
        database_session.add(child)
        database_session.commit()
        yield database_session
    engine.dispose()


def export_text(session: Session, *, scope: str = "all", format: str = "txt", **extra: int):
    project = session.query(Project).one()
    return CardExportService(session).export(
        project.id,
        CardExportRequest(scope=scope, format=format, **extra),
    ).content.decode("utf-8")


@pytest.mark.parametrize("format", ["txt", "md"])
def test_polish_fixture_has_polish_generated_copy_and_no_cjk(format: str, session: Session) -> None:
    artifact = export_text(session, format=format)

    assert "Projekt: Projekt testowy" in artifact
    assert "Zakres eksportu" in artifact
    assert "Liczba kart" in artifact
    assert "Pierwszy syntetyczny akapit." in artifact
    assert re.search(r"[\u4e00-\u9fff]", artifact) is None


@pytest.mark.parametrize("format", ["txt", "md", "json"])
def test_all_scopes_preserve_deterministic_card_order(format: str, session: Session) -> None:
    all_artifact = export_text(session, format=format)
    first = all_artifact.index("Pierwsza karta")
    child = all_artifact.index("Podrzędna karta")
    second = all_artifact.index("Druga karta")
    assert first < child < second

    first_card = session.query(Card).filter(Card.title == "Pierwsza karta").one()
    card_type = session.query(CardType).one()
    assert "Pierwsza karta" in export_text(session, scope="single", format=format, card_id=first_card.id)
    type_artifact = export_text(session, scope="type", format=format, card_type_id=card_type.id)
    assert "Pierwsza karta" in type_artifact
    assert "Podrzędna karta" in type_artifact
    assert "Druga karta" in type_artifact


def test_author_cjk_is_preserved_while_json_keeps_technical_field_names(session: Session) -> None:
    project = session.query(Project).one()
    card_type = session.query(CardType).one()
    author_card = Card(
        title="作者标题",
        content={"content": "作者保留的引文"},
        project_id=project.id,
        card_type_id=card_type.id,
        display_order=3,
    )
    session.add(author_card)
    session.commit()
    session.refresh(author_card)

    text = export_text(session, scope="single", format="txt", card_id=author_card.id)
    markdown = export_text(session, scope="single", format="md", card_id=author_card.id)
    payload = json.loads(export_text(session, scope="single", format="json", card_id=author_card.id))

    assert "作者标题" in text
    assert "作者保留的引文" in markdown
    assert payload["cards"][0]["title"] == "作者标题"
    assert payload["cards"][0]["content"] == {"content": "作者保留的引文"}
    assert set(payload) >= {"project", "scope", "format", "exported_at", "total_cards", "cards"}
