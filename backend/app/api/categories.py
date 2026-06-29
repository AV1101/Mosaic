from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.category import CategoryComponent, CategoryTemplate

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryItem(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


@router.get("/templates", response_model=list[CategoryItem])
async def list_template_categories(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(CategoryTemplate).order_by(CategoryTemplate.name))).scalars().all()
    return rows



@router.get("/components", response_model=list[CategoryItem])
async def list_component_categories(session: AsyncSession = Depends(get_session)):
    preferred = await session.scalar(text("SELECT to_regclass('public.categories_comps')"))
    if preferred:
        rows = (
            await session.execute(
                text("SELECT id, name FROM categories_comps ORDER BY name")
            )
        ).mappings().all()
        return [CategoryItem(id=row["id"], name=row["name"]) for row in rows]

    legacy = await session.scalar(text("SELECT to_regclass('public.categories_components')"))
    if legacy:
        rows = (
            await session.execute(
                text("SELECT id, name FROM categories_components ORDER BY name")
            )
        ).mappings().all()
        return [CategoryItem(id=row["id"], name=row["name"]) for row in rows]

    # Fallback to model query if tables are managed via ORM naming.
    rows = (await session.execute(select(CategoryComponent).order_by(CategoryComponent.name))).scalars().all()
    return rows
