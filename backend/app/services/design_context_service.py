from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Brand, DesignBrand, DesignTemplate, TemplateBrandFrame


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "untitled"


class DesignContextService:
    async def build_generation_context(
        self,
        session: AsyncSession,
        *,
        brand_name: str | None = None,
        template_id: int | None = None,
        template_name: str | None = None,
        require_db_context: bool = False,
    ) -> dict[str, Any]:
        brand = await self._get_brand(session, brand_name)
        frame = await self._get_frame(
            session,
            frame_id=template_id,
            template_name=template_name,
            brand_name=brand_name,
        )

        if require_db_context and brand_name and not brand:
            raise HTTPException(status_code=404, detail="Brand not found in database")
        if require_db_context and not frame:
            raise HTTPException(status_code=404, detail="Template frame not found in database")

        return {
            "brand": self.serialize_brand(brand) if brand else None,
            "template": self.serialize_frame(frame) if frame else None,
        }

    async def build_design_generation_context(
        self,
        session: AsyncSession,
        *,
        brand_name: str | None = None,
        template_id: int | None = None,
        template_name: str | None = None,
        require_db_context: bool = False,
    ) -> dict[str, Any]:
        brand = await self._get_design_brand(session, brand_name)
        template = await self._get_design_template(
            session,
            template_id=template_id,
            template_name=template_name,
            brand_name=brand_name,
        )

        if require_db_context and brand_name and not brand:
            raise HTTPException(status_code=404, detail="Design brand not found in database")
        if require_db_context and not template:
            raise HTTPException(status_code=404, detail="Design template not found in database")

        return {
            "brand": self.serialize_design_brand(brand) if brand else None,
            "template": self.serialize_design_template(template) if template else None,
        }

    async def _get_brand(self, session: AsyncSession, name: str | None) -> Brand | None:
        if not name:
            return None
        result = await session.execute(select(Brand).where(Brand.brand_name == name))
        return result.scalar_one_or_none()

    async def _get_design_brand(self, session: AsyncSession, name: str | None) -> DesignBrand | None:
        if not name:
            return None
        result = await session.execute(select(DesignBrand).where(DesignBrand.name == name))
        return result.scalar_one_or_none()

    async def _get_frame(
        self,
        session: AsyncSession,
        *,
        frame_id: int | None = None,
        template_name: str | None = None,
        brand_name: str | None = None,
    ) -> TemplateBrandFrame | None:
        if frame_id is not None:
            return await session.get(TemplateBrandFrame, frame_id)

        if template_name and brand_name:
            result = await session.execute(
                select(TemplateBrandFrame)
                .where(TemplateBrandFrame.template_name == template_name)
                .where(TemplateBrandFrame.brand_name == brand_name)
                .limit(1)
            )
            frame = result.scalars().first()
            if frame:
                return frame

        if template_name:
            result = await session.execute(
                select(TemplateBrandFrame)
                .where(TemplateBrandFrame.template_name == template_name)
                .order_by(TemplateBrandFrame.id.desc())
                .limit(1)
            )
            frame = result.scalars().first()
            if frame:
                return frame

        result = await session.execute(
            select(TemplateBrandFrame).order_by(TemplateBrandFrame.id.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def _get_design_template(
        self,
        session: AsyncSession,
        *,
        template_id: int | None = None,
        template_name: str | None = None,
        brand_name: str | None = None,
    ) -> DesignTemplate | None:
        _ = brand_name
        if template_id is not None:
            return await session.get(DesignTemplate, template_id)

        if template_name:
            result = await session.execute(
                select(DesignTemplate)
                .where(DesignTemplate.name == template_name)
                .order_by(DesignTemplate.id.desc())
                .limit(1)
            )
            template = result.scalars().first()
            if template:
                return template

        result = await session.execute(select(DesignTemplate).order_by(DesignTemplate.id.desc()).limit(1))
        return result.scalar_one_or_none()

    @staticmethod
    def serialize_brand(brand: Brand) -> dict[str, Any]:
        return {"id": brand.id, "name": brand.brand_name}

    @staticmethod
    def serialize_design_brand(brand: DesignBrand) -> dict[str, Any]:
        return {"id": brand.id, "name": brand.name, "tokens": brand.tokens or {}}

    @staticmethod
    def serialize_frame(frame: TemplateBrandFrame) -> dict[str, Any]:
        return DesignContextService._serialize_template_like(frame)

    @staticmethod
    def serialize_design_template(template: DesignTemplate) -> dict[str, Any]:
        slug = _slugify(template.name)
        return {
            "id": template.id,
            "template_name": template.name,
            "template_category": "Design Website",
            "brand_name": "",
            "figma_frame_url": template.figma_file_url,
            "preview_image": template.preview_img_url,
            "description": None,
            "text_only": 0,
            "icon_only": 0,
            "icon_text": 0,
            "image_field": 0,
            "name": template.name,
            "category": "Design Website",
            "type": "Design Website",
            "slug": slug,
            "figma_node_id": None,
            "tags": ["Design Website"],
            "prompt_template": "",
            "field_labels": {},
        }

    @staticmethod
    def _serialize_template_like(template: Any) -> dict[str, Any]:
        slug = _slugify(template.template_name)
        category_name = template.category.name if template.category else ""
        return {
            "id": template.id,
            "template_name": template.template_name,
            "template_category": category_name,
            "brand_name": template.brand_name,
            "figma_frame_url": template.figma_frame_url,
            "preview_image": template.preview_image_url,
            "description": None,
            "text_only": template.text_only or 0,
            "icon_only": template.icon_only or 0,
            "icon_text": template.text_icon or 0,   # DB col is text_icon
            "image_field": template.image_field or 0,
            # backward-compatible aliases for existing frontend pages
            "name": template.template_name,
            "category": category_name,
            "type": category_name,
            "slug": slug,
            "figma_node_id": None,
            "tags": [],
            "prompt_template": "",
            "field_labels": template.field_labels or {},
        }


design_context_service = DesignContextService()
