"""Plain-text generation node for sequential literary workflows."""

import time
from typing import AsyncIterator, Optional

from pydantic import BaseModel, Field

from app.db.models import LLMConfig
from app.services.ai.core.llm_service import generate_review
from app.services.ai.core.token_utils import (
    calc_input_tokens,
    estimate_tokens,
)

from ...registry import register_node
from ..base import BaseNode


class TextGenerateInput(BaseModel):
    user_prompt: str = Field(..., min_length=1, description="User prompt")
    llm_config_id: int = Field(
        ...,
        gt=0,
        description="LLM configuration ID",
        json_schema_extra={"x-component": "LLMSelect"},
    )
    system_prompt: Optional[str] = Field(
        None,
        description="Optional system prompt",
    )
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(4096, gt=0)
    timeout: int = Field(180, gt=0)


class TextGenerateUsage(BaseModel):
    llm_config_id: int
    model_name: str
    input_tokens: int
    output_tokens: int
    duration_ms: int
    estimated_cost_usd: float | None = None
    cost_status: str = "pricing_unavailable"


class TextGenerateOutput(BaseModel):
    text: str
    usage: TextGenerateUsage


@register_node
class TextGenerateNode(BaseNode[TextGenerateInput, TextGenerateOutput]):
    """Generate one plain-text result through a configured LLM."""

    node_type = "AI.TextGenerate"
    category = "ai"
    label = "Text generation"
    description = "Generate plain text using one configured LLM"
    input_model = TextGenerateInput
    output_model = TextGenerateOutput

    async def execute(
        self,
        inputs: TextGenerateInput,
    ) -> AsyncIterator[TextGenerateOutput]:
        config = self.context.session.get(
            LLMConfig,
            inputs.llm_config_id,
        )
        if config is None:
            raise ValueError(
                "LLM configuration not found: "
                f"{inputs.llm_config_id}"
            )

        input_tokens = calc_input_tokens(
            inputs.system_prompt,
            inputs.user_prompt,
        )
        started_at = time.perf_counter()

        text = await generate_review(
            session=self.context.session,
            llm_config_id=inputs.llm_config_id,
            user_prompt=inputs.user_prompt,
            system_prompt=inputs.system_prompt,
            temperature=inputs.temperature,
            max_tokens=inputs.max_tokens,
            timeout=inputs.timeout,
            track_stats=True,
        )

        duration_ms = max(
            0,
            round((time.perf_counter() - started_at) * 1000),
        )

        yield TextGenerateOutput(
            text=text,
            usage=TextGenerateUsage(
                llm_config_id=inputs.llm_config_id,
                model_name=config.model_name,
                input_tokens=input_tokens,
                output_tokens=estimate_tokens(text),
                duration_ms=duration_ms,
            ),
        )
