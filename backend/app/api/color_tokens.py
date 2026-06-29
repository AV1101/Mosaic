from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.color_token import ColorToken

router = APIRouter(prefix="/color-tokens", tags=["color_tokens"])


class ColorTokenRead(BaseModel):
    id: int
    name: str
    tokens: dict

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ColorTokenRead])
async def list_color_tokens(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ColorToken).order_by(ColorToken.name))
    return result.scalars().all()
