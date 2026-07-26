from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from loguru import logger
from openai import APITimeoutError
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

from app.api.endpoints.workflows import execute_code_workflow_stream
from app.db.models import LLMConfig, NodeExecutionState, Workflow, WorkflowRun
from app.schemas.workflow import RunRequest
from app.services.ai.core.llm_service import generate_review
from app.services.ai.core.provider_errors import ProviderRequestError
from app.services.workflow.engine.async_executor import AsyncExecutor
from app.services.workflow.engine.run_manager import RunManager
from app.services.workflow.engine.state_manager import StateManager
from app.services.workflow.parser.marker_parser import WorkflowParser


WORKFLOW_PATH = (
    Path(__file__).resolve().parents[2]
    / "app"
    / "bootstrap"
    / "workflows"
    / "thinking_porn_spike.wf"
)


@pytest.fixture()
def session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as database_session:
        yield database_session


def create_workflow(session: Session) -> Workflow:
    for config_id in (11, 12, 13):
        session.add(
            LLMConfig(
                id=config_id,
                provider="test",
                model_name=f"test-model-{config_id}",
                api_key="test-key",
            )
        )
    workflow = Workflow(
        name="Thinking p*rn",
        description="stabilization privacy test",
        definition_code=WORKFLOW_PATH.read_text(encoding="utf-8"),
        is_active=True,
        is_built_in=True,
        keep_run_history=True,
    )
    session.add(workflow)
    session.commit()
    session.refresh(workflow)
    assert workflow.id is not None
    return workflow


def pipeline_params(source_text: str = "Pierwotny fragment.") -> dict[str, object]:
    return {
        "source_text": source_text,
        "brief": "Wzmocnij scenę bez zmiany faktów.",
        "kimi_llm_config_id": 11,
        "grok_llm_config_id": 12,
        "aion_llm_config_id": 13,
    }


async def consume_executor(
    session: Session,
    run_id: int,
    workflow: Workflow,
    initial_context: dict[str, object],
) -> None:
    executor = AsyncExecutor(
        session=session,
        state_manager=StateManager(session),
        run_id=run_id,
    )
    plan = WorkflowParser().parse(workflow.definition_code)
    async for _ in executor.execute_stream(plan, initial_context=initial_context):
        pass


async def collect_sse_events(response) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    async for chunk in response.body_iterator:
        text = chunk.decode("utf-8") if isinstance(chunk, bytes) else chunk
        for frame in text.split("\n\n"):
            if frame.startswith("data: "):
                events.append(json.loads(frame.removeprefix("data: ")))
    return events


@pytest.mark.asyncio
async def test_generate_review_normalizes_openai_timeout_without_original_cause(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Catches a missing provider-to-domain timeout normalization."""
    import app.services.ai.core.llm_service as llm_service_module

    provider_timeout = APITimeoutError(
        request=httpx.Request("POST", "https://provider-timeout.invalid/v1/chat"),
    )

    class TimeoutModel:
        async def ainvoke(self, messages):
            raise provider_timeout

    monkeypatch.setattr(
        llm_service_module,
        "build_chat_model",
        lambda **_kwargs: TimeoutModel(),
    )

    with pytest.raises(asyncio.TimeoutError, match="^Provider timeout$") as raised:
        await generate_review(
            session=session,
            llm_config_id=11,
            user_prompt="normalization boundary",
            track_stats=False,
        )

    assert raised.value.__cause__ is None


@pytest.mark.asyncio
async def test_openai_timeout_through_workflow_stream_preserves_completed_state(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Catches provider timeouts escaping the real workflow generation path."""
    import app.services.ai.core.llm_service as llm_service_module

    workflow = create_workflow(session)
    params = pipeline_params("PRIVATE_TIMEOUT_SOURCE_9F20")
    created = RunManager(session).create_run(
        workflow_id=workflow.id,
        params=params,
    )
    assert created.id is not None
    provider_timeout = APITimeoutError(
        request=httpx.Request(
            "POST",
            "https://PRIVATE_PROVIDER_REQUEST_9F20.invalid/v1/chat",
        ),
    )
    built_config_ids: list[int] = []

    class ModelForConfig:
        def __init__(self, config_id: int):
            self.config_id = config_id

        async def ainvoke(self, messages):
            if self.config_id == 11:
                return SimpleNamespace(content="Wersja Kimi po timeout")
            if self.config_id == 12:
                raise provider_timeout
            pytest.fail("Aion must not run after a provider timeout")

    def build_fake_chat_model(*, llm_config_id: int, **_kwargs):
        built_config_ids.append(llm_config_id)
        return ModelForConfig(llm_config_id)

    monkeypatch.setattr(
        llm_service_module,
        "build_chat_model",
        build_fake_chat_model,
    )

    response = await execute_code_workflow_stream(
        workflow.id,
        run_id=created.id,
        session=session,
    )
    events = await collect_sse_events(response)

    session.expire_all()
    run = session.get(WorkflowRun, created.id)
    states = {
        state.node_id: state
        for state in session.exec(
            select(NodeExecutionState).where(
                NodeExecutionState.run_id == created.id,
            )
        ).all()
    }
    timeout_event = next(
        event for event in events if event.get("code") == "provider_timeout"
    )

    assert built_config_ids == [11, 12]
    assert run is not None
    assert run.status == "timeout"
    assert run.params_json == params
    assert states["source"].outputs_json == {
        "value": "PRIVATE_TIMEOUT_SOURCE_9F20",
    }
    assert states["kimi"].status == "success"
    assert states["kimi"].outputs_json["text"] == "Wersja Kimi po timeout"
    assert states["kimi"].outputs_json["usage"]["llm_config_id"] == 11
    assert states["grok"].status == "error"
    assert "aion" not in states
    assert timeout_event["code"] == "provider_timeout"
    assert timeout_event["message"] == "Provider timeout"


@pytest.mark.asyncio
async def test_generic_provider_failure_is_sanitized_across_workflow_boundaries(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Catches raw provider failures leaking through persistence, logs, or SSE."""
    import app.services.ai.core.llm_service as llm_service_module

    private_marker = "PRIVATE_PROSE_MARKER_7f3c91"
    workflow = create_workflow(session)
    params = pipeline_params("Generic provider failure source")
    created = RunManager(session).create_run(
        workflow_id=workflow.id,
        params=params,
    )
    assert created.id is not None
    built_config_ids: list[int] = []

    class ModelForConfig:
        def __init__(self, config_id: int):
            self.config_id = config_id

        async def ainvoke(self, messages):
            if self.config_id == 11:
                return SimpleNamespace(content="Kimi result retained")
            if self.config_id == 12:
                raise RuntimeError(private_marker)
            pytest.fail("Aion must not run after a provider failure")

    def build_fake_chat_model(*, llm_config_id: int, **_kwargs):
        built_config_ids.append(llm_config_id)
        return ModelForConfig(llm_config_id)

    monkeypatch.setattr(
        llm_service_module,
        "build_chat_model",
        build_fake_chat_model,
    )

    messages: list[str] = []
    sink_id = logger.add(
        lambda message: messages.append(str(message)),
        format="{message}",
    )
    try:
        response = await execute_code_workflow_stream(
            workflow.id,
            run_id=created.id,
            session=session,
        )
        events = await collect_sse_events(response)
    finally:
        logger.remove(sink_id)

    session.expire_all()
    run = session.get(WorkflowRun, created.id)
    states = {
        state.node_id: state
        for state in session.exec(
            select(NodeExecutionState).where(
                NodeExecutionState.run_id == created.id,
            )
        ).all()
    }
    serialized_events = json.dumps(events, ensure_ascii=False, default=str)
    serialized_run_error = json.dumps(
        run.error_json if run is not None else None,
        ensure_ascii=False,
        default=str,
    )
    serialized_node_errors = json.dumps(
        {
            node_id: state.error_message
            for node_id, state in states.items()
        },
        ensure_ascii=False,
        default=str,
    )
    captured_logs = "".join(messages)

    assert private_marker not in captured_logs
    assert private_marker not in serialized_run_error
    assert private_marker not in serialized_node_errors
    assert private_marker not in serialized_events
    assert built_config_ids == [11, 12]
    assert run is not None
    assert run.status == "failed"
    assert run.error_json is not None
    assert run.error_json["message"] == "Provider request failed"
    assert run.error_json["details"] == {"code": "provider_error"}
    assert states["kimi"].status == "success"
    assert states["kimi"].outputs_json["text"] == "Kimi result retained"
    assert states["grok"].status == "error"
    assert states["grok"].error_message == "Provider request failed"
    assert "aion" not in states
    assert any(
        event.get("code") == "provider_error"
        and event.get("message") == "Provider request failed"
        and event.get("error") == "Provider request failed"
        for event in events
    )


@pytest.mark.asyncio
async def test_run_manager_persists_domain_provider_failure_without_traceback(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Catches RunManager treating a safe provider error as a generic exception."""
    workflow = create_workflow(session)
    created = RunManager(session).create_run(
        workflow_id=workflow.id,
        params=pipeline_params("Background run source"),
    )

    async def fail_with_provider_error(self, plan, initial_context):
        if False:
            yield None
        raise ProviderRequestError()

    monkeypatch.setattr(
        AsyncExecutor,
        "execute_stream",
        fail_with_provider_error,
    )

    messages: list[str] = []
    sink_id = logger.add(
        lambda message: messages.append(str(message)),
        format="{message}",
    )
    try:
        await RunManager(session)._execute_run(created, workflow)
    finally:
        logger.remove(sink_id)

    session.expire_all()
    run = session.get(WorkflowRun, created.id)
    captured_logs = "".join(messages)

    assert run is not None
    assert run.status == "failed"
    assert run.error_json is not None
    assert run.error_json["message"] == "Provider request failed"
    assert run.error_json["details"] == {"code": "provider_error"}
    assert "Traceback (most recent call last)" not in captured_logs


@pytest.mark.asyncio
async def test_workflow_logs_never_contain_private_persisted_or_provider_markers(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Catches private workflow values interpolated into logs across resume."""
    import app.services.ai.core.llm_service as llm_service_module

    initial_source_marker = "PRIVATE_INITIAL_SOURCE_A8C4"
    persisted_kimi_marker = "PRIVATE_PERSISTED_KIMI_6B31"
    resumed_grok_marker = "PRIVATE_RESUMED_GROK_D972"
    provider_request_marker = "PRIVATE_PROVIDER_REQUEST_E517"
    database_path = tmp_path / "privacy-resume.db"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    phase = {"value": "initial"}
    built_config_ids: list[tuple[str, int]] = []

    class ModelForPhase:
        def __init__(self, phase_name: str, config_id: int):
            self.phase_name = phase_name
            self.config_id = config_id

        async def ainvoke(self, messages):
            if self.phase_name == "initial":
                if self.config_id == 11:
                    return SimpleNamespace(content=persisted_kimi_marker)
                if self.config_id == 12:
                    raise RuntimeError("synthetic Grok failure")
            elif self.phase_name == "resume":
                if self.config_id == 12:
                    return SimpleNamespace(content=resumed_grok_marker)
                if self.config_id == 13:
                    return SimpleNamespace(content="Aion completion")
            elif self.phase_name == "provider":
                if self.config_id == 11:
                    return SimpleNamespace(content="Kimi before provider timeout")
                if self.config_id == 12:
                    raise APITimeoutError(
                        request=httpx.Request(
                            "POST",
                            f"https://{provider_request_marker}.invalid/v1/chat",
                        ),
                    )
            pytest.fail(
                f"Unexpected generation phase={self.phase_name}, config={self.config_id}",
            )

    def build_fake_chat_model(*, llm_config_id: int, **_kwargs):
        built_config_ids.append((phase["value"], llm_config_id))
        return ModelForPhase(phase["value"], llm_config_id)

    monkeypatch.setattr(
        llm_service_module,
        "build_chat_model",
        build_fake_chat_model,
    )

    messages: list[str] = []
    sink_id = logger.add(
        lambda message: messages.append(str(message)),
        format="{message}",
    )
    try:
        with Session(engine) as first_session:
            workflow = create_workflow(first_session)
            initial_params = pipeline_params(initial_source_marker)
            first_run = RunManager(first_session).create_run(
                workflow_id=workflow.id,
                params=initial_params,
            )
            assert first_run.id is not None
            first_run_id = first_run.id

            with pytest.raises(
                ProviderRequestError,
                match="^Provider request failed$",
            ):
                await consume_executor(
                    first_session,
                    first_run_id,
                    workflow,
                    initial_params,
                )

            StateManager(first_session).update_run_status(first_run_id, "failed")

        phase["value"] = "resume"
        with Session(engine) as second_session:
            resumed_run = second_session.get(WorkflowRun, first_run_id)
            workflow = second_session.get(Workflow, resumed_run.workflow_id)
            assert workflow is not None
            await consume_executor(
                second_session,
                first_run_id,
                workflow,
                pipeline_params(initial_source_marker),
            )
            StateManager(second_session).update_run_status(first_run_id, "succeeded")

            persisted_states = {
                state.node_id: state
                for state in second_session.exec(
                    select(NodeExecutionState).where(
                        NodeExecutionState.run_id == first_run_id,
                    )
                ).all()
            }
            assert persisted_states["kimi"].outputs_json["text"] == persisted_kimi_marker
            assert persisted_states["grok"].outputs_json["text"] == resumed_grok_marker
            assert persisted_states["aion"].status == "success"

            phase["value"] = "provider"
            provider_params = pipeline_params("Provider timeout source")
            provider_run = RunManager(second_session).create_run(
                workflow_id=workflow.id,
                params=provider_params,
            )
            assert provider_run.id is not None
            provider_response = await execute_code_workflow_stream(
                workflow.id,
                run_id=provider_run.id,
                session=second_session,
            )
            provider_events = await collect_sse_events(provider_response)

            provider_states = {
                state.node_id: state
                for state in second_session.exec(
                    select(NodeExecutionState).where(
                        NodeExecutionState.run_id == provider_run.id,
                    )
                ).all()
            }
            assert provider_states["kimi"].status == "success"
            assert provider_states["grok"].status == "error"
            assert "aion" not in provider_states
            assert any(
                event.get("code") == "provider_timeout"
                and event.get("message") == "Provider timeout"
                for event in provider_events
            )
    finally:
        logger.remove(sink_id)

    assert built_config_ids == [
        ("initial", 11),
        ("initial", 12),
        ("resume", 12),
        ("resume", 13),
        ("provider", 11),
        ("provider", 12),
    ]
    captured_logs = "".join(messages)
    for private_marker in (
        initial_source_marker,
        persisted_kimi_marker,
        resumed_grok_marker,
        provider_request_marker,
    ):
        assert private_marker not in captured_logs
