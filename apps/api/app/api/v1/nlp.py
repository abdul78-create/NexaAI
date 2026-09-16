"""NLP Analysis endpoints router."""

import json
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.nlp import (
    NLPAnalysisDetailResponse,
    NLPAnalysisSummaryResponse,
    NLPAnalyzeRequest,
)
from app.services.nlp.service import NLPService

router = APIRouter(prefix="/nlp", tags=["NLP Analysis Studio"])


@router.post(
    "/analyze",
    response_model=NLPAnalysisDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze text with sentiment, NER, keywords, readability, and summarization",
)
async def analyze_text(
    payload: NLPAnalyzeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NLPAnalysisDetailResponse:
    """Run full NLP pipeline and persist result report for authenticated user."""
    analysis = await NLPService.analyze_and_save(
        db=db,
        user_id=current_user.id,
        text=payload.text,
        title=payload.title,
    )
    result_dict = json.loads(analysis.result_json)
    return NLPAnalysisDetailResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        title=analysis.title,
        original_text=analysis.original_text,
        result=result_dict,
        word_count=analysis.word_count,
        character_count=analysis.character_count,
        created_at=analysis.created_at,
    )


@router.get(
    "/history",
    response_model=List[NLPAnalysisSummaryResponse],
    summary="List past NLP reports owned by authenticated user",
)
async def list_nlp_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[NLPAnalysisSummaryResponse]:
    """Retrieve history of saved NLP reports for caller."""
    items = await NLPService.list_user_analyses(db, current_user.id)
    return [NLPAnalysisSummaryResponse.model_validate(item) for item in items]


@router.get(
    "/history/{analysis_id}",
    response_model=NLPAnalysisDetailResponse,
    summary="Get detailed NLP analysis report by ID",
)
async def get_nlp_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> NLPAnalysisDetailResponse:
    """Get NLP analysis report strictly enforcing user ownership."""
    analysis = await NLPService.get_user_analysis(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NLP analysis report not found or access denied.",
        )
    result_dict = json.loads(analysis.result_json)
    return NLPAnalysisDetailResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        title=analysis.title,
        original_text=analysis.original_text,
        result=result_dict,
        word_count=analysis.word_count,
        character_count=analysis.character_count,
        created_at=analysis.created_at,
    )


@router.delete(
    "/history/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an NLP analysis report",
)
async def delete_nlp_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an NLP analysis report owned by caller."""
    deleted = await NLPService.delete_user_analysis(db, analysis_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NLP analysis report not found or access denied.",
        )
    return None
