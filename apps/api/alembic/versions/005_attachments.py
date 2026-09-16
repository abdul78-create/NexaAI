"""create attachments table

Revision ID: 005_attachments
Revises: 004_documents_rag
Create Date: 2026-09-16 18:00:00.000000

Phase 10: Multimodal Foundation & Secure File Infrastructure.
Creates the generic 'attachments' table that supports image, audio,
document, and future media uploads. Does not alter any existing tables.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_attachments'
down_revision: Union[str, None] = '004_documents_rag'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'attachments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        # File identity
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('storage_key', sa.String(length=512), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=False),
        # Classification
        sa.Column('media_type', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='uploading'),
        # Optional metadata
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        # Soft delete
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        # Constraints
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('storage_key'),
    )
    op.create_index(op.f('ix_attachments_user_id'), 'attachments', ['user_id'], unique=False)
    op.create_index(op.f('ix_attachments_media_type'), 'attachments', ['media_type'], unique=False)
    op.create_index(op.f('ix_attachments_status'), 'attachments', ['status'], unique=False)
    op.create_index(op.f('ix_attachments_deleted_at'), 'attachments', ['deleted_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_attachments_deleted_at'), table_name='attachments')
    op.drop_index(op.f('ix_attachments_status'), table_name='attachments')
    op.drop_index(op.f('ix_attachments_media_type'), table_name='attachments')
    op.drop_index(op.f('ix_attachments_user_id'), table_name='attachments')
    op.drop_table('attachments')
