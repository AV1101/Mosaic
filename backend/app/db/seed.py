import asyncio

from sqlalchemy import select

from app.auth.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models import Category, User

DEFAULT_CATEGORIES = [
    "Hero",
    "FAQ",
    "Features",
    "Articles",
    "Footer",
    "Testimonials",
    "Pricing",
    "Medical",
    "SaaS",
    "Finance",
]

DEFAULT_USERS = [
    ("admin@section.ai", "Admin", "admin"),
    ("designer@section.ai", "Designer", "designer"),
    ("developer@section.ai", "Developer", "developer"),
]


async def seed() -> None:
    async with engine.begin() as connection:
        # Vector extension creation is handled in alembic migrations
        # Skip it here to avoid transaction abort on systems without pgvector
        await connection.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        for name in DEFAULT_CATEGORIES:
            exists = await session.scalar(select(Category).where(Category.name == name))
            if not exists:
                session.add(Category(name=name))

        for email, name, role in DEFAULT_USERS:
          exists = await session.scalar(select(User).where(User.email == email))
          if not exists:
            session.add(User(email=email, name=name, role=role, hashed_password=hash_password("password123")))

        await session.commit()
        print("✓ Database seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
