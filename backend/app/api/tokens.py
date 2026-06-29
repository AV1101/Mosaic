from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models import DesignToken, User
from app.schemas.token import DesignTokenRead, DesignTokenUpsert

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("", response_model=list[DesignTokenRead])
async def list_tokens(session: AsyncSession = Depends(get_session), user: User = Depends(get_current_user)):
    result = await session.execute(select(DesignToken).where(DesignToken.owner_id == user.id).order_by(DesignToken.updated_at.desc()))
    return result.scalars().all()


@router.post("", response_model=DesignTokenRead)
async def save_tokens(payload: DesignTokenUpsert, session: AsyncSession = Depends(get_session), user: User = Depends(get_current_user)):
    token = DesignToken(owner_id=user.id, **payload.model_dump())
    session.add(token)
    await session.commit()
    await session.refresh(token)
    return token


@router.get("/presets")
async def presets():
    return [
        {"name": "Enterprise", "tokens": {"colors": {"primary": "#6d5dfc"}, "radius": {"card": "24px"}, "spacing": {"section": "96px"}}},
        {"name": "Clinical", "tokens": {"colors": {"primary": "#0891b2"}, "radius": {"card": "28px"}, "layout": {"container": "1180px"}}},
        {"name": "Finance", "tokens": {"colors": {"primary": "#0f766e"}, "shadows": {"soft": "0 18px 70px -40px rgba(15,23,42,.45)"}}},
    ]
