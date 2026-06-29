from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.component import ApprovalRequest, ComponentAddRequest, ComponentCreate, ComponentRead
from app.services.figma_field_detector import detect_fields
from app.utils.slug import slugify

router = APIRouter(prefix="/components", tags=["components"])
CATEGORY_TABLE = "categories_comps"


def serialize(component: dict) -> ComponentRead:
    name = component.get("template_name") or ""
    slug = slugify(name) if name else f"component-{component['id']}"
    return ComponentRead(
        id=component["id"],
        slug=slug,
        name=name,
        description=name,
        status="active",
        category=component.get("category_name") or "",
        design_system=component.get("design_system") or "Chatbot Design System",
        tags=[],
        preview_image_url=component.get("preview_image_url"),
        thumbnail_url=None,
        supported_variants=[],
        supported_sizes=[],
        supported_states=[],
        content_modes=[],
        capabilities_json={},
        structure_json={},
        metadata_json={},
        figma_frame_url=component.get("figma_frame_url"),
        figma_file_url_2=component.get("figma_file_url_2"),
        field_labels=component.get("field_labels") or {},
        text_only=component.get("text_only") or 0,
        icon_only=component.get("icon_only") or 0,
        icon_text=component.get("icon_text") or 0,
        image_field=component.get("image_field") or 0,
    )


async def ensure_category_id(session: AsyncSession, category_name: str) -> int:
    category_table = await resolve_component_category_table(session)
    found = await session.scalar(
        text(f"SELECT id FROM {category_table} WHERE lower(name) = lower(:name)"),
        {"name": category_name},
    )
    if found:
        return int(found)

    created = await session.scalar(
        text(f"INSERT INTO {category_table} (name) VALUES (:name) RETURNING id"),
        {"name": category_name},
    )
    return int(created)


async def resolve_component_category_table(session: AsyncSession) -> str:
    exists = await session.scalar(text("SELECT to_regclass('public.categories_comps')"))
    if exists:
        return CATEGORY_TABLE
    raise HTTPException(status_code=500, detail="Missing categories_comps table for components")


async def fetch_component_row(session: AsyncSession, component_id: int) -> dict | None:
    category_table = await resolve_component_category_table(session)
    result = await session.execute(
        text(
            """
            SELECT
                c.id,
                c.template_name,
                c.design_system,
                c.figma_frame_url,
                c.figma_file_url_2,
                c.preview_image_url,
                c.text_only,
                c.icon_only,
                c.icon_text,
                c.image_field,
                c.field_labels,
                cc.name AS category_name
            FROM components c
            LEFT JOIN {category_table} cc ON cc.id = c.category_id
            WHERE c.id = :component_id
            """.replace("{category_table}", category_table)
        ),
        {"component_id": component_id},
    )
    row = result.mappings().first()
    return dict(row) if row else None


@router.get("", response_model=list[ComponentRead])
async def list_components(
    q: str = "",
    category: str | None = None,
    status: str = "active",
    sort: str = "recent",
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    category_table = await resolve_component_category_table(session)
    where_parts = ["1=1"]
    params: dict = {"limit": limit, "offset": offset}

    if q:
        where_parts.append("c.template_name ILIKE :q")
        params["q"] = f"%{q}%"
    if category:
        where_parts.append("cc.name = :category")
        params["category"] = category

    order_clause = "c.id DESC" if sort == "recent" else "c.template_name ASC"
    stmt = text(
        f"""
        SELECT
            c.id,
            c.template_name,
            c.design_system,
            c.figma_frame_url,
            c.figma_file_url_2,
            c.preview_image_url,
            c.text_only,
            c.icon_only,
            c.icon_text,
            c.image_field,
            c.field_labels,
            cc.name AS category_name
        FROM components c
        LEFT JOIN {category_table} cc ON cc.id = c.category_id
        WHERE {' AND '.join(where_parts)}
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
        """.replace("{category_table}", category_table)
    )
    rows = (await session.execute(stmt, params)).mappings().all()
    return [serialize(dict(row)) for row in rows]


@router.post("/add", response_model=ComponentRead)
async def add_component(
    payload: ComponentAddRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _ = user
    category_id = await ensure_category_id(session, payload.category)

    has_manual = (payload.text_only > 0 or payload.icon_only > 0
                  or payload.icon_text > 0 or payload.image_field > 0)

    new_id = await session.scalar(
        text(
            """
            INSERT INTO components (
                template_name,
                category_id,
                design_system,
                figma_frame_url,
                figma_file_url_2,
                preview_image_url,
                text_only,
                icon_only,
                icon_text,
                image_field,
                field_labels
            ) VALUES (
                :template_name,
                :category_id,
                :design_system,
                :figma_frame_url,
                :figma_file_url_2,
                :preview_image_url,
                :text_only,
                :icon_only,
                :icon_text,
                :image_field,
                CAST(:field_labels AS jsonb)
            )
            RETURNING id
            """
        ),
        {
            "template_name": payload.name,
            "category_id": category_id,
            "design_system": payload.design_system.strip() or "Chatbot Design System",
            "figma_frame_url": payload.figma_frame_url or None,
            "figma_file_url_2": payload.figma_file_url_2 or None,
            "preview_image_url": payload.preview_image_url,
            "text_only": payload.text_only,
            "icon_only": payload.icon_only,
            "icon_text": payload.icon_text,
            "image_field": payload.image_field,
            "field_labels": json.dumps({}),
        },
    )
    await session.commit()
    component_id = int(new_id)

    # Auto-detect fields from Figma if no manual counts were provided
    if not has_manual and payload.figma_frame_url:
        counts = await detect_fields(payload.figma_frame_url)
        await session.execute(
            text(
                """
                UPDATE components
                SET
                    text_only = :text_only,
                    icon_only = :icon_only,
                    image_field = :image_field,
                    icon_text = :icon_text,
                    field_labels = CAST(:field_labels AS jsonb)
                WHERE id = :component_id
                """
            ),
            {
                "component_id": component_id,
                "text_only": counts["text_only"],
                "icon_only": counts["icon_only"],
                "image_field": counts["image_field"],
                "icon_text": counts["text_icon"],
                "field_labels": json.dumps(
                    {
                        "text_fields": counts.get("text_only_labels", []),
                        "icon_slots": counts.get("icon_only_labels", []),
                        "image_fields": counts.get("image_field_labels", []),
                        "icon_text_slots": counts.get("text_icon_labels", []),
                    }
                ),
            },
        )
        await session.commit()
    component_row = await fetch_component_row(session, component_id)
    if not component_row:
        raise HTTPException(status_code=500, detail="Component was not created")

    return serialize(component_row)


@router.post("", response_model=ComponentRead)
async def create_component(
    payload: ComponentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _ = user
    category_id = await ensure_category_id(session, payload.category)
    new_id = await session.scalar(
        text(
            """
            INSERT INTO components (
                template_name,
                category_id,
                design_system,
                figma_frame_url,
                preview_image_url,
                text_only,
                icon_only,
                icon_text,
                image_field,
                field_labels
            ) VALUES (
                :template_name,
                :category_id,
                :design_system,
                NULL,
                :preview_image_url,
                0,
                0,
                0,
                0,
                CAST(:field_labels AS jsonb)
            )
            RETURNING id
            """
        ),
        {
            "template_name": payload.name,
            "category_id": category_id,
            "design_system": "Chatbot Design System",
            "preview_image_url": payload.preview_image_url,
            "field_labels": json.dumps({}),
        },
    )
    await session.commit()
    component_row = await fetch_component_row(session, int(new_id))
    if not component_row:
        raise HTTPException(status_code=500, detail="Component was not created")
    return serialize(component_row)


@router.post("/{component_id}/submit")
async def submit_component(
    component_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _ = user
    exists = await session.scalar(
        text("SELECT 1 FROM components WHERE id = :component_id"),
        {"component_id": component_id},
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Component not found")
    return {"status": "pending"}


@router.post("/{component_id}/approval")
async def approve_component(
    component_id: int,
    payload: ApprovalRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    _ = user
    exists = await session.scalar(
        text("SELECT 1 FROM components WHERE id = :component_id"),
        {"component_id": component_id},
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Component not found")
    return {"status": "active" if payload.approved else "rejected", "reason": payload.reason}


@router.get("/similar/{component_id}", response_model=list[ComponentRead])
async def similar_components(
    component_id: int,
    session: AsyncSession = Depends(get_session),
):
    category_table = await resolve_component_category_table(session)
    component = await fetch_component_row(session, component_id)
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    result = await session.execute(
        text(
            """
            SELECT
                c.id,
                c.template_name,
                c.design_system,
                c.figma_frame_url,
                c.preview_image_url,
                c.text_only,
                c.icon_only,
                c.icon_text,
                c.image_field,
                c.field_labels,
                cc.name AS category_name
            FROM components c
            LEFT JOIN {category_table} cc ON cc.id = c.category_id
            WHERE c.id != :component_id
            ORDER BY c.id DESC
            LIMIT 6
            """.replace("{category_table}", category_table)
        ),
        {"component_id": component_id},
    )
    return [serialize(dict(row)) for row in result.mappings().all()]
