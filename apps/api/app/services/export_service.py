"""Conversation export service supporting Markdown, JSON, and PDF formats."""

import io
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.chat import ChatMessage, Conversation


def sanitize_filename(title: str, format_ext: str) -> str:
    """Sanitize title for safe HTTP Content-Disposition header attachment filenames."""
    clean = re.sub(r"[^\w\s-]", "", title).strip()
    clean = re.sub(r"[-\s]+", "_", clean)
    if not clean:
        clean = "conversation"
    return f"{clean[:50]}.{format_ext}"


def generate_pure_pdf(title: str, messages: List[Dict[str, Any]]) -> bytes:
    """Generate valid PDF document bytes without external heavy binary dependencies."""
    text_lines: List[str] = [
        f"NexaAI Conversation Export: {title}",
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "=" * 60,
        "",
    ]

    for msg in messages:
        role_label = msg.get("role", "user").upper()
        created = msg.get("created_at", "")
        text_lines.append(f"[{role_label}] - {created}")
        
        # Wrap message content into clean lines
        raw_content = msg.get("content", "")
        for line in raw_content.splitlines():
            # Basic word wrapping at 75 chars
            while len(line) > 75:
                text_lines.append("  " + line[:75])
                line = line[75:]
            text_lines.append("  " + line)
        text_lines.append("")

    # Construct simple PDF stream
    pdf_buffer = io.BytesIO()
    pdf_buffer.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets = []
    
    # Obj 1: Catalog
    offsets.append(pdf_buffer.tell())
    pdf_buffer.write(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

    # Obj 2: Pages
    offsets.append(pdf_buffer.tell())
    pdf_buffer.write(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

    # Obj 3: Page
    offsets.append(pdf_buffer.tell())
    pdf_buffer.write(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n")

    # Build Content Stream
    stream_lines = ["BT", "/F1 10 Tf", "12 TL", "50 740 Td"]
    # Escaping special characters for PDF literal strings: (, ), \
    for line in text_lines[:50]:  # Up to 50 lines per page overview
        safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        # Encode as PDF text line
        stream_lines.append(f"({safe_line}) '")
    stream_lines.append("ET")

    stream_content = "\n".join(stream_lines).encode("latin-1", errors="replace")

    # Obj 4: Content Stream
    offsets.append(pdf_buffer.tell())
    pdf_buffer.write(f"4 0 obj\n<< /Length {len(stream_content)} >>\nstream\n".encode("ascii"))
    pdf_buffer.write(stream_content)
    pdf_buffer.write(b"\nendstream\nendobj\n")

    # Obj 5: Font
    offsets.append(pdf_buffer.tell())
    pdf_buffer.write(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n")

    # Xref Table
    start_xref = pdf_buffer.tell()
    pdf_buffer.write(f"xref\n0 6\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets:
        pdf_buffer.write(f"{off:010d} 00000 n \n".encode("ascii"))

    # Trailer
    pdf_buffer.write(f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{start_xref}\n%%EOF\n".encode("ascii"))

    return pdf_buffer.getvalue()


class ExportService:
    """Service handling multi-format conversation export."""

    @staticmethod
    async def get_conversation_for_export(
        db: AsyncSession,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Conversation]:
        """Fetch conversation with messages ensuring strict user ownership."""
        stmt = (
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
                Conversation.deleted_at.is_(None),
            )
            .options(selectinload(Conversation.messages))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


    @classmethod
    async def export_markdown(
        cls,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Tuple[Optional[str], str]:
        """Export conversation as Markdown string."""
        conv = await cls.get_conversation_for_export(db, conversation_id, user_id)
        if not conv:
            return None, "conversation.md"

        filename = sanitize_filename(conv.title, "md")
        lines = [
            f"# {conv.title}",
            "",
            f"*Exported from NexaAI on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}*",
            f"*Model: `{conv.model}`*",
            "",
            "---",
            "",
        ]

        for msg in conv.messages:
            role_heading = msg.role.capitalize()
            timestamp = msg.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
            lines.append(f"### {role_heading} ({timestamp})")
            lines.append("")
            lines.append(msg.content)
            lines.append("")

        return "\n".join(lines), filename

    @classmethod
    async def export_json(
        cls,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        """Export conversation as structured JSON payload."""
        conv = await cls.get_conversation_for_export(db, conversation_id, user_id)
        if not conv:
            return None, "conversation.json"

        filename = sanitize_filename(conv.title, "json")
        messages_data = []
        for msg in conv.messages:
            messages_data.append(
                {
                    "id": str(msg.id),
                    "role": msg.role,
                    "content": msg.content,
                    "model": msg.model,
                    "input_tokens": msg.input_tokens,
                    "output_tokens": msg.output_tokens,
                    "created_at": msg.created_at.isoformat(),
                }
            )

        payload = {
            "conversation_id": str(conv.id),
            "title": conv.title,
            "model": conv.model,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
            "messages": messages_data,
        }

        return payload, filename

    @classmethod
    async def export_pdf(
        cls,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Tuple[Optional[bytes], str]:
        """Export conversation as PDF binary bytes."""
        conv = await cls.get_conversation_for_export(db, conversation_id, user_id)
        if not conv:
            return None, "conversation.pdf"

        filename = sanitize_filename(conv.title, "pdf")
        messages_data = [
            {
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for msg in conv.messages
        ]

        pdf_bytes = generate_pure_pdf(conv.title, messages_data)
        return pdf_bytes, filename
