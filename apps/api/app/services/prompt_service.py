"""Prompt Library business logic service."""

import logging
from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.prompt import Prompt
from app.schemas.prompts import PromptCreate, PromptUpdate

logger = logging.getLogger(__name__)

SYSTEM_SEED_PROMPTS = [
    {
        "title": "Code Review & Refactor",
        "description": "Thoroughly review code for performance, security, and architectural cleanliness.",
        "category": "coding",
        "content": "Review this code for performance bottlenecks, security vulnerabilities, edge cases, and clean architecture best practices. Provide specific refactored snippets:\n\n```\n{{code}}\n```",
        "is_public": True,
        "is_featured": True,
    },
    {
        "title": "Bug Detective & Root Cause",
        "description": "Identify root causes of exceptions, crashes, or unintended behaviors.",
        "category": "coding",
        "content": "Analyze the following error trace or buggy snippet. Explain why it occurs and provide the exact corrected code:\n\n```\n{{error_or_code}}\n```",
        "is_public": True,
        "is_featured": True,
    },
    {
        "title": "SQL Query Optimizer",
        "description": "Analyze queries for indexing efficiency, join performance, and rewrites.",
        "category": "coding",
        "content": "Analyze this SQL query for execution plan bottlenecks, indexing opportunities, and potential Cartesian explosions. Provide an optimized rewrite:\n\n```sql\n{{query}}\n```",
        "is_public": True,
        "is_featured": False,
    },
    {
        "title": "Executive Summary Distillation",
        "description": "Turn complex reports or documents into high-impact executive summaries.",
        "category": "writing",
        "content": "Distill the following text into a crisp executive summary with:\n1. Core Objective\n2. Key Findings & Metrics\n3. Strategic Implications\n4. Recommended Next Steps\n\nText:\n{{text}}",
        "is_public": True,
        "is_featured": True,
    },
    {
        "title": "Tone & Clarity Polish",
        "description": "Elevate rough drafts into persuasive, articulate, and concise prose.",
        "category": "writing",
        "content": "Rewrite the following draft to make it compelling, authoritative, and direct. Eliminate passive voice and corporate jargon while preserving the core message:\n\n{{draft}}",
        "is_public": True,
        "is_featured": False,
    },
    {
        "title": "Meeting Action Items Extractor",
        "description": "Pull out action items, owners, deadlines, and decisions from rough notes.",
        "category": "productivity",
        "content": "Extract all actionable tasks, assignees, deadlines, and key decisions from these meeting notes. Format as a clean markdown table:\n\n{{notes}}",
        "is_public": True,
        "is_featured": True,
    },
    {
        "title": "SaaS Feature PRD Generator",
        "description": "Draft a comprehensive Product Requirements Document for a new feature.",
        "category": "productivity",
        "content": "Generate a comprehensive Product Requirements Document (PRD) for the following feature idea. Include User Problem, User Stories, Acceptance Criteria, Technical Considerations, and Success Metrics:\n\n{{feature_idea}}",
        "is_public": True,
        "is_featured": True,
    },
    {
        "title": "Strategic SWOT Analysis",
        "description": "Evaluate Strengths, Weaknesses, Opportunities, and Threats.",
        "category": "analysis",
        "content": "Perform an in-depth SWOT analysis for the following company or strategic initiative, considering current competitive landscape, market dynamics, and technological shifts:\n\n{{subject}}",
        "is_public": True,
        "is_featured": False,
    },
    {
        "title": "Data Insights & Anomaly Interpreter",
        "description": "Interpret data patterns, uncover anomalies, and generate actionable hypotheses.",
        "category": "analysis",
        "content": "Analyze the following metrics or dataset. Identify key trends, notable anomalies, probable drivers, and 3 high-impact recommendations:\n\n{{data}}",
        "is_public": True,
        "is_featured": False,
    },
]


class PromptService:
    """Service handling CRUD operations and seeding for Prompt Library."""

    @classmethod
    async def seed_system_prompts_if_empty(cls, db: AsyncSession) -> None:
        """Seed default system prompts if the table has no system prompts."""
        stmt = select(func.count(Prompt.id)).where(Prompt.user_id.is_(None))
        res = await db.execute(stmt)
        count = res.scalar() or 0
        if count == 0:
            logger.info("Seeding default system prompt library...")
            for seed in SYSTEM_SEED_PROMPTS:
                prompt = Prompt(
                    user_id=None,
                    title=seed["title"],
                    description=seed["description"],
                    category=seed["category"],
                    content=seed["content"],
                    is_public=seed["is_public"],
                    is_featured=seed["is_featured"],
                )
                db.add(prompt)
            await db.commit()

    @classmethod
    async def list_prompts(
        cls,
        db: AsyncSession,
        user_id: Optional[UUID] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        featured_only: bool = False,
    ) -> Tuple[List[Prompt], int, List[str]]:
        """List accessible prompts (system prompts, public prompts, and user's private prompts)."""
        await cls.seed_system_prompts_if_empty(db)

        # Base visibility filter: system prompts (user_id IS NULL), public prompts, or owned
        visibility_condition = or_(
            Prompt.user_id.is_(None),
            Prompt.is_public.is_(True),
            Prompt.user_id == user_id if user_id else False,
        )

        filters = [visibility_condition]

        if category and category.lower() != "all":
            filters.append(Prompt.category == category.lower())

        if featured_only:
            filters.append(Prompt.is_featured.is_(True))

        if search:
            search_term = f"%{search.strip().lower()}%"
            filters.append(
                or_(
                    func.lower(Prompt.title).like(search_term),
                    func.lower(Prompt.description).like(search_term),
                    func.lower(Prompt.content).like(search_term),
                )
            )

        # Query total count
        count_stmt = select(func.count(Prompt.id)).where(*filters)
        count_res = await db.execute(count_stmt)
        total = count_res.scalar() or 0

        # Query prompts (featured first, then most used, then newest)
        query = (
            select(Prompt)
            .where(*filters)
            .order_by(Prompt.is_featured.desc(), Prompt.usage_count.desc(), Prompt.created_at.desc())
        )
        res = await db.execute(query)
        prompts = list(res.scalars().all())

        # Collect distinct categories across accessible prompts
        cat_stmt = (
            select(distinct(Prompt.category))
            .where(visibility_condition)
            .order_by(Prompt.category.asc())
        )
        cat_res = await db.execute(cat_stmt)
        categories = [c for c in cat_res.scalars().all() if c]

        return prompts, total, categories

    @classmethod
    async def get_prompt(
        cls,
        db: AsyncSession,
        prompt_id: UUID,
        user_id: Optional[UUID] = None,
    ) -> Prompt:
        """Fetch a single prompt if accessible by user."""
        stmt = select(Prompt).where(Prompt.id == prompt_id)
        res = await db.execute(stmt)
        prompt = res.scalar_one_or_none()

        if not prompt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found.")

        # Access check
        if prompt.user_id is not None and not prompt.is_public and prompt.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        return prompt

    @classmethod
    async def create_prompt(
        cls,
        db: AsyncSession,
        user_id: UUID,
        data: PromptCreate,
    ) -> Prompt:
        """Create a user-owned custom prompt."""
        prompt = Prompt(
            user_id=user_id,
            title=data.title.strip(),
            content=data.content.strip(),
            description=data.description.strip() if data.description else None,
            category=data.category.strip().lower() if data.category else "general",
            is_public=data.is_public,
            is_featured=False,
        )
        db.add(prompt)
        await db.commit()
        await db.refresh(prompt)
        return prompt

    @classmethod
    async def update_prompt(
        cls,
        db: AsyncSession,
        prompt_id: UUID,
        user_id: UUID,
        data: PromptUpdate,
    ) -> Prompt:
        """Update a user-owned prompt."""
        prompt = await cls.get_prompt(db, prompt_id, user_id)

        if prompt.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot edit system or other users' prompts.",
            )

        if data.title is not None:
            prompt.title = data.title.strip()
        if data.content is not None:
            prompt.content = data.content.strip()
        if data.description is not None:
            prompt.description = data.description.strip()
        if data.category is not None:
            prompt.category = data.category.strip().lower()
        if data.is_public is not None:
            prompt.is_public = data.is_public

        await db.commit()
        await db.refresh(prompt)
        return prompt

    @classmethod
    async def delete_prompt(
        cls,
        db: AsyncSession,
        prompt_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Delete a user-owned prompt."""
        prompt = await cls.get_prompt(db, prompt_id, user_id)

        if prompt.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot delete system or other users' prompts.",
            )

        await db.delete(prompt)
        await db.commit()
        return True

    @classmethod
    async def record_prompt_usage(
        cls,
        db: AsyncSession,
        prompt_id: UUID,
    ) -> None:
        """Increment prompt usage counter."""
        stmt = select(Prompt).where(Prompt.id == prompt_id)
        res = await db.execute(stmt)
        prompt = res.scalar_one_or_none()
        if prompt:
            prompt.usage_count = (prompt.usage_count or 0) + 1
            await db.commit()
