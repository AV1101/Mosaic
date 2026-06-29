from pydantic import BaseModel
from typing import Any, Dict


class TemplatePayload(BaseModel):
    template_name: str
    selected_template_name: str | None = None
    framework: str | None = None
    industry: str
    theme: str
    brand_name: str | None = None
    template_id: int | None = None
    tokens: Dict[str, Any] = {}
    structure: Dict[str, Any] = {}
    input_config: Dict[str, Any] = {}
    component_input_configs: Dict[str, Any] = {}


class TemplateGenerationRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    payload: TemplatePayload


class TemplateGenerationResponse(BaseModel):
    compiled_prompt: str
    input_tokens: int
    output_tokens: int
    total_tokens: int


class Config:
    orm_mode = True
