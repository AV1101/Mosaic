from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models import Brand, User
from app.schemas.brand import BrandAddRequest, BrandRead

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", response_model=list[BrandRead])
async def list_brands(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    result = await session.execute(select(Brand).order_by(Brand.brand_name))
    return result.scalars().all()


@router.get("/{brand_name}", response_model=BrandRead)
async def get_brand(
    brand_name: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    result = await session.execute(select(Brand).where(Brand.brand_name == brand_name))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@router.post("/add", response_model=BrandRead)
async def add_brand(
    payload: BrandAddRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    existing = await session.scalar(select(Brand).where(Brand.brand_name == payload.brand_name))
    if existing:
        raise HTTPException(status_code=409, detail=f"Brand '{payload.brand_name}' already exists.")

    brand = Brand(brand_name=payload.brand_name)
    session.add(brand)
    await session.commit()
    await session.refresh(brand)
    return brand
