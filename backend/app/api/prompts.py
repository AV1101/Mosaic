from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_roles
from app.db.session import get_session
from app.models import Prompt, User
from app.schemas.prompt import PromptCreate, PromptRead
from app.services.embedding_service import embedding_service

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("", response_model=list[PromptRead])
async def list_prompts(session: AsyncSession = Depends(get_session), user: User = Depends(get_current_user)):
    result = await session.execute(select(Prompt).order_by(Prompt.created_at.desc()).limit(100))
    return result.scalars().all()


@router.post("", response_model=PromptRead)
async def create_prompt(payload: PromptCreate, user: User = Depends(require_roles("admin", "designer")), session: AsyncSession = Depends(get_session)):
    prompt = Prompt(**payload.model_dump(), created_by_id=user.id, embedding=await embedding_service.embed(payload.body))
    session.add(prompt)
    await session.commit()
    await session.refresh(prompt)
    return prompt


@router.post("/{prompt_id}/duplicate", response_model=PromptRead)
async def duplicate_prompt(prompt_id: int, user: User = Depends(require_roles("admin", "designer")), session: AsyncSession = Depends(get_session)):
    source = await session.get(Prompt, prompt_id)
    if not source:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt = Prompt(
        name=f"{source.name} Copy",
        body=source.body,
        component_id=source.component_id,
        system_prompt=source.system_prompt,
        developer_prompt=source.developer_prompt,
        user_prompt_template=source.user_prompt_template,
        negative_prompt=source.negative_prompt,
        example_input=source.example_input,
        example_output_code=source.example_output_code,
        reference_code=source.reference_code,
        token_placeholders=source.token_placeholders,
        design_constraints=source.design_constraints,
        accessibility_requirements=source.accessibility_requirements,
        framework_targets=source.framework_targets,
        status=source.status,
        version=1,
        ai_metadata=source.ai_metadata,
        created_by_id=user.id,
        embedding=source.embedding,
    )
    session.add(prompt)
    await session.commit()
    await session.refresh(prompt)
    return prompt


@router.post("/{prompt_id}/versions", response_model=PromptRead)
async def create_prompt_version(prompt_id: int, payload: PromptCreate, user: User = Depends(require_roles("admin", "designer")), session: AsyncSession = Depends(get_session)):
    source = await session.get(Prompt, prompt_id)
    if not source:
        raise HTTPException(status_code=404, detail="Prompt not found")
    data = payload.model_dump()
    data["component_id"] = source.component_id
    prompt = Prompt(**data, version=source.version + 1, created_by_id=user.id, embedding=await embedding_service.embed(payload.body))
    session.add(prompt)
    await session.commit()
    await session.refresh(prompt)
    return prompt


@router.get("/{prompt_id}/versions", response_model=list[PromptRead])
async def prompt_versions(prompt_id: int, session: AsyncSession = Depends(get_session), user: User = Depends(get_current_user)):
    source = await session.get(Prompt, prompt_id)
    if not source:
        raise HTTPException(status_code=404, detail="Prompt not found")
    result = await session.execute(select(Prompt).where(Prompt.name == source.name).order_by(Prompt.version.desc()))
    return result.scalars().all()
