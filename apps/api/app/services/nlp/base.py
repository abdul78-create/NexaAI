"""NLP Engine data structures and dataclasses."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


@dataclass
class SentimentData:
    label: str  # POSITIVE, NEGATIVE, NEUTRAL
    score: float  # 0.0 to 1.0
    positive_score: float
    negative_score: float
    neutral_score: float
    compound_score: float  # -1.0 to +1.0


@dataclass
class EmotionData:
    dominant_emotion: str  # Joy, Confidence, Sadness, Anger, Surprise, Fear
    scores: Dict[str, float]


@dataclass
class EntityData:
    text: str
    category: str  # PERSON, ORGANIZATION, LOCATION, DATE, TECHNOLOGY, PRODUCT
    confidence: float
    count: int = 1


@dataclass
class KeywordData:
    keyword: str
    relevance: float  # 0.0 to 1.0
    frequency: int
    category: Optional[str] = None


@dataclass
class SummaryData:
    executive_summary: str
    key_takeaways: List[str]
    bullet_points: List[str]
    compression_ratio: float


@dataclass
class ReadabilityData:
    flesch_kincaid_grade: float
    flesch_reading_ease: float
    reading_level: str  # Easy, Moderate, Advanced, Academic
    gunning_fog_index: float


@dataclass
class TextStatisticsData:
    character_count: int
    word_count: int
    sentence_count: int
    paragraph_count: int
    reading_time_seconds: float
    speaking_time_seconds: float
    unique_words_count: int
    lexical_diversity: float  # unique_words / total_words


@dataclass
class ToxicityData:
    is_safe: bool
    toxicity_score: float  # 0.0 to 1.0
    profanity_detected: bool
    sentiment_warning: bool


@dataclass
class NLPAnalysisResult:
    title: str
    language: str
    language_confidence: float
    sentiment: SentimentData
    emotions: EmotionData
    intent: str
    entities: List[EntityData]
    keywords: List[KeywordData]
    summary: SummaryData
    readability: ReadabilityData
    statistics: TextStatisticsData
    safety: ToxicityData
