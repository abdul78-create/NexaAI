"""Text summarization and takeaway extraction engine."""

import re
from typing import List

from app.services.nlp.base import SummaryData


def generate_summary(text: str) -> SummaryData:
    """Generate executive summary, key takeaways, and bullet point breakdown."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    total_words = len(text.split())

    if len(sentences) == 0:
        return SummaryData(
            executive_summary="No sufficient text provided for summarization.",
            key_takeaways=[],
            bullet_points=[],
            compression_ratio=1.0,
        )

    if len(sentences) <= 2:
        exec_summary = text.strip()
        takeaways = [s for s in sentences]
        bullet_points = [f"Direct context: {s}" for s in sentences]
        return SummaryData(
            executive_summary=exec_summary,
            key_takeaways=takeaways,
            bullet_points=bullet_points,
            compression_ratio=1.0,
        )

    # Take first sentence, middle sentence, and last sentence for balanced summary
    selected_sentences = [sentences[0]]
    if len(sentences) >= 4:
        selected_sentences.append(sentences[len(sentences) // 2])
    selected_sentences.append(sentences[-1])

    exec_summary = " ".join(selected_sentences)
    summary_words = len(exec_summary.split())
    compression = round(summary_words / max(1, total_words), 2)

    takeaways = [
        f"Primary Focus: {sentences[0]}",
        f"Core Analysis: {sentences[len(sentences) // 2] if len(sentences) > 2 else sentences[-1]}",
        f"Conclusion: {sentences[-1]}",
    ]

    bullet_points = [s for s in sentences[:5]]

    return SummaryData(
        executive_summary=exec_summary,
        key_takeaways=takeaways,
        bullet_points=bullet_points,
        compression_ratio=compression,
    )
