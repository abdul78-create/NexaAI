"""Named Entity Recognition (NER) and Keyword extraction engine."""

from collections import Counter
import re
from typing import List

from app.services.nlp.base import EntityData, KeywordData

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any",
    "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below",
    "between", "both", "but", "by", "can", "can't", "cannot", "could", "couldn't", "did",
    "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few",
    "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
    "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most",
    "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's",
    "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom",
    "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll",
    "you're", "you've", "your", "yours", "yourself", "yourselves", "here", "there",
}

TECH_TERMS = {
    "python", "fastapi", "react", "next.js", "typescript", "javascript", "sql", "postgresql",
    "sqlite", "docker", "alembic", "jwt", "argon2id", "sqlalchemy", "pydantic", "openai",
    "ollama", "vllm", "groq", "deepseek", "redis", "api", "rest", "sse", "http", "json",
}

ORGANIZATIONS = {
    "openai", "google", "meta", "microsoft", "anthropic", "apple", "amazon", "nexaai",
}


def extract_entities(text: str) -> List[EntityData]:
    """Extract Named Entities (Person, Org, Location, Date, Tech)."""
    entities: List[EntityData] = []
    seen = set()

    # 1. Tech & Framework Entities
    words = re.findall(r"\b[a-zA-Z0-9\.\-\#\+]+\b", text)
    word_counts = Counter(w.lower() for w in words)

    for word, count in word_counts.items():
        if word in TECH_TERMS and word not in seen:
            seen.add(word)
            entities.append(
                EntityData(
                    text=word.capitalize() if word in ["python", "docker", "react", "redis", "jwt"] else word.upper(),
                    category="TECHNOLOGY",
                    confidence=0.95,
                    count=count,
                )
            )
        elif word in ORGANIZATIONS and word not in seen:
            seen.add(word)
            entities.append(
                EntityData(
                    text="NexaAI" if word == "nexaai" else word.capitalize(),
                    category="ORGANIZATION",
                    confidence=0.92,
                    count=count,
                )
            )

    # 2. Capitalized Proper Nouns (Person / Organization / Location)
    capitalized_words = re.findall(r"\b[A-Z][a-z]{2,}\b", text)
    cap_counts = Counter(capitalized_words)

    for cap_word, count in cap_counts.items():
        lower = cap_word.lower()
        if lower not in STOPWORDS and lower not in seen and count >= 1:
            seen.add(lower)
            if cap_word in ["London", "Paris", "California", "Tokyo", "New York", "America", "Europe"]:
                cat = "LOCATION"
            elif cap_word in ["Abdul", "John", "Alice", "Bob", "Charlie", "David"]:
                cat = "PERSON"
            else:
                cat = "ORGANIZATION" if count > 1 else "CONCEPT"

            entities.append(
                EntityData(
                    text=cap_word,
                    category=cat,
                    confidence=0.85,
                    count=count,
                )
            )

    # 3. Dates and Numbers
    dates = re.findall(r"\b(?:\d{4}|\d{1,2}/\d{1,2}/\d{2,4}|January|February|March|April|May|June|July|August|September|October|November|December)\b", text, re.IGNORECASE)
    for d in set(dates):
        if d.lower() not in seen:
            seen.add(d.lower())
            entities.append(
                EntityData(
                    text=d,
                    category="DATE",
                    confidence=0.90,
                    count=1,
                )
            )

    return entities[:12]


def extract_keywords(text: str) -> List[KeywordData]:
    """Extract top ranked keywords and keyphrases with relevance scores."""
    raw_words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    filtered_words = [w for w in raw_words if w not in STOPWORDS]

    word_counts = Counter(filtered_words)
    total_filtered = max(1, len(filtered_words))

    keywords: List[KeywordData] = []
    for word, count in word_counts.most_common(12):
        relevance = round(min(1.0, (count / total_filtered) * 3.5 + 0.3), 2)
        category = "Technology" if word in TECH_TERMS else "Topic"
        keywords.append(
            KeywordData(
                keyword=word,
                relevance=relevance,
                frequency=count,
                category=category,
            )
        )

    return keywords
