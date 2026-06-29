from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models import Component, Generation, Prompt, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def dashboard(session: AsyncSession = Depends(get_session), user: User = Depends(get_current_user)):
    component_count = await session.scalar(select(func.count()).select_from(Component))
    prompt_count = await session.scalar(select(func.count()).select_from(Prompt))
    generation_count = await session.scalar(select(func.count()).select_from(Generation).where(Generation.user_id == user.id))
    pending_count = await session.scalar(select(func.count()).select_from(Component).where(Component.status == "pending"))
    return {
        "role": user.role,
        "metrics": {
            "components": component_count or 0,
            "prompts": prompt_count or 0,
            "generations": generation_count or 0,
            "pendingApprovals": pending_count or 0,
        },
    }
