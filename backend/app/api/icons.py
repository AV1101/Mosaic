from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.icon import Icon

router = APIRouter(prefix="/icons", tags=["icons"])


class IconSearchResult(BaseModel):
    id: int
    name: str
    variants: list[str]


@router.get("", response_model=list[IconSearchResult])
async def search_icons(
    search: str = Query("", description="Case-insensitive name filter"),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(
            func.min(Icon.id).label("id"),
            Icon.name,
            func.array_agg(Icon.variant).label("variants"),
        )
        .group_by(Icon.name)
        .order_by(Icon.name)
        .limit(limit)
    )
    if search:
        stmt = stmt.where(Icon.name.ilike(f"%{search}%"))

    rows = (await session.execute(stmt)).all()
    return [
        IconSearchResult(id=row.id, name=row.name, variants=sorted(row.variants))
        for row in rows
    ]
