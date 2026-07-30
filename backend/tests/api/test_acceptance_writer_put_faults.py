from fastapi import FastAPI
from fastapi.testclient import TestClient


def create_fixture_app() -> FastAPI:
    from app.acceptance.writer_put_faults import install_writer_put_fault_controls

    app = FastAPI()
    writes: list[int] = []

    @app.get("/healthz/live")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.put("/api/cards/{card_id}")
    def update_card(card_id: int) -> dict[str, int]:
        writes.append(card_id)
        return {"cardId": card_id, "writeCount": len(writes)}

    install_writer_put_fault_controls(app, api_prefix="/api")
    return app


def test_armed_http_500_is_consumed_by_one_writer_put() -> None:
    with TestClient(create_fixture_app()) as client:
        assert client.post("/api/acceptance/writer-put-fault/http-500").status_code == 200

        failed = client.put("/api/cards/1")
        succeeding = client.put("/api/cards/1")
        status = client.get("/api/acceptance/writer-put-fault")

    assert failed.status_code == 500
    assert failed.json() == {"detail": "fixture writer PUT fault"}
    assert succeeding.status_code == 200
    assert succeeding.json() == {"cardId": 1, "writeCount": 1}
    assert status.json() == {
        "enabled": True,
        "armed": "none",
        "requestState": "idle",
        "delaySeconds": None,
    }


def test_non_writer_requests_do_not_consume_the_fault() -> None:
    with TestClient(create_fixture_app()) as client:
        assert client.post("/api/acceptance/writer-put-fault/http-500").status_code == 200

        assert client.get("/healthz/live").json() == {"status": "ok"}
        status = client.get("/api/acceptance/writer-put-fault")
        failed = client.put("/api/cards/not-a-number")
        succeeding = client.put("/api/cards/2")

    assert status.json()["armed"] == "http-500"
    assert failed.status_code == 422
    assert succeeding.status_code == 500
