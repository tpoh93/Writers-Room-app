from fastapi.testclient import TestClient
from main import app
from app.db.models import CardType, Card, Project
from sqlmodel import Session
from app.db import engine

def test_writer_ready_put_atomic_templates():
    with TestClient(app) as client:
        # create synthetic writer-ready card
        project = Project(name="Test WR Project")
        with Session(engine) as session:
            session.add(project)
            session.commit()
            session.refresh(project)
            card_type = CardType(name="章节正文", editor_component="CodeMirrorEditor")
            session.add(card_type)
            session.commit()
            session.refresh(card_type)
            card = Card(
                title="Test Title",
                content={"content": "Test content"},
                project_id=project.id,
                card_type_id=card_type.id,
                ai_context_template="Test gen",
                ai_context_template_review="Test review",
                display_order=1,
            )
            session.add(card)
            session.commit()
            session.refresh(card)
        response = client.put(f'/api/cards/{card.id}', json={
            'title': 'Syntetyczna scena',
            'content': {'content': 'Bezpieczny tekst'},
            'ai_context_template': 'Szablon generowania',
            'ai_context_template_review': 'Szablon recenzji',
            'needs_confirmation': False,
        })
        assert response.status_code == 200
        assert response.json().get('ai_context_template_review') == 'Szablon recenzji'
        # verify db
        with Session(engine) as session:
            updated = session.get(Card, card.id)
            assert updated.ai_context_template_review == 'Szablon recenzji'
