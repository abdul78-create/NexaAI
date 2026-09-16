"""create image_analyses table

Revision ID: 006_image_analyses
Revises: 005_attachments
Create Date: 2026-09-16 18:15:00.000000

Phase 11: Image Intelligence with OpenCV, OCR, and Vision AI.
Creates the 'image_analyses' table for tracking image processing operations,
OCR extractions, quality metrics, and Vision AI results.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_image_analyses'
down_revision: Union[str, None] = '005_attachments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'image_analyses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('attachment_id', sa.Uuid(), nullable=False),
        sa.Column('analysis_type', sa.String(length=50), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=True),
        sa.Column('result_json', sa.Text(), nullable=True),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('image_metadata_json', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='completed'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['attachment_id'], ['attachments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_image_analyses_user_id'), 'image_analyses', ['user_id'], unique=False)
    op.create_index(op.f('ix_image_analyses_attachment_id'), 'image_analyses', ['attachment_id'], unique=False)
    op.create_index(op.f('ix_image_analyses_analysis_type'), 'image_analyses', ['analysis_type'], unique=False)
    op.create_index(op.f('ix_image_analyses_status'), 'image_analyses', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_image_analyses_status'), table_name='image_analyses')
    op.drop_index(op.f('ix_image_analyses_analysis_type'), table_name='image_analyses')
    op.drop_index(op.f('ix_image_analyses_attachment_id'), table_name='image_analyses')
    op.drop_index(op.f('ix_image_analyses_user_id'), table_name='image_analyses')
    op.drop_table('image_analyses')
