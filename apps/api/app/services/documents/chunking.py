"""Intelligent sentence and paragraph-aware text chunker with overlap."""

from dataclasses import dataclass
import re
from typing import List, Tuple


@dataclass
class TextChunk:
    chunk_index: int
    content: str
    page_number: int


def chunk_document_text(
    pages: List[Tuple[int, str]],
    target_chunk_size: int = 600,
    overlap: int = 100,
) -> List[TextChunk]:
    """Chunk document pages into overlapping text blocks.
    
    Args:
        pages: List of (page_number, page_text) tuples.
        target_chunk_size: Ideal target character count per chunk.
        overlap: Character overlap between consecutive chunks.
    
    Returns:
        List of TextChunk items.
    """
    chunks: List[TextChunk] = []
    chunk_counter = 0

    for page_num, text in pages:
        clean_text = text.strip()
        if not clean_text:
            continue

        if len(clean_text) <= target_chunk_size:
            chunks.append(
                TextChunk(
                    chunk_index=chunk_counter,
                    content=clean_text,
                    page_number=page_num,
                )
            )
            chunk_counter += 1
            continue

        # Split into sentences
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_text) if s.strip()]
        current_chunk = ""

        for sentence in sentences:
            if len(current_chunk) + len(sentence) <= target_chunk_size:
                current_chunk = f"{current_chunk} {sentence}".strip()
            else:
                if current_chunk:
                    chunks.append(
                        TextChunk(
                            chunk_index=chunk_counter,
                            content=current_chunk,
                            page_number=page_num,
                        )
                    )
                    chunk_counter += 1
                    # Retain trailing overlap
                    overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = f"{overlap_text} {sentence}".strip()
                else:
                    current_chunk = sentence

        if current_chunk:
            chunks.append(
                TextChunk(
                    chunk_index=chunk_counter,
                    content=current_chunk,
                    page_number=page_num,
                )
            )
            chunk_counter += 1

    return chunks
