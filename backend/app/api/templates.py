from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import TemplateBrandFrame
from app.models.category import CategoryTemplate
from app.schemas.brand import TemplateBrandFrameAddRequest, TemplateBrandFrameRead
from app.services.design_context_service import design_context_service
from app.services.figma_field_detector import detect_fields

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/categories", response_model=list[str])
async def list_categories(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(CategoryTemplate.name).order_by(CategoryTemplate.name))
    return result.scalars().all()


@router.get("", response_model=list[TemplateBrandFrameRead])
async def list_frames(
    category: str | None = None,
    brand: str | None = None,
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    # DISTINCT ON (template_name) — one card per template in the marketplace
    stmt = (
        select(TemplateBrandFrame)
        .distinct(TemplateBrandFrame.template_name)
        .order_by(TemplateBrandFrame.template_name, TemplateBrandFrame.id.desc())
    )
    if category:
        stmt = stmt.join(TemplateBrandFrame.category).where(CategoryTemplate.name == category)
    if brand:
        stmt = stmt.where(TemplateBrandFrame.brand_name == brand)

    result = await session.execute(stmt.limit(limit).offset(offset))
    return [design_context_service.serialize_frame(f) for f in result.scalars().all()]


@router.get("/{template_name}/brands", response_model=list[str])
async def list_brands_for_template(
    template_name: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(TemplateBrandFrame.brand_name)
        .where(TemplateBrandFrame.template_name == template_name)
        .distinct()
        .order_by(TemplateBrandFrame.brand_name)
    )
    return result.scalars().all()


@router.get("/{template_name}/frames", response_model=list[TemplateBrandFrameRead])
async def list_frames_for_template(
    template_name: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(TemplateBrandFrame)
        .where(TemplateBrandFrame.template_name == template_name)
        .order_by(TemplateBrandFrame.brand_name)
    )
    return [design_context_service.serialize_frame(f) for f in result.scalars().all()]


@router.get("/{frame_id}", response_model=TemplateBrandFrameRead)
async def get_frame(
    frame_id: int,
    session: AsyncSession = Depends(get_session),
):
    frame = await session.get(TemplateBrandFrame, frame_id)
    if not frame:
        raise HTTPException(status_code=404, detail="Template frame not found")
    return design_context_service.serialize_frame(frame)


@router.post("/add", response_model=TemplateBrandFrameRead)
async def add_frame(
    payload: TemplateBrandFrameAddRequest,
    session: AsyncSession = Depends(get_session),
):
    category = await session.scalar(
        select(CategoryTemplate).where(CategoryTemplate.name == payload.template_category)
    )
    if not category:
        raise HTTPException(
            status_code=400,
            detail=f"Category '{payload.template_category}' not found.",
        )

    existing = await session.scalar(
        select(TemplateBrandFrame)
        .where(TemplateBrandFrame.template_name == payload.template_name)
        .where(TemplateBrandFrame.brand_name == payload.brand_name)
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A frame for template '{payload.template_name}' and brand '{payload.brand_name}' already exists.",
        )

    frame = TemplateBrandFrame(
        template_name=payload.template_name,
        category_id=category.id,
        brand_name=payload.brand_name,
        figma_frame_url=payload.figma_frame_url,
        preview_image_url=payload.preview_image_url,
    )
    session.add(frame)
    await session.commit()
    await session.refresh(frame)

    # 1. Use manual overrides if any were explicitly provided
    has_manual = any(
        v is not None and v > 0
        for v in [payload.text_only, payload.icon_only, payload.image_field, payload.text_icon]
    )

    if has_manual:
        counts = {
            "text_only": payload.text_only or 0,
            "icon_only": payload.icon_only or 0,
            "image_field": payload.image_field or 0,
            "text_icon": payload.text_icon or 0,
            "text_only_labels": [],
            "icon_only_labels": [],
            "image_field_labels": [],
            "text_icon_labels": [],
        }
    else:
        # 2. Reuse counts from a sibling brand entry if already detected
        sibling = await session.scalar(
            select(TemplateBrandFrame)
            .where(TemplateBrandFrame.template_name == payload.template_name)
            .where(TemplateBrandFrame.id != frame.id)
            .where(
                (TemplateBrandFrame.text_only > 0)
                | (TemplateBrandFrame.icon_only > 0)
                | (TemplateBrandFrame.image_field > 0)
                | (TemplateBrandFrame.text_icon > 0)
            )
            .limit(1)
        )
        if sibling:
            counts = {
                "text_only": sibling.text_only,
                "icon_only": sibling.icon_only,
                "image_field": sibling.image_field,
                "text_icon": sibling.text_icon,
                "text_only_labels": [],
                "icon_only_labels": [],
                "image_field_labels": [],
                "text_icon_labels": [],
                **(sibling.field_labels or {}),
            }
        else:
            # 3. Auto-detect from Figma + OpenAI
            counts = await detect_fields(payload.figma_frame_url)

    frame.text_only = counts["text_only"]
    frame.icon_only = counts["icon_only"]
    frame.image_field = counts["image_field"]
    frame.text_icon = counts["text_icon"]
    frame.field_labels = {
        "text_fields": counts.get("text_only_labels", []),
        "icon_slots": counts.get("icon_only_labels", []),
        "image_fields": counts.get("image_field_labels", []),
        "icon_text_slots": counts.get("text_icon_labels", []),
    }
    await session.commit()
    await session.refresh(frame)

    return design_context_service.serialize_frame(frame)
