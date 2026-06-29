from pydantic import BaseModel, Field


class BrandRead(BaseModel):
    id: int
    brand_name: str

    model_config = {"from_attributes": True}


class BrandAddRequest(BaseModel):
    brand_name: str


class TemplateBrandFrameRead(BaseModel):
    id: int
    template_name: str
    template_category: str
    brand_name: str
    figma_frame_url: str
    preview_image: str | None = None
    description: str | None = None
    text_only: int = 0
    icon_only: int = 0
    icon_text: int = 0
    image_field: int = 0

    field_labels: dict = Field(default_factory=dict)

    # backward-compatible aliases consumed by existing frontend pages
    name: str = ""
    category: str = ""
    type: str = ""
    slug: str = ""
    tags: list[str] = Field(default_factory=list)
    prompt_template: str = ""

    model_config = {"from_attributes": True}


class TemplateBrandFrameAddRequest(BaseModel):
    template_name: str
    template_category: str
    brand_name: str
    figma_frame_url: str
    preview_image_url: str | None = None
    # Optional manual overrides — when any is > 0, skip Figma auto-detection
    text_only: int | None = None
    icon_only: int | None = None
    image_field: int | None = None
    text_icon: int | None = None
