from fastapi.testclient import TestClient

from main import app


def test_liveness_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/healthz/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_endpoint_reports_database() -> None:
    with TestClient(app) as client:
        response = client.get("/healthz/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}
