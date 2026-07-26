from __future__ import annotations

from pathlib import Path

import pytest
from sqlmodel import SQLModel, Session, create_engine

from app.api.endpoints.workflows import get_run, get_run_node_states
from app.db.models import LLMConfig, Workflow
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


def pipeline_params() -> dict[str, object]:
    return {
        "source_text": "Pierwotny fragment.",
        "brief": "Wzmocnij scenę bez zmiany faktów.",
        "kimi_llm_config_id": 11,
        "grok_llm_config_id": 12,
        "aion_llm_config_id": 13,
    }


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


def create_test_workflow(session: Session) -> Workflow:
    create_test_llm_configs(session)
    workflow = Workflow(
        name="Thinking p*rn",
        description="restart persistence test",
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


async def consume_run(
    *,
    session: Session,
    run_id: int,
    workflow: Workflow,
) -> None:
    plan = WorkflowParser().parse(workflow.definition_code)
    executor = AsyncExecutor(
        session=session,
        state_manager=StateManager(session),
        run_id=run_id,
    )

    async for _ in executor.execute_stream(
        plan,
        initial_context=pipeline_params(),
    ):
        pass


@pytest.mark.asyncio
async def test_completed_run_and_outputs_survive_fresh_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.workflow.nodes.ai.text_generate as text_generate_module

    database_path = tmp_path / "completed-history.db"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    async def fake_generate_review(**kwargs) -> str:
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

    with Session(engine) as first_session:
        workflow = create_test_workflow(first_session)
        run = RunManager(first_session).create_run(
            workflow_id=workflow.id,
            params=pipeline_params(),
        )

        assert run.id is not None
        run_id = run.id

        await consume_run(
            session=first_session,
            run_id=run_id,
            workflow=workflow,
        )
        StateManager(first_session).update_run_status(
            run_id,
            "succeeded",
        )

    with Session(engine) as second_session:
        restored_run = get_run(run_id, second_session)
        restored_states = get_run_node_states(run_id, second_session)

        assert restored_run.status == "succeeded"
        assert restored_run.params_json == pipeline_params()

        ai_states = {
            state.node_id: state
            for state in restored_states
            if state.node_id in {"kimi", "grok", "aion"}
        }

        assert {
            node_id: state.status
            for node_id, state in ai_states.items()
        } == {
            "kimi": "success",
            "grok": "success",
            "aion": "success",
        }

        assert {
            node_id: state.outputs_json["text"]
            for node_id, state in ai_states.items()
        } == {
            "kimi": "Wersja Kimi",
            "grok": "Wersja Groka",
            "aion": "Wersja Aiona",
        }


@pytest.mark.asyncio
async def test_failed_grok_resume_after_fresh_session_skips_kimi(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.workflow.nodes.ai.text_generate as text_generate_module

    database_path = tmp_path / "resume-history.db"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    first_calls: list[int] = []

    async def fail_on_grok(**kwargs) -> str:
        config_id = kwargs["llm_config_id"]
        first_calls.append(config_id)

        if config_id == 12:
            raise RuntimeError("synthetic Grok failure")

        return "Wersja Kimi"

    monkeypatch.setattr(
        text_generate_module,
        "generate_review",
        fail_on_grok,
    )

    with Session(engine) as first_session:
        workflow = create_test_workflow(first_session)
        run = RunManager(first_session).create_run(
            workflow_id=workflow.id,
            params=pipeline_params(),
        )

        assert run.id is not None
        run_id = run.id

        with pytest.raises(
            RuntimeError,
            match="synthetic Grok failure",
        ):
            await consume_run(
                session=first_session,
                run_id=run_id,
                workflow=workflow,
            )

        StateManager(first_session).update_run_status(
            run_id,
            "failed",
        )

        assert first_calls == [11, 12]

    resumed_calls: list[int] = []

    async def complete_remaining(**kwargs) -> str:
        config_id = kwargs["llm_config_id"]
        resumed_calls.append(config_id)

        return {
            12: "Wersja Groka",
            13: "Wersja Aiona",
        }[config_id]

    monkeypatch.setattr(
        text_generate_module,
        "generate_review",
        complete_remaining,
    )

    with Session(engine) as second_session:
        restored_run = get_run(run_id, second_session)
        workflow = second_session.get(
            Workflow,
            restored_run.workflow_id,
        )

        assert workflow is not None
        assert restored_run.status == "failed"

        StateManager(second_session).update_run_status(
            run_id,
            "running",
        )

        await consume_run(
            session=second_session,
            run_id=run_id,
            workflow=workflow,
        )

        StateManager(second_session).update_run_status(
            run_id,
            "succeeded",
        )

        restored_states = get_run_node_states(run_id, second_session)
        ai_states = {
            state.node_id: state
            for state in restored_states
            if state.node_id in {"kimi", "grok", "aion"}
        }

        assert resumed_calls == [12, 13]
        assert {
            node_id: state.status
            for node_id, state in ai_states.items()
        } == {
            "kimi": "success",
            "grok": "success",
            "aion": "success",
        }

        assert (
            ai_states["kimi"].outputs_json["text"]
            == "Wersja Kimi"
        )
        assert (
            ai_states["grok"].outputs_json["text"]
            == "Wersja Groka"
        )
        assert (
            ai_states["aion"].outputs_json["text"]
            == "Wersja Aiona"
        )
        assert all(
            state.outputs_json.get("usage")
            for state in ai_states.values()
        )
