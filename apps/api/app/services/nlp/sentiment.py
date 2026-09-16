"""Sentiment analysis and emotion detection analytics engine."""

import re
from typing import Dict, Tuple

from app.services.nlp.base import EmotionData, SentimentData


POSITIVE_WORDS = {
    "great", "excellent", "good", "amazing", "wonderful", "fantastic", "positive",
    "love", "outstanding", "impressive", "brilliant", "superb", "effective",
    "happy", "successful", "progress", "growth", "benefit", "powerful", "innovative",
    "leading", "ideal", "secure", "seamless", "fast", "reliable", "beautiful", "smooth",
}

NEGATIVE_WORDS = {
    "bad", "terrible", "poor", "horrible", "negative", "fail", "failed", "failure",
    "broken", "slow", "error", "defect", "critical", "flaw", "flawed", "issue",
    "problem", "hard", "difficult", "worst", "unfortunate", "hate", "cancel",
    "harmful", "risk", "bug", "crash", "denied", "forbidden", "loss", "danger",
}

EMOTION_KEYWORDS: Dict[str, set] = {
    "Joy": {"happy", "joy", "delight", "amazing", "wonderful", "celebrate", "great", "love", "smile", "excited"},
    "Confidence": {"sure", "confident", "proven", "guaranteed", "secure", "expert", "robust", "solid", "reliable"},
    "Sadness": {"sad", "unfortunate", "disappointed", "loss", "grief", "sorry", "tragic", "down", "regret"},
    "Anger": {"furious", "angry", "hate", "outrage", "annoyed", "frustrated", "terrible", "worst", "horrible"},
    "Surprise": {"surprised", "unexpected", "astonishing", "shocked", "incredible", "unbelievable", "wow"},
    "Fear": {"fear", "risk", "danger", "scared", "threat", "alarm", "warning", "critical", "vulnerable"},
}


def analyze_sentiment(text: str) -> SentimentData:
    """Analyze sentiment scores and compound polarity for text."""
    words = [w.lower() for w in re.findall(r"\b[a-zA-Z]+\b", text)]
    if not words:
        return SentimentData(
            label="NEUTRAL",
            score=0.5,
            positive_score=0.0,
            negative_score=0.0,
            neutral_score=1.0,
            compound_score=0.0,
        )

    pos_count = sum(1 for w in words if w in POSITIVE_WORDS)
    neg_count = sum(1 for w in words if w in NEGATIVE_WORDS)
    total = len(words)

    pos_ratio = round(pos_count / total, 3)
    neg_ratio = round(neg_count / total, 3)
    neu_ratio = round(max(0.0, 1.0 - pos_ratio - neg_ratio), 3)

    score_diff = pos_count - neg_count
    if score_diff > 0:
        compound = round(min(1.0, score_diff / max(3, pos_count + 1)), 3)
    elif score_diff < 0:
        compound = round(max(-1.0, score_diff / max(3, neg_count + 1)), 3)
    else:
        compound = 0.0

    if compound >= 0.05:
        label = "POSITIVE"
        overall_score = round(0.5 + (compound * 0.5), 3)
    elif compound <= -0.05:
        label = "NEGATIVE"
        overall_score = round(0.5 + (abs(compound) * 0.5), 3)
    else:
        label = "NEUTRAL"
        overall_score = 0.5

    return SentimentData(
        label=label,
        score=overall_score,
        positive_score=pos_ratio,
        negative_score=neg_ratio,
        neutral_score=neu_ratio,
        compound_score=compound,
    )


def detect_emotions(text: str) -> EmotionData:
    """Detect emotion distribution across input text."""
    words = [w.lower() for w in re.findall(r"\b[a-zA-Z]+\b", text)]
    scores: Dict[str, float] = {}

    for emotion, keywords in EMOTION_KEYWORDS.items():
        match_count = sum(1 for w in words if w in keywords)
        scores[emotion] = round(min(1.0, match_count * 0.25), 2)

    # Ensure baseline distribution
    if all(v == 0 for v in scores.values()):
        scores["Confidence"] = 0.6
        scores["Joy"] = 0.3
        scores["Surprise"] = 0.1

    dominant = max(scores.items(), key=lambda item: item[1])[0]

    return EmotionData(
        dominant_emotion=dominant,
        scores=scores,
    )


def classify_intent(text: str) -> str:
    """Classify user intent based on sentence patterns."""
    text_lower = text.lower()
    if any(q in text_lower for q in ["how to", "what is", "why does", "can you", "where is", "?"]):
        return "Inquiry / Information Seeking"
    elif any(cmd in text_lower for cmd in ["create", "build", "generate", "write", "make", "delete", "run"]):
        return "Task Execution / Action"
    elif any(fb in text_lower for fb in ["feedback", "suggest", "opinion", "think", "rating"]):
        return "Feedback / Evaluation"
    elif any(sup in text_lower for sup in ["help", "issue", "bug", "error", "problem", "broken", "support"]):
        return "Support / Troubleshooting"
    return "General Communication"
