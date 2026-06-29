from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_roles
from app.db.session import get_session
from app.models import User
from app.schemas.auth import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
async def list_users(session: AsyncSession = Depends(get_session), _: User = Depends(require_roles("admin"))):
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()
