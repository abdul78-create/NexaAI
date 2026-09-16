"""Automated test suite for NLP Analysis engine, API endpoints, and ownership security."""

import pytest
from httpx import AsyncClient

from app.services.nlp.entities import extract_entities, extract_keywords
from app.services.nlp.sentiment import analyze_sentiment, detect_emotions
from app.services.nlp.statistics import calculate_readability, calculate_text_statistics
from app.services.nlp.summarizer import generate_summary

pytestmark = pytest.mark.asyncio


async def _get_user_token(client: AsyncClient, email: str, name: str) -> str:
    """Helper to register and log in a test user, returning access token."""
    reg_payload = {
        "email": email,
        "password": "ValidPassword999!",
        "display_name": name,
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "ValidPassword999!"},
    )
    return login_res.json()["access_token"]


async def test_nlp_sentiment_unit():
    """Unit test for sentiment scoring and emotion detection."""
    positive_text = "NexaAI is a fantastic, wonderful, and amazing platform that provides great results!"
    sentiment = analyze_sentiment(positive_text)
    assert sentiment.label == "POSITIVE"
    assert sentiment.compound_score > 0

    emotions = detect_emotions(positive_text)
    assert emotions.dominant_emotion in ["Joy", "Confidence"]


async def test_nlp_entity_extraction_unit():
    """Unit test for NER entity classification and keyword extraction."""
    sample_text = "Abdul deployed NexaAI using Python, FastAPI, Docker, and PostgreSQL in London."
    entities = extract_entities(sample_text)
    categories = [e.category for e in entities]
    assert "TECHNOLOGY" in categories
    assert "LOCATION" in categories

    keywords = extract_keywords(sample_text)
    assert len(keywords) > 0


async def test_nlp_readability_and_stats_unit():
    """Unit test for text metrics and Flesch-Kincaid readability scoring."""
    sample_text = "The quick brown fox jumps over the lazy dog. Simple sentences improve clarity."
    stats = calculate_text_statistics(sample_text)
    assert stats.word_count > 5
    assert stats.sentence_count == 2
    assert stats.reading_time_seconds > 0

    readability = calculate_readability(sample_text)
    assert readability.flesch_reading_ease > 0
    assert readability.flesch_kincaid_grade >= 0


async def test_nlp_summarizer_unit():
    """Unit test for summary generation and key takeaways."""
    article = (
        "NexaAI has officially launched Phase 7 featuring the NLP Analysis Studio. "
        "The studio equips developers with real-time sentiment analysis, entity extraction, and readability metrics. "
        "Built using Python FastAPI and Next.js, it delivers high-performance text analytics for enterprise SaaS applications."
    )
    summary = generate_summary(article)
    assert summary.executive_summary != ""
    assert len(summary.key_takeaways) > 0
    assert summary.compression_ratio <= 1.0


async def test_nlp_api_analyze_and_history(client: AsyncClient):
    """Integration test for POST /api/v1/nlp/analyze, history listing, detail retrieval, and deletion."""
    token = await _get_user_token(client, "nlp_user@example.com", "NLP User")
    headers = {"Authorization": f"Bearer {token}"}

    sample_input = {
        "text": "NexaAI Phase 7 introduces deep natural language processing tools built with FastAPI and React.",
        "title": "Phase 7 Report",
    }

    # 1. Analyze text
    analyze_res = await client.post("/api/v1/nlp/analyze", headers=headers, json=sample_input)
    assert analyze_res.status_code == 201
    detail = analyze_res.json()
    analysis_id = detail["id"]
    assert detail["title"] == "Phase 7 Report"
    assert "sentiment" in detail["result"]
    assert "entities" in detail["result"]

    # 2. List history
    history_res = await client.get("/api/v1/nlp/history", headers=headers)
    assert history_res.status_code == 200
    history_list = history_res.json()
    assert len(history_list) >= 1
    assert any(h["id"] == analysis_id for h in history_list)

    # 3. Get analysis detail by ID
    get_detail_res = await client.get(f"/api/v1/nlp/history/{analysis_id}", headers=headers)
    assert get_detail_res.status_code == 200
    assert get_detail_res.json()["id"] == analysis_id

    # 4. Delete analysis
    del_res = await client.delete(f"/api/v1/nlp/history/{analysis_id}", headers=headers)
    assert del_res.status_code == 204

    # 5. Verify deletion returns 404
    verify_res = await client.get(f"/api/v1/nlp/history/{analysis_id}", headers=headers)
    assert verify_res.status_code == 404


async def test_nlp_strict_ownership(client: AsyncClient):
    """Strict security test: User A owns NLP Analysis A. User B CANNOT view or delete it."""
    token_a = await _get_user_token(client, "nlp_owner_a@example.com", "User A")
    token_b = await _get_user_token(client, "nlp_owner_b@example.com", "User B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates an analysis report
    create_res = await client.post(
        "/api/v1/nlp/analyze",
        headers=headers_a,
        json={"text": "User A Private Financial Context Analysis", "title": "Private Report"},
    )
    analysis_a_id = create_res.json()["id"]

    # User B attempts GET -> MUST return 404 Not Found
    get_b = await client.get(f"/api/v1/nlp/history/{analysis_a_id}", headers=headers_b)
    assert get_b.status_code == 404

    # User B attempts DELETE -> MUST return 404 Not Found
    del_b = await client.delete(f"/api/v1/nlp/history/{analysis_a_id}", headers=headers_b)
    assert del_b.status_code == 404
