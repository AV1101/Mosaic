from pydantic import BaseModel


class PromptCreate(BaseModel):
    name: str
    body: str
    component_id: int | None = None
    system_prompt: str | None = None
    developer_prompt: str | None = None
    user_prompt_template: str | None = None
    negative_prompt: str | None = None
    example_input: str | None = None
    example_output_code: str | None = None
    reference_code: str | None = None
    token_placeholders: list[str] = []
    design_constraints: dict = {}
    accessibility_requirements: dict = {}
    framework_targets: list[str] = ["React", "Tailwind", "HTML"]
    status: str = "draft"
    ai_metadata: dict = {}


class PromptRead(BaseModel):
    id: int
    name: str
    body: str
    system_prompt: str | None
    developer_prompt: str | None
    user_prompt_template: str | None
    negative_prompt: str | None
    example_input: str | None
    example_output_code: str | None
    reference_code: str | None
    token_placeholders: list[str]
    design_constraints: dict
    accessibility_requirements: dict
    framework_targets: list[str]
    status: str
    version: int
    component_id: int | None
    ai_metadata: dict

    model_config = {"from_attributes": True}
