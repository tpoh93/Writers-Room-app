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


def add_card_with_type(
    session: Session,
    *,
    type_name: str,
    title: str,
    content: dict[str, object],
    display_order: int,
) -> Card:
    project = session.query(Project).one()
    card_type = CardType(name=type_name, model_name="Text")
    session.add(card_type)
    session.commit()
    session.refresh(card_type)
    card = Card(
        title=title,
        content=content,
        project_id=project.id,
        card_type_id=card_type.id,
        display_order=display_order,
    )
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@pytest.mark.parametrize("format", ["txt", "md"])
def test_polish_fixture_has_polish_generated_copy_and_no_cjk(format: str, session: Session) -> None:
    artifact = export_text(session, format=format)

    assert "Projekt: Projekt testowy" in artifact
    assert "Zakres eksportu" in artifact
    assert "Liczba kart" in artifact
    assert "Pierwszy syntetyczny akapit." in artifact
    assert re.search(r"[\u4e00-\u9fff]", artifact) is None


@pytest.mark.parametrize("format", ["txt", "md"])
def test_known_canonical_type_names_use_polish_generated_labels_without_cjk(
    format: str,
    session: Session,
) -> None:
    for order, (type_name, title) in enumerate(
        [
            ("章节正文", "Scena główna"),
            ("通用文本", "Scena poboczna"),
            ("场景卡", "Karta referencyjna"),
        ],
        start=10,
    ):
        add_card_with_type(
            session,
            type_name=type_name,
            title=title,
            content={"content": f"Syntetyczna treść {order}."},
            display_order=order,
        )

    artifact = export_text(session, format=format)

    assert "Treść rozdziału" in artifact
    assert "Tekst ogólny" in artifact
    assert "Karta sceny" in artifact
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
    card_type = CardType(name="场景卡", model_name="SceneCard")
    session.add(card_type)
    session.commit()
    session.refresh(card_type)
    author_card = Card(
        title="作者标题",
        content={
            "content": "作者保留的引文",
            "name": "作者姓名",
            "quote": "作者原始引文",
        },
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
    assert "Karta sceny" in text
    assert payload["cards"][0]["title"] == "作者标题"
    assert payload["cards"][0]["content"] == {
        "content": "作者保留的引文",
        "name": "作者姓名",
        "quote": "作者原始引文",
    }
    assert payload["cards"][0]["card_type_name"] == "场景卡"
    assert set(payload) >= {"project", "scope", "format", "exported_at", "total_cards", "cards"}
