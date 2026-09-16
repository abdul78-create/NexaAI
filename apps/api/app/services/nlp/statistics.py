"""Text statistics and readability scoring engine."""

import re
from app.services.nlp.base import ReadabilityData, TextStatisticsData, ToxicityData

PROFANITY_LIST = {"badword1", "swear", "abuse", "hate", "slur", "harass"}


def _count_syllables(word: str) -> int:
    """Estimate syllable count in a single word."""
    word = word.lower()
    if len(word) <= 3:
        return 1
    word = re.sub(r'(?:[^laeiouy]es|ed|[^laeiouy]e)$', '', word)
    word = re.sub(r'^y', '', word)
    syllables = len(re.findall(r'[aeiouy]{1,2}', word))
    return max(1, syllables)


def calculate_text_statistics(text: str) -> TextStatisticsData:
    """Calculate character count, word count, sentence count, reading & speaking time."""
    char_count = len(text)
    words = re.findall(r"\b\w+\b", text)
    word_count = len(words)

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    sentence_count = max(1, len(sentences))

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    paragraph_count = max(1, len(paragraphs))

    unique_words = len(set(w.lower() for w in words)) if words else 0
    lexical_diversity = round(unique_words / max(1, word_count), 2)

    # Average reading speed = 200 words per minute
    reading_time = round((word_count / 200) * 60, 1)
    # Average speaking speed = 130 words per minute
    speaking_time = round((word_count / 130) * 60, 1)

    return TextStatisticsData(
        character_count=char_count,
        word_count=word_count,
        sentence_count=sentence_count,
        paragraph_count=paragraph_count,
        reading_time_seconds=reading_time,
        speaking_time_seconds=speaking_time,
        unique_words_count=unique_words,
        lexical_diversity=lexical_diversity,
    )


def calculate_readability(text: str) -> ReadabilityData:
    """Calculate Flesch Reading Ease and Flesch-Kincaid Grade Level."""
    words = re.findall(r"\b\w+\b", text)
    word_count = len(words)
    if word_count == 0:
        return ReadabilityData(
            flesch_kincaid_grade=0.0,
            flesch_reading_ease=100.0,
            reading_level="Easy",
            gunning_fog_index=0.0,
        )

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    sentence_count = max(1, len(sentences))
    total_syllables = sum(_count_syllables(w) for w in words)

    # Flesch Reading Ease formula: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
    ease = 206.835 - (1.015 * (word_count / sentence_count)) - (84.6 * (total_syllables / word_count))
    ease = round(max(0.0, min(100.0, ease)), 1)

    # Flesch-Kincaid Grade Level formula: 0.39*(words/sentences) + 11.8*(syllables/words) - 15.59
    grade = 0.39 * (word_count / sentence_count) + 11.8 * (total_syllables / word_count) - 15.59
    grade = round(max(0.0, grade), 1)

    # Gunning Fog Index: 0.4 * ((words/sentences) + 100 * (complex_words/words))
    complex_words = sum(1 for w in words if _count_syllables(w) >= 3)
    fog = 0.4 * ((word_count / sentence_count) + (100.0 * (complex_words / word_count)))
    fog = round(max(0.0, fog), 1)

    if ease >= 80:
        level = "Easy / Elementary"
    elif ease >= 60:
        level = "Standard / Conversational"
    elif ease >= 40:
        level = "Moderate / High School"
    else:
        level = "Advanced / Academic"

    return ReadabilityData(
        flesch_kincaid_grade=grade,
        flesch_reading_ease=ease,
        reading_level=level,
        gunning_fog_index=fog,
    )


def evaluate_safety(text: str) -> ToxicityData:
    """Evaluate toxicity risk and profanity presence."""
    words = [w.lower() for w in re.findall(r"\b\w+\b", text)]
    profanity_found = any(w in PROFANITY_LIST for w in words)

    tox_score = 0.05
    if profanity_found:
        tox_score = 0.85

    return ToxicityData(
        is_safe=not profanity_found,
        toxicity_score=tox_score,
        profanity_detected=profanity_found,
        sentiment_warning=False,
    )
