from pathlib import Path


path = Path("backend/app/api/endpoints/workflows.py")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    "from app.db.models import Workflow, WorkflowRun",
    "from app.db.models import Workflow, WorkflowRun, NodeExecutionState",
    "model import",
)

replace_once(
    """    RunStatus,\n    NodeTypesResponse,\n)""",
    """    RunStatus,\n    NodeTypesResponse,\n    WorkflowRunCreated,\n    NodeExecutionStateRead,\n)""",
    "workflow schema imports",
)

replace_once(
    """    return wf\n\n\n@router.get(\"/workflows/project-templates\")""",
    """    return wf\n\n\n@router.post(\"/workflows/{workflow_id}/runs\", response_model=WorkflowRunCreated)\ndef create_parameterized_workflow_run(\n    workflow_id: int,\n    payload: RunRequest,\n    session: Session = Depends(get_session),\n):\n    workflow = session.get(Workflow, workflow_id)\n    if not workflow:\n        raise HTTPException(status_code=404, detail=\"Workflow not found\")\n    if not workflow.is_active:\n        raise HTTPException(status_code=400, detail=\"Workflow is not active\")\n\n    run = RunManager(session).create_run(\n        workflow_id=workflow_id,\n        trigger_data=payload.scope_json,\n        params=payload.params_json,\n        idempotency_key=payload.idempotency_key,\n    )\n    return WorkflowRunCreated(\n        run_id=run.id,\n        workflow_id=run.workflow_id,\n        status=run.status,\n    )\n\n\n@router.get(\"/workflows/runs/{run_id}\", response_model=WorkflowRunRead)\ndef get_run(run_id: int, session: Session = Depends(get_session)):\n    run = session.get(WorkflowRun, run_id)\n    if not run:\n        raise HTTPException(status_code=404, detail=\"Run not found\")\n    return run\n\n\n@router.get(\n    \"/workflows/runs/{run_id}/node-states\",\n    response_model=List[NodeExecutionStateRead],\n)\ndef get_run_node_states(\n    run_id: int,\n    session: Session = Depends(get_session),\n):\n    run = session.get(WorkflowRun, run_id)\n    if not run:\n        raise HTTPException(status_code=404, detail=\"Run not found\")\n\n    statement = (\n        select(NodeExecutionState)\n        .where(NodeExecutionState.run_id == run_id)\n        .order_by(NodeExecutionState.id)\n    )\n    return session.exec(statement).all()\n\n\n@router.get(\"/workflows/project-templates\")""",
    "parameterized run routes",
)

replace_once(
    """@router.get(\"/workflows/runs/{run_id}\", response_model=WorkflowRunRead)\ndef get_run(run_id: int, session: Session = Depends(get_session)):\n    run = session.get(WorkflowRun, run_id)\n    if not run:\n        raise HTTPException(status_code=404, detail=\"Run not found\")\n    return run\n\n\n""",
    "",
    "remove late duplicate get_run",
)

replace_once(
    """    # 处理 run 记录\n    run_manager = RunManager(session)\n    \n    if resume:""",
    """    # 处理 run 记录\n    run_manager = RunManager(session)\n    precreated_run = None\n\n    if run_id is not None and not resume:\n        precreated_run = session.get(WorkflowRun, run_id)\n        if not precreated_run:\n            raise HTTPException(status_code=404, detail=\"Run not found\")\n        if precreated_run.workflow_id != workflow_id:\n            raise HTTPException(status_code=400, detail=\"Run does not belong to workflow\")\n        if precreated_run.status != \"queued\":\n            raise HTTPException(\n                status_code=400,\n                detail=f\"Pre-created run must be queued, got {precreated_run.status}\",\n            )\n\n    if resume:""",
    "precreated run validation",
)

replace_once(
    """    else:\n        # 新建执行：使用 RunManager 创建（带幂等性保护）""",
    """    elif precreated_run is not None:\n        run = precreated_run\n        run_id = run.id\n        logger.info(\n            f\"[CodeWorkflow] 使用预创建运行: run_id={run_id}, workflow_id={workflow_id}\"\n        )\n    else:\n        # 新建执行：使用 RunManager 创建（带幂等性保护）""",
    "precreated run branch",
)

replace_once(
    """            # 流式执行\n            async for event in executor.execute_stream(plan, initial_context={}):""",
    """            # 将预创建运行参数注入初始上下文。scope 先加载，显式 params 后覆盖。\n            initial_context = {}\n            if run.scope_json:\n                initial_context.update(run.scope_json)\n            if run.params_json:\n                initial_context.update(run.params_json)\n\n            # 流式执行\n            async for event in executor.execute_stream(plan, initial_context=initial_context):""",
    "initial context injection",
)

path.write_text(text, encoding="utf-8")
