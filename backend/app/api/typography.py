from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.typography_style import TypographyStyle

router = APIRouter(prefix="/typography", tags=["typography"])


class TypographyRead(BaseModel):
    id: int
    name: str
    style: dict

    model_config = {"from_attributes": True}


@router.get("", response_model=list[TypographyRead])
async def list_typography(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TypographyStyle).order_by(TypographyStyle.id))
    return result.scalars().all()
