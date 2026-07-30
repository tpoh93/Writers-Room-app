import asyncio
import importlib
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
import pytest


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


@pytest.mark.asyncio
async def test_delayed_writer_put_waits_once_after_persistence() -> None:
    app = create_fixture_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://fixture") as client:
        armed = await client.post("/api/acceptance/writer-put-fault/delay?seconds=0.05")
        started_at = time.monotonic()
        delayed = await client.put("/api/cards/1")
        elapsed = time.monotonic() - started_at
        immediate_started_at = time.monotonic()
        immediate = await client.put("/api/cards/1")

    assert armed.status_code == 200
    assert armed.json()["armed"] == "delay"
    assert delayed.status_code == 200
    assert elapsed >= 0.04
    assert immediate.status_code == 200
    assert time.monotonic() - immediate_started_at < 0.04


async def wait_for_held_state(client: AsyncClient) -> None:
    for _ in range(50):
        status = await client.get("/api/acceptance/writer-put-fault")
        if status.json()["requestState"] == "held":
            return
        await asyncio.sleep(0.01)
    raise AssertionError("writer PUT did not enter held state")


@pytest.mark.asyncio
async def test_held_writer_put_requires_explicit_release() -> None:
    app = create_fixture_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://fixture") as client:
        armed = await client.post("/api/acceptance/writer-put-fault/hold")
        pending = asyncio.create_task(client.put("/api/cards/1"))
        await wait_for_held_state(client)

        assert not pending.done()
        released = await client.post("/api/acceptance/writer-put-fault/release")
        response = await asyncio.wait_for(pending, timeout=0.5)
        status = await client.get("/api/acceptance/writer-put-fault")

    assert armed.status_code == 200
    assert released.status_code == 200
    assert response.status_code == 200
    assert status.json()["requestState"] == "idle"


@pytest.mark.asyncio
async def test_clear_releases_held_writer_put_and_removes_fault() -> None:
    app = create_fixture_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://fixture") as client:
        assert (await client.post("/api/acceptance/writer-put-fault/hold")).status_code == 200
        pending = asyncio.create_task(client.put("/api/cards/1"))
        await wait_for_held_state(client)

        cleared = await client.delete("/api/acceptance/writer-put-fault")
        response = await asyncio.wait_for(pending, timeout=0.5)
        status = await client.get("/api/acceptance/writer-put-fault")

    assert cleared.json() == {
        "enabled": True,
        "armed": "none",
        "requestState": "idle",
        "delaySeconds": None,
    }
    assert response.status_code == 200
    assert status.json() == cleared.json()


def test_main_mounts_controls_only_when_fixture_flag_is_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    import main

    monkeypatch.delenv("NOVELFORGE_ACCEPTANCE_FAULTS", raising=False)
    normal_app = importlib.reload(main).app
    assert TestClient(normal_app).get("/api/acceptance/writer-put-fault").status_code == 404

    monkeypatch.setenv("NOVELFORGE_ACCEPTANCE_FAULTS", "1")
    fixture_app = importlib.reload(main).app
    try:
        response = TestClient(fixture_app).get("/api/acceptance/writer-put-fault")
        assert response.status_code == 200
        assert response.json()["enabled"] is True
    finally:
        monkeypatch.delenv("NOVELFORGE_ACCEPTANCE_FAULTS", raising=False)
        importlib.reload(main)


def test_acceptance_compose_is_the_only_compose_file_that_enables_faults() -> None:
    repository_root = Path(__file__).resolve().parents[3]
    acceptance_compose = (repository_root / "compose.acceptance.yaml").read_text(encoding="utf-8")
    normal_compose = (repository_root / "compose.yaml").read_text(encoding="utf-8")

    assert "NOVELFORGE_ACCEPTANCE_FAULTS: \"1\"" in acceptance_compose
    assert "NOVELFORGE_ACCEPTANCE_FAULTS" not in normal_compose
