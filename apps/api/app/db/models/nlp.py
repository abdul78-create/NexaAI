"""NLP Analysis ORM model."""

import uuid
from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class NLPAnalysis(Base, TimestampMixin):
    """Saved NLP text analysis report belonging to a registered user."""

    __tablename__ = "nlp_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Untitled Analysis",
    )
    original_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    analysis_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="full",
    )
    result_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    word_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    character_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Relationship
    user: Mapped["User"] = relationship(  # type: ignore # noqa: F821
        "User",
        back_populates="nlp_analyses",
    )

    def __repr__(self) -> str:
        return f"<NLPAnalysis {self.id} ({self.title})>"
