"""Prompt Library API endpoints."""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_optional_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.prompts import (
    PromptCreate,
    PromptListResponse,
    PromptResponse,
    PromptUpdate,
)
from app.services.prompt_service import PromptService

router = APIRouter(prefix="/prompts", tags=["Prompt Library"])


@router.get(
    "",
    response_model=PromptListResponse,
    summary="List accessible prompts in the library",
)
async def list_prompts(
    category: Optional[str] = Query(None, description="Filter by category (coding, writing, etc.)"),
    search: Optional[str] = Query(None, description="Search query across title, description, content"),
    featured_only: bool = Query(False, description="Filter only featured prompts"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromptListResponse:
    """Retrieve all prompts accessible to the caller: system prompts, public prompts, and own private prompts."""
    user_id = current_user.id if current_user else None
    prompts, total, categories = await PromptService.list_prompts(
        db=db,
        user_id=user_id,
        category=category,
        search=search,
        featured_only=featured_only,
    )
    items = [PromptResponse.model_validate(p) for p in prompts]
    return PromptListResponse(items=items, total=total, categories=categories)


@router.get(
    "/{prompt_id}",
    response_model=PromptResponse,
    summary="Get details of a single prompt",
)
async def get_prompt(
    prompt_id: UUID,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromptResponse:
    """Fetch prompt details if publicly accessible or owned by user."""
    user_id = current_user.id if current_user else None
    prompt = await PromptService.get_prompt(db=db, prompt_id=prompt_id, user_id=user_id)
    return PromptResponse.model_validate(prompt)


@router.post(
    "",
    response_model=PromptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a custom prompt template",
)
async def create_prompt(
    data: PromptCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PromptResponse:
    """Create a new custom prompt template owned by authenticated user."""
    prompt = await PromptService.create_prompt(db=db, user_id=current_user.id, data=data)
    return PromptResponse.model_validate(prompt)


@router.patch(
    "/{prompt_id}",
    response_model=PromptResponse,
    summary="Update a user-owned custom prompt",
)
async def update_prompt(
    prompt_id: UUID,
    data: PromptUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PromptResponse:
    """Update fields on a prompt owned by the authenticated user."""
    prompt = await PromptService.update_prompt(
        db=db,
        prompt_id=prompt_id,
        user_id=current_user.id,
        data=data,
    )
    return PromptResponse.model_validate(prompt)


@router.delete(
    "/{prompt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user-owned custom prompt",
)
async def delete_prompt(
    prompt_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a custom prompt owned by the authenticated user."""
    await PromptService.delete_prompt(db=db, prompt_id=prompt_id, user_id=current_user.id)


@router.post(
    "/{prompt_id}/use",
    status_code=status.HTTP_200_OK,
    summary="Record that a prompt was used",
)
async def use_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Increments the usage count of a prompt template."""
    await PromptService.record_prompt_usage(db=db, prompt_id=prompt_id)
    return {"status": "ok"}
