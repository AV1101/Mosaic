from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import DesignTemplate
from app.schemas.brand import TemplateBrandFrameRead
from app.services.design_context_service import design_context_service

router = APIRouter(prefix="/design-templates", tags=["design_templates"])


class DesignTemplateAddRequest(BaseModel):
    name: str | None = None
    template_name: str | None = None
    figma_file_url: str | None = None
    figma_frame_url: str | None = None
    preview_img_url: str | None = None
    preview_image_url: str | None = None


@router.get("", response_model=list[TemplateBrandFrameRead])
async def list_templates(
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(DesignTemplate)
        .distinct(DesignTemplate.name)
        .order_by(DesignTemplate.name, DesignTemplate.id.desc())
    )
    result = await session.execute(stmt.limit(limit).offset(offset))
    return [design_context_service.serialize_design_template(t) for t in result.scalars().all()]


@router.get("/{template_name}/frames", response_model=list[TemplateBrandFrameRead])
async def list_frames_for_template(
    template_name: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(DesignTemplate)
        .where(DesignTemplate.name == template_name)
        .order_by(DesignTemplate.id.desc())
    )
    return [design_context_service.serialize_design_template(t) for t in result.scalars().all()]


@router.get("/{template_id}", response_model=TemplateBrandFrameRead)
async def get_template(
    template_id: int,
    session: AsyncSession = Depends(get_session),
):
    template = await session.get(DesignTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Design template not found")
    return design_context_service.serialize_design_template(template)


@router.post("/add", response_model=TemplateBrandFrameRead)
async def add_template(
    payload: DesignTemplateAddRequest,
    session: AsyncSession = Depends(get_session),
):
    name = (payload.template_name or payload.name or "").strip()
    figma_url = (payload.figma_file_url or payload.figma_frame_url or "").strip()
    preview_url = (payload.preview_img_url or payload.preview_image_url or "").strip() or None

    if not name:
        raise HTTPException(status_code=400, detail="Template name is required.")
    if not figma_url:
        raise HTTPException(status_code=400, detail="Figma file URL is required.")

    existing = await session.scalar(
        select(DesignTemplate).where(DesignTemplate.name == name)
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Template '{name}' already exists.")

    template = DesignTemplate(
        name=name,
        figma_file_url=figma_url,
        preview_img_url=preview_url,
    )
    session.add(template)
    await session.commit()
    await session.refresh(template)

    return design_context_service.serialize_design_template(template)
