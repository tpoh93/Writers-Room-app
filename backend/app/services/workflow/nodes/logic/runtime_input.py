"""Explicit access to parameterized workflow inputs."""

from typing import Any, AsyncIterator

from pydantic import BaseModel, Field

from app.services.workflow.nodes.base import BaseNode
from app.services.workflow.registry import register_node


class RuntimeInputRequest(BaseModel):
    key: str = Field(..., min_length=1, description="Key from the run's initial context")
    required: bool = Field(True, description="Fail when the key is absent")
    default: Any = Field(None, description="Value returned when an optional key is absent")


class RuntimeInputResult(BaseModel):
    value: Any


@register_node
class RuntimeInputNode(BaseNode[RuntimeInputRequest, RuntimeInputResult]):
    """Read one explicitly named value from the run's initial context."""

    node_type = "Logic.RuntimeInput"
    category = "logic"
    label = "Runtime input"
    description = "Read one parameterized workflow input by key"
    input_model = RuntimeInputRequest
    output_model = RuntimeInputResult

    async def execute(
        self,
        inputs: RuntimeInputRequest,
    ) -> AsyncIterator[RuntimeInputResult]:
        variables = self.context.variables
        if inputs.key not in variables:
            if inputs.required:
                raise ValueError(f"Missing required workflow input: {inputs.key}")
            yield RuntimeInputResult(value=inputs.default)
            return

        value = variables[inputs.key]
        if value is None and inputs.required:
            raise ValueError(f"Required workflow input is null: {inputs.key}")

        yield RuntimeInputResult(value=value)
