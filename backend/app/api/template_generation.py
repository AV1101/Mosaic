from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models import TemplateBrandFrame
from app.models.user import User
from app.schemas.template_generation import (
    TemplateGenerationRequest,
    TemplateGenerationResponse,
)
from app.services.design_context_service import design_context_service
from app.services.template_generation_service import (
    template_generation_service,
)

router = APIRouter(prefix="/template-generation", tags=["template_generation"])


def _parse_id(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@router.post("", response_model=TemplateGenerationResponse)
async def generate_template(
    payload: TemplateGenerationRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        request_payload = payload.payload.model_dump()
        brand_name = request_payload.get("brand_name") or request_payload.get("industry")
        structure = request_payload.get("structure") or {}
        component_input_configs = request_payload.get("component_input_configs") or {}

        header_id = _parse_id(structure.get("header"))
        subheader_id = _parse_id(structure.get("subheader"))
        hero_id = _parse_id(structure.get("hero"))
        section_ids = [_parse_id(s) for s in structure.get("sections", []) if s is not None]
        footer_id = _parse_id(structure.get("footer"))
        page_order_ids = [_parse_id(s) for s in structure.get("page_order", []) if s is not None]

        # Use hero for brand token resolution; don't require template in DB
        context = await design_context_service.build_generation_context(
            session,
            brand_name=brand_name,
            template_id=hero_id,
            require_db_context=False,
        )

        brand = context.get("brand") or {}

        async def fetch_tmpl(tid: int | None) -> dict | None:
            if tid is None:
                return None
            tmpl = await session.get(TemplateBrandFrame, tid)
            return design_context_service.serialize_frame(tmpl) if tmpl else None

        header_template = await fetch_tmpl(header_id)
        subheader_template = await fetch_tmpl(subheader_id)
        hero_template = await fetch_tmpl(hero_id)
        section_templates = []
        for sid in [s for s in section_ids if s is not None]:
            t = await fetch_tmpl(sid)
            if t:
                section_templates.append(t)
        footer_template = await fetch_tmpl(footer_id)
        ordered_templates = []
        for oid in [o for o in page_order_ids if o is not None]:
            t = await fetch_tmpl(oid)
            if t:
                ordered_templates.append(t)

        compiled_payload = {
            **request_payload,
            "brand_name": brand.get("name") or brand_name,
            "industry": brand.get("industry") or request_payload.get("industry"),
            "theme": brand.get("theme") or request_payload.get("theme"),
            "all_templates": {
                "header": header_template,
                "subheader": subheader_template,
                "hero": hero_template,
                "sections": section_templates,
                "footer": footer_template,
                "ordered": ordered_templates,
            },
            "component_input_configs": component_input_configs,
        }

        compiled, usage = await template_generation_service.generate_template_prompt(compiled_payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return TemplateGenerationResponse(
        compiled_prompt=compiled,
        input_tokens=max(0, int(usage.get("prompt_tokens", 0))),
        output_tokens=max(0, int(usage.get("completion_tokens", 0))),
        total_tokens=max(0, int(usage.get("total_tokens", 0))),
    )
