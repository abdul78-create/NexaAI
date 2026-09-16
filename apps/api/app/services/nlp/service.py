"""NLP Service orchestrator managing text analytics pipelines and DB persistence."""

import json
from dataclasses import asdict
import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.nlp import NLPAnalysis
from app.services.nlp.base import NLPAnalysisResult
from app.services.nlp.entities import extract_entities, extract_keywords
from app.services.nlp.sentiment import analyze_sentiment, classify_intent, detect_emotions
from app.services.nlp.statistics import calculate_readability, calculate_text_statistics, evaluate_safety
from app.services.nlp.summarizer import generate_summary


class NLPService:
    """Orchestrates natural language processing pipelines and report persistence."""

    @staticmethod
    def process_text(text: str, title: Optional[str] = None) -> NLPAnalysisResult:
        """Run full NLP pipeline on input text string."""
        clean_text = text.strip()
        auto_title = title or (clean_text[:35] + "..." if len(clean_text) > 35 else clean_text) or "Untitled Analysis"

        sentiment_res = analyze_sentiment(clean_text)
        emotion_res = detect_emotions(clean_text)
        intent_res = classify_intent(clean_text)
        entities_res = extract_entities(clean_text)
        keywords_res = extract_keywords(clean_text)
        summary_res = generate_summary(clean_text)
        readability_res = calculate_readability(clean_text)
        statistics_res = calculate_text_statistics(clean_text)
        safety_res = evaluate_safety(clean_text)

        return NLPAnalysisResult(
            title=auto_title,
            language="English",
            language_confidence=0.98,
            sentiment=sentiment_res,
            emotions=emotion_res,
            intent=intent_res,
            entities=entities_res,
            keywords=keywords_res,
            summary=summary_res,
            readability=readability_res,
            statistics=statistics_res,
            safety=safety_res,
        )

    @classmethod
    async def analyze_and_save(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        text: str,
        title: Optional[str] = None,
    ) -> NLPAnalysis:
        """Run NLP pipeline and persist result report for authenticated user."""
        result = cls.process_text(text, title=title)
        result_dict = asdict(result)

        analysis = NLPAnalysis(
            user_id=user_id,
            title=result.title,
            original_text=text,
            analysis_type="full",
            result_json=json.dumps(result_dict),
            word_count=result.statistics.word_count,
            character_count=result.statistics.character_count,
        )
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        return analysis

    @staticmethod
    async def get_user_analysis(
        db: AsyncSession,
        analysis_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[NLPAnalysis]:
        """Retrieve NLP report by ID strictly enforcing ownership."""
        stmt = select(NLPAnalysis).where(
            NLPAnalysis.id == analysis_id,
            NLPAnalysis.user_id == user_id,
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_user_analyses(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> List[NLPAnalysis]:
        """List all NLP reports owned by authenticated user."""
        stmt = (
            select(NLPAnalysis)
            .where(NLPAnalysis.user_id == user_id)
            .order_by(NLPAnalysis.created_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @classmethod
    async def delete_user_analysis(
        cls,
        db: AsyncSession,
        analysis_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Delete an NLP analysis report owned by user_id."""
        item = await cls.get_user_analysis(db, analysis_id, user_id)
        if not item:
            return False

        await db.delete(item)
        await db.commit()
        return True
