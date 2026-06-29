from pydantic import BaseModel


class ComponentCreate(BaseModel):
    name: str
    description: str
    category: str
    tags: list[str] = []
    prompt_template: str
    tokens: dict
    preview_image_url: str | None = None


class ComponentRead(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    status: str
    category: str
    design_system: str = "Chatbot Design System"
    tags: list[str]
    preview_image_url: str | None = None
    thumbnail_url: str | None = None
    supported_variants: list = []
    supported_sizes: list = []
    supported_states: list = []
    content_modes: list = []
    capabilities_json: dict = {}
    structure_json: dict = {}
    metadata_json: dict = {}
    figma_frame_url: str | None = None
    figma_file_url_2: str | None = None
    field_labels: dict = {}
    text_only: int = 0
    icon_only: int = 0
    icon_text: int = 0
    image_field: int = 0

    model_config = {"from_attributes": True}


class ApprovalRequest(BaseModel):
    approved: bool
    reason: str | None = None


class ComponentAddRequest(BaseModel):
    name: str
    type_: str
    category: str
    design_system: str = "Chatbot Design System"
    preview_image_url: str | None = None
    figma_frame_url: str | None = None
    figma_file_url_2: str | None = None
    description: str | None = None
    text_only: int = 0
    icon_only: int = 0
    icon_text: int = 0
    image_field: int = 0
