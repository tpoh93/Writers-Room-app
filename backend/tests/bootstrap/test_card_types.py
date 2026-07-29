from collections.abc import Generator

import pytest
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, Session, create_engine, select

from app.bootstrap.card_types import create_default_card_types
from app.db.models import CardType


@pytest.fixture()
def isolated_engine(tmp_path) -> Generator[Engine, None, None]:
    database_path = tmp_path / "card-types.db"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


def get_card_type(session: Session, name: str) -> CardType:
    return session.exec(select(CardType).where(CardType.name == name)).one()


def test_fresh_database_uses_generic_editor_for_scene_card(
    isolated_engine: Engine,
) -> None:
    with Session(isolated_engine) as session:
        custom_type = CardType(
            name="Autorski typ",
            model_name="CustomCard",
            editor_component="CustomEditor",
            built_in=False,
        )
        session.add(custom_type)
        session.commit()

        create_default_card_types(session)

        scene_type = get_card_type(session, "场景卡")
        unchanged_custom_type = get_card_type(session, "Autorski typ")
        assert scene_type.editor_component == "GenericCardEditor"
        assert unchanged_custom_type.editor_component == "CustomEditor"
        assert unchanged_custom_type.built_in is False


def test_bootstrap_repairs_existing_null_scene_editor_without_touching_user_type(
    isolated_engine: Engine,
) -> None:
    with Session(isolated_engine) as session:
        create_default_card_types(session)
        scene_type = get_card_type(session, "场景卡")
        scene_type.editor_component = None
        custom_type = CardType(
            name="Autorski typ",
            model_name="CustomCard",
            editor_component="CustomEditor",
            built_in=False,
        )
        session.add(scene_type)
        session.add(custom_type)
        session.commit()

        create_default_card_types(session)

        repaired_scene_type = get_card_type(session, "场景卡")
        unchanged_custom_type = get_card_type(session, "Autorski typ")
        assert repaired_scene_type.editor_component == "GenericCardEditor"
        assert unchanged_custom_type.editor_component == "CustomEditor"
        assert unchanged_custom_type.built_in is False
