from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read_source(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_workflow_and_generation_logs_do_not_include_content_bearing_values() -> None:
    sources = {
        "api": read_source("app/api/endpoints/workflows.py"),
        "generator": read_source("app/services/ai/generation/instruction_generator.py"),
        "triggers": read_source("app/services/workflow/triggers.py"),
        "extractor": read_source("app/services/workflow/trigger_extractor.py"),
        "executor": read_source("app/services/workflow/engine/async_executor.py"),
        "error_handler": read_source("app/services/workflow/engine/error_handler.py"),
    }

    forbidden_fragments = (
        "logger.info(f\"[重命名] 新代码:",
        "logger.error(traceback.format_exc())",
        "logger.warning(f\"JSON 解析失败: {json_buffer}",
        "logger.info(f\"当前数据: {json.dumps(collected_data",
        "error={event.error}",
        "data={event_data}",
        '"error": str(e)',
        'logger.error(f"[AsyncExecutor] 语句处理失败: {e}")',
        'logger.error(f"[AsyncExecutor] 语句执行失败: {stmt.variable}, 错误: {e}")',
        'logger.error(f"[ErrorHandler] 节点执行失败: {stmt.variable}, 错误: {error}")',
    )

    rendered = "\n".join(sources.values())
    for fragment in forbidden_fragments:
        assert fragment not in rendered
