from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models.color_token import ColorToken
from app.models.typography_style import TypographyStyle
from app.models.user import User
from app.services.component_generation_service import component_generation_service

router = APIRouter(prefix="/component-generation", tags=["component_generation"])


class ComponentConfig(BaseModel):
    type: str = "primary"
    size: str = "medium"
    theme: str = "Light"
    has_label: bool = True
    label: str = "Button"
    has_icon: bool = False
    icon_position: str = "none"   # none | left | right | only
    icon_name: str = ""


class ComponentGenerationRequest(BaseModel):
    component_type: str = "button"
    config: ComponentConfig
    color_token_id: int | None = None
    typography_id: int | None = None
    typography_underlined_id: int | None = None
    figma_frame_url: str | None = None
    figma_file_url_2: str | None = None
    input_config: dict | None = None   # { text_fields, icon_only_slots, icon_text_slots, image_urls }


class ComponentGenerationResponse(BaseModel):
    compiled_prompt: str
    input_tokens: int
    output_tokens: int
    total_tokens: int


@router.post("", response_model=ComponentGenerationResponse)
async def generate_component(
    payload: ComponentGenerationRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Fetch tokens — fall back to empty dicts so generation always works
    color_tokens: dict = {}
    if payload.color_token_id:
        row = await session.get(ColorToken, payload.color_token_id)
        if row:
            color_tokens = row.tokens or {}

    typography_style: dict = {}
    if payload.typography_id:
        row = await session.get(TypographyStyle, payload.typography_id)
        if row:
            typography_style = row.style or {}

    typography_underlined: dict = {}
    if payload.typography_underlined_id:
        row = await session.get(TypographyStyle, payload.typography_underlined_id)
        if row:
            typography_underlined = row.style or {}

    try:
        compiled, usage = await component_generation_service.generate_component_prompt({
            "component_type": payload.component_type,
            "config": payload.config.model_dump(),
            "color_tokens": color_tokens,
            "typography_style": typography_style,
            "typography_underlined": typography_underlined,
            "figma_frame_url": payload.figma_frame_url or "",
            "figma_file_url_2": payload.figma_file_url_2 or "",
            "input_config": payload.input_config or {},
        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ComponentGenerationResponse(
        compiled_prompt=compiled,
        input_tokens=max(0, int(usage.get("prompt_tokens", 0))),
        output_tokens=max(0, int(usage.get("completion_tokens", 0))),
        total_tokens=max(0, int(usage.get("total_tokens", 0))),
    )
