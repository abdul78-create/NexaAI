"""Document text extraction engine supporting TXT, Markdown, PDF, and DOCX formats."""

import io
import re
from typing import List, Tuple


def extract_text_from_file(filename: str, content_bytes: bytes) -> Tuple[str, List[Tuple[int, str]]]:
    """Extract raw text and page/section chunks from uploaded file bytes.
    
    Returns:
        Tuple[str, List[Tuple[page_number, page_text]]]
    """
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    if ext in ["txt", "md"] or "text" in filename:
        full_text = content_bytes.decode("utf-8", errors="replace")
        # Split into logical sections by double newline
        sections = [s.strip() for s in full_text.split("\n\n") if s.strip()]
        pages = [(i + 1, sec) for i, sec in enumerate(sections)] if sections else [(1, full_text)]
        return full_text, pages

    elif ext == "pdf":
        try:
            # Try pypdf if installed
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            pages = []
            full_text_parts = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    pages.append((i + 1, text.strip()))
                    full_text_parts.append(text.strip())
            full_text = "\n\n".join(full_text_parts)
            if full_text.strip():
                return full_text, pages
        except Exception:
            pass

        # Fallback raw PDF string extraction
        raw_text = content_bytes.decode("utf-8", errors="ignore")
        clean_text = re.sub(r"[^\x20-\x7E\n]", " ", raw_text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()
        return clean_text or "PDF Text Content", [(1, clean_text or "PDF Text Content")]

    elif ext == "docx":
        try:
            # Try python-docx if installed
            import docx
            doc = docx.Document(io.BytesIO(content_bytes))
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            full_text = "\n\n".join(paragraphs)
            pages = [(i + 1, p) for i, p in enumerate(paragraphs)]
            return full_text, pages
        except Exception:
            pass

        # Fallback DOCX XML extraction
        try:
            import zipfile
            from xml.etree import ElementTree
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                xml_content = z.read("word/document.xml")
                tree = ElementTree.fromstring(xml_content)
                text_nodes = tree.iter()
                words = [node.text for node in text_nodes if node.tag.endswith("t") and node.text]
                full_text = " ".join(words)
                return full_text, [(1, full_text)]
        except Exception:
            pass

        raw_text = content_bytes.decode("utf-8", errors="ignore")
        clean_text = re.sub(r"[^\x20-\x7E\n]", " ", raw_text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()
        return clean_text or "DOCX Text Content", [(1, clean_text or "DOCX Text Content")]

    # Default text fallback
    full_text = content_bytes.decode("utf-8", errors="replace")
    return full_text, [(1, full_text)]
