from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models import DesignBrand, User
from app.schemas.brand import BrandAddRequest, BrandRead

router = APIRouter(prefix="/design-brands", tags=["design_brands"])


@router.get("", response_model=list[BrandRead])
async def list_design_brands(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _ = user
    result = await session.execute(select(DesignBrand).order_by(DesignBrand.name))
    return [BrandRead(id=row.id, brand_name=row.name) for row in result.scalars().all()]


@router.get("/{brand_name}")
async def get_design_brand(
    brand_name: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _ = user
    result = await session.execute(select(DesignBrand).where(DesignBrand.name == brand_name))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Design brand not found")
    return {"id": brand.id, "brand_name": brand.name, "tokens": brand.tokens or {}}


@router.post("/add", response_model=BrandRead)
async def add_design_brand(
    payload: BrandAddRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _ = user
    existing = await session.scalar(
        select(DesignBrand).where(DesignBrand.name == payload.brand_name)
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Brand '{payload.brand_name}' already exists.")

    brand = DesignBrand(name=payload.brand_name, tokens={})
    session.add(brand)
    await session.commit()
    await session.refresh(brand)
    return BrandRead(id=brand.id, brand_name=brand.name)
