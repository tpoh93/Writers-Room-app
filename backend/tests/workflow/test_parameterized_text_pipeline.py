from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from loguru import logger
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

from app.api.endpoints.workflows import (
    create_parameterized_workflow_run,
    execute_code_workflow_stream,
    get_run_node_states,
    router,
)
from app.bootstrap.workflows import _parse_code_workflow
from app.db.models import (
    LLMConfig,
    NodeExecutionState,
    Workflow,
    WorkflowRun,
)
from app.services.ai.core.llm_service import generate_review
from app.services.ai.core.token_utils import (
    calc_input_tokens,
    estimate_tokens,
)
from app.schemas.workflow import RunRequest
from app.services.workflow.engine.async_executor import AsyncExecutor
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


def create_test_llm_configs(session: Session) -> None:
    for config_id in (11, 12, 13):
        session.add(
            LLMConfig(
                id=config_id,
                provider="test",
                model_name=f"test-model-{config_id}",
                api_key="test-key",
            )
        )
    session.commit()


def create_workflow(session: Session) -> Workflow:
    create_test_llm_configs(session)
    workflow = Workflow(
        name="Thinking p*rn",
        description="test pipeline",
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


def pipeline_params() -> dict[str, object]:
    return {
        "source_text": "Pierwotny fragment.",
        "brief": "Wzmocnij scenę bez zmiany faktów.",
        "kimi_llm_config_id": 11,
        "grok_llm_config_id": 12,
        "aion_llm_config_id": 13,
    }


async def collect_sse_events(response) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    async for chunk in response.body_iterator:
        text = chunk.decode("utf-8") if isinstance(chunk, bytes) else chunk
        for frame in text.split("\n\n"):
            if frame.startswith("data: "):
                events.append(json.loads(frame.removeprefix("data: ")))
    return events


def test_create_parameterized_run_persists_params_and_is_idempotent(
    session: Session,
) -> None:
    workflow = create_workflow(session)
    payload = RunRequest(
        scope_json={"project_id": 7},
        params_json=pipeline_params(),
        idempotency_key="selection:card-7:hash-abc",
    )

    first = create_parameterized_workflow_run(workflow.id, payload, session)
    second = create_parameterized_workflow_run(workflow.id, payload, session)

    assert first.run_id == second.run_id
    run = session.get(WorkflowRun, first.run_id)
    assert run is not None
    assert run.status == "queued"
    assert run.scope_json == {"project_id": 7}
    assert run.params_json == pipeline_params()


def test_node_state_endpoint_returns_persisted_outputs(session: Session) -> None:
    workflow = create_workflow(session)
    created = create_parameterized_workflow_run(
        workflow.id,
        RunRequest(params_json=pipeline_params()),
        session,
    )
    session.add(
        NodeExecutionState(
            run_id=created.run_id,
            node_id="kimi",
            node_type="AI.TextGenerate",
            status="success",
            progress=100,
            outputs_json={"text": "Wersja Kimi"},
        )
    )
    session.commit()

    states = get_run_node_states(created.run_id, session)

    assert len(states) == 1
    assert states[0].node_id == "kimi"
    assert states[0].outputs_json == {"text": "Wersja Kimi"}


def test_static_run_routes_are_registered_before_dynamic_workflow_route() -> None:
    paths = [route.path for route in router.routes]

    assert paths.index("/workflows/runs/{run_id}") < paths.index(
        "/workflows/{workflow_id}"
    )
    assert paths.index("/workflows/runs/{run_id}/node-states") < paths.index(
        "/workflows/{workflow_id}"
    )


def test_builtin_workflow_explicitly_keeps_run_history() -> None:
    parsed = _parse_code_workflow(str(WORKFLOW_PATH))

    assert parsed["keep_run_history"] is True


def test_workflow_retention_metadata_rejects_invalid_value(
    tmp_path: Path,
) -> None:
    workflow_path = tmp_path / "invalid.wf"
    workflow_path.write_text(
        "# workflow-name: Invalid\n"
        "# workflow-keep-run-history: perhaps\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="workflow-keep-run-history"):
        _parse_code_workflow(str(workflow_path))


def test_builtin_workflow_has_exact_display_name_and_valid_dependencies() -> None:
    parsed_file = _parse_code_workflow(str(WORKFLOW_PATH))
    plan = WorkflowParser().parse(parsed_file["code"])

    assert parsed_file["name"] == "Thinking p*rn"
    assert [statement.variable for statement in plan.statements] == [
        "source",
        "brief_input",
        "kimi_config",
        "grok_config",
        "aion_config",
        "kimi",
        "grok",
        "aion",
    ]
    assert plan.statements[5].node_type == "AI.TextGenerate"
    assert "kimi" in plan.statements[6].depends_on
    assert {"kimi", "grok"}.issubset(plan.statements[7].depends_on)


@pytest.mark.asyncio
async def test_three_models_execute_in_order_with_intended_handoffs(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.workflow.nodes.ai.text_generate as text_generate_module

    workflow = create_workflow(session)
    created = create_parameterized_workflow_run(
        workflow.id,
        RunRequest(params_json=pipeline_params()),
        session,
    )
    calls: list[tuple[int, str]] = []

    async def fake_generate_review(**kwargs) -> str:
        config_id = kwargs["llm_config_id"]
        prompt = kwargs["user_prompt"]
        calls.append((config_id, prompt))
        return {
            11: "Wersja Kimi",
            12: "Wersja Groka",
            13: "Wersja Aiona",
        }[config_id]

    monkeypatch.setattr(
        text_generate_module,
        "generate_review",
        fake_generate_review,
    )

    plan = WorkflowParser().parse(workflow.definition_code)
    executor = AsyncExecutor(
        session=session,
        state_manager=StateManager(session),
        run_id=created.run_id,
    )
    events = []
    async for event in executor.execute_stream(plan, initial_context=pipeline_params()):
        events.append(event)

    assert [config_id for config_id, _ in calls] == [11, 12, 13]
    assert "Pierwotny fragment." in calls[0][1]
    assert "Wersja Kimi" in calls[1][1]
    assert "Wersja Kimi" in calls[2][1]
    assert "Wersja Groka" in calls[2][1]
    assert any(event.type == "workflow_complete" for event in events)

    states = session.exec(
        select(NodeExecutionState)
        .where(NodeExecutionState.run_id == created.run_id)
        .order_by(NodeExecutionState.id)
    ).all()
    ai_states = [state for state in states if state.node_type == "AI.TextGenerate"]
    assert [state.node_id for state in ai_states] == ["kimi", "grok", "aion"]
    assert [
        state.outputs_json["text"]
        for state in ai_states
    ] == [
        "Wersja Kimi",
        "Wersja Groka",
        "Wersja Aiona",
    ]
    assert all(
        state.outputs_json.get("usage")
        for state in ai_states
    )


@pytest.mark.asyncio
async def test_text_generate_persists_usage_metadata(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.workflow.nodes.ai.text_generate as text_generate_module

    workflow = create_workflow(session)
    created = create_parameterized_workflow_run(
        workflow.id,
        RunRequest(params_json=pipeline_params()),
        session,
    )
    calls: list[dict[str, object]] = []

    async def fake_generate_review(**kwargs) -> str:
        calls.append(kwargs)
        return {
            11: "Wersja Kimi",
            12: "Wersja Groka",
            13: "Wersja Aiona",
        }[kwargs["llm_config_id"]]

    monkeypatch.setattr(
        text_generate_module,
        "generate_review",
        fake_generate_review,
    )

    plan = WorkflowParser().parse(workflow.definition_code)
    executor = AsyncExecutor(
        session=session,
        state_manager=StateManager(session),
        run_id=created.run_id,
    )

    async for _ in executor.execute_stream(
        plan,
        initial_context=pipeline_params(),
    ):
        pass

    kimi_state = session.exec(
        select(NodeExecutionState).where(
            NodeExecutionState.run_id == created.run_id,
            NodeExecutionState.node_id == "kimi",
        )
    ).first()

    assert kimi_state is not None
    assert kimi_state.outputs_json is not None

    expected_input_tokens = calc_input_tokens(
        calls[0]["system_prompt"],
        calls[0]["user_prompt"],
    )
    expected_output_tokens = estimate_tokens("Wersja Kimi")

    assert kimi_state.outputs_json["text"] == "Wersja Kimi"
    assert kimi_state.outputs_json["usage"] == {
        "llm_config_id": 11,
        "model_name": "test-model-11",
        "input_tokens": pytest.approx(
            expected_input_tokens,
            rel=0,
            abs=2,
        ),
        "output_tokens": pytest.approx(
            expected_output_tokens,
            rel=0,
            abs=2,
        ),
        "duration_ms": pytest.approx(0, abs=5000),
        "estimated_cost_usd": None,
        "cost_status": "pricing_unavailable",
    }


@pytest.mark.asyncio
async def test_generate_review_does_not_log_private_prompt(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.ai.core.llm_service as llm_service_module

    private_marker = "PRIVATE_SCENE_MARKER_91A7"

    class FakeModel:
        async def ainvoke(self, messages):
            return SimpleNamespace(content="Bezpieczna odpowiedź")

    monkeypatch.setattr(
        llm_service_module,
        "build_chat_model",
        lambda **kwargs: FakeModel(),
    )

    messages: list[str] = []
    sink_id = logger.add(
        lambda message: messages.append(str(message)),
        format="{message}",
    )

    try:
        result = await generate_review(
            session=session,
            llm_config_id=11,
            user_prompt=private_marker,
            system_prompt="System testowy",
            track_stats=False,
        )
    finally:
        logger.remove(sink_id)

    assert result == "Bezpieczna odpowiedź"
    assert private_marker not in "".join(messages)


@pytest.mark.asyncio
async def test_failure_preserves_completed_output_and_resume_skips_kimi(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.workflow.nodes.ai.text_generate as text_generate_module

    workflow = create_workflow(session)
    created = create_parameterized_workflow_run(
        workflow.id,
        RunRequest(params_json=pipeline_params()),
        session,
    )
    first_calls: list[int] = []

    async def fail_on_grok(**kwargs) -> str:
        config_id = kwargs["llm_config_id"]
        first_calls.append(config_id)
        if config_id == 12:
            raise RuntimeError("synthetic Grok failure")
        return "Wersja Kimi"

    monkeypatch.setattr(text_generate_module, "generate_review", fail_on_grok)
    plan = WorkflowParser().parse(workflow.definition_code)
    first_executor = AsyncExecutor(
        session=session,
        state_manager=StateManager(session),
        run_id=created.run_id,
    )

    with pytest.raises(RuntimeError, match="synthetic Grok failure"):
        async for _ in first_executor.execute_stream(
            plan,
            initial_context=pipeline_params(),
        ):
            pass

    kimi_state = session.exec(
        select(NodeExecutionState).where(
            NodeExecutionState.run_id == created.run_id,
            NodeExecutionState.node_id == "kimi",
        )
    ).first()
    grok_state = session.exec(
        select(NodeExecutionState).where(
            NodeExecutionState.run_id == created.run_id,
            NodeExecutionState.node_id == "grok",
        )
    ).first()
    assert first_calls == [11, 12]
    assert kimi_state is not None
    assert kimi_state.status == "success"
    assert kimi_state.outputs_json["text"] == "Wersja Kimi"
    assert kimi_state.outputs_json["usage"]["llm_config_id"] == 11
    assert grok_state is not None
    assert grok_state.status == "error"

    resumed_calls: list[int] = []

    async def complete_remaining(**kwargs) -> str:
        config_id = kwargs["llm_config_id"]
        resumed_calls.append(config_id)
        return {12: "Wersja Groka", 13: "Wersja Aiona"}[config_id]

    monkeypatch.setattr(
        text_generate_module,
        "generate_review",
        complete_remaining,
    )
    resumed_executor = AsyncExecutor(
        session=session,
        state_manager=StateManager(session),
        run_id=created.run_id,
    )
    async for _ in resumed_executor.execute_stream(
        plan,
        initial_context=pipeline_params(),
    ):
        pass

    assert resumed_calls == [12, 13]
    final_states = session.exec(
        select(NodeExecutionState).where(
            NodeExecutionState.run_id == created.run_id,
            NodeExecutionState.node_id.in_(["kimi", "grok", "aion"]),
        )
    ).all()
    assert {state.node_id: state.status for state in final_states} == {
        "kimi": "success",
        "grok": "success",
        "aion": "success",
    }


@pytest.mark.asyncio
async def test_grok_timeout_preserves_kimi_and_marks_run_timeout(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.workflow.nodes.ai.text_generate as text_generate_module

    workflow = create_workflow(session)
    params = pipeline_params()
    params["source_text"] = "PRIVATE_TIMEOUT_SOURCE_4E91"
    created = create_parameterized_workflow_run(
        workflow.id,
        RunRequest(params_json=params),
        session,
    )
    calls: list[int] = []

    async def timeout_on_grok(**kwargs) -> str:
        config_id = kwargs["llm_config_id"]
        calls.append(config_id)
        if config_id == 12:
            raise asyncio.TimeoutError("synthetic provider timeout")
        if config_id == 13:
            pytest.fail("Aion must not run after a Grok timeout")
        return "Wersja Kimi"

    monkeypatch.setattr(
        text_generate_module,
        "generate_review",
        timeout_on_grok,
    )

    messages: list[str] = []
    sink_id = logger.add(
        lambda message: messages.append(str(message)),
        format="{message}",
    )
    try:
        response = await execute_code_workflow_stream(
            workflow.id,
            run_id=created.run_id,
            session=session,
        )
        events = await collect_sse_events(response)
    finally:
        logger.remove(sink_id)

    session.expire_all()
    run = session.get(WorkflowRun, created.run_id)
    states = session.exec(
        select(NodeExecutionState).where(
            NodeExecutionState.run_id == created.run_id,
        )
    ).all()
    states_by_id = {state.node_id: state for state in states}

    assert "PRIVATE_TIMEOUT_SOURCE_4E91" not in "".join(messages)
    assert calls == [11, 12]
    assert run is not None
    assert run.status == "timeout"
    assert run.params_json == params
    assert states_by_id["source"].outputs_json == {
        "value": "PRIVATE_TIMEOUT_SOURCE_4E91",
    }
    assert states_by_id["kimi"].status == "success"
    assert states_by_id["kimi"].outputs_json["text"] == "Wersja Kimi"
    assert states_by_id["grok"].status == "error"
    assert "aion" not in states_by_id

    kimi_complete = next(
        event for event in events
        if event.get("type") == "complete"
        and event.get("statement", {}).get("variable") == "kimi"
    )
    assert states_by_id["kimi"].outputs_json["usage"] == (
        kimi_complete["result"]["usage"]
    )

    timeout_event = next(
        event for event in events
        if event.get("code") == "provider_timeout"
    )
    assert timeout_event == {
        "type": "error",
        "error": "Provider timeout",
        "code": "provider_timeout",
        "message": "Provider timeout",
    }
    assert "synthetic provider timeout" not in "".join(messages)


@pytest.mark.asyncio
async def test_empty_grok_response_never_runs_aion(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.workflow.nodes.ai.text_generate as text_generate_module

    workflow = create_workflow(session)
    params = pipeline_params()
    params["source_text"] = "PRIVATE_EMPTY_SOURCE_7C23"
    created = create_parameterized_workflow_run(
        workflow.id,
        RunRequest(params_json=params),
        session,
    )
    calls: list[int] = []

    async def empty_on_grok(**kwargs) -> str:
        config_id = kwargs["llm_config_id"]
        calls.append(config_id)
        if config_id == 12:
            raise ValueError("LLM返回了空响应")
        if config_id == 13:
            pytest.fail("Aion must not run after an empty Grok response")
        return "Wersja Kimi"

    monkeypatch.setattr(
        text_generate_module,
        "generate_review",
        empty_on_grok,
    )

    messages: list[str] = []
    sink_id = logger.add(
        lambda message: messages.append(str(message)),
        format="{message}",
    )
    try:
        response = await execute_code_workflow_stream(
            workflow.id,
            run_id=created.run_id,
            session=session,
        )
        events = await collect_sse_events(response)
    finally:
        logger.remove(sink_id)

    session.expire_all()
    run = session.get(WorkflowRun, created.run_id)
    states = session.exec(
        select(NodeExecutionState).where(
            NodeExecutionState.run_id == created.run_id,
        )
    ).all()
    states_by_id = {state.node_id: state for state in states}

    assert "PRIVATE_EMPTY_SOURCE_7C23" not in "".join(messages)
    assert calls == [11, 12]
    assert run is not None
    assert run.params_json == params
    assert states_by_id["source"].outputs_json == {
        "value": "PRIVATE_EMPTY_SOURCE_7C23",
    }
    assert states_by_id["kimi"].status == "success"
    assert states_by_id["grok"].status == "error"
    assert states_by_id["grok"].error_message == "Workflow node execution failed"
    assert "LLM返回了空响应" not in "".join(messages)
    assert "aion" not in states_by_id
    assert any(
        event.get("type") == "error"
        and event.get("statement", {}).get("variable") == "grok"
        and event.get("error") == "Workflow node execution failed"
        for event in events
    )
