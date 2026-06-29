from datetime import datetime
from pydantic import BaseModel, Field


class GenerationRequest(BaseModel):
    prompt: str
    brand_name: str | None = None
    template_id: int | None = None
    template_name: str | None = None
    provider: str | None = None
    model: str | None = None
    tokens: dict = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)


class GenerationRead(BaseModel):
    id: int
    provider: str
    model: str
    prompt_input: str
    output_code: str
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int
    created_at: datetime

    model_config = {"from_attributes": True}
