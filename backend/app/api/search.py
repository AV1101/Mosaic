from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import Component
from app.api.components import serialize

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/semantic")
async def semantic_search(q: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Component).where(Component.status == "active").limit(12)
    )
    return {"query": q, "mode": "pgvector-ready", "results": [serialize(item) for item in result.scalars().all()]}
