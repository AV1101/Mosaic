from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.user import User


async def get_current_user(session: AsyncSession = Depends(get_session)) -> User:
    """Return a local default user while authentication is disabled."""
    result = await session.execute(select(User).where(User.is_active.is_(True)).order_by(User.id))
    user = result.scalars().first()
    if user:
        return user

    user = User(
        email="local@sectionai.dev",
        name="Local User",
        role="admin",
        hashed_password="authentication-disabled",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def require_roles(*roles: str):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        return user

    return dependency
