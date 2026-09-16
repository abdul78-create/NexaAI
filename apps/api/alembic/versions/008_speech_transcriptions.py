"""create speech_transcriptions table

Revision ID: 008_speech_transcriptions
Revises: 007_ai_usage_logs
Create Date: 2026-09-16 18:30:00.000000

Phase 13: Speech Intelligence and Speech-to-Text.
Creates the 'speech_transcriptions' table for recording audio transcriptions,
provider metadata, audio duration, and execution status.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_speech_transcriptions'
down_revision: Union[str, None] = '007_ai_usage_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'speech_transcriptions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('attachment_id', sa.Uuid(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='mock'),
        sa.Column('model_name', sa.String(length=100), nullable=False, server_default='whisper-1'),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('transcript', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='completed'),
        sa.Column('duration_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('audio_duration_seconds', sa.Float(), nullable=True),
        sa.Column('is_mock', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('error_code', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['attachment_id'], ['attachments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_speech_transcriptions_user_id'), 'speech_transcriptions', ['user_id'], unique=False)
    op.create_index(op.f('ix_speech_transcriptions_attachment_id'), 'speech_transcriptions', ['attachment_id'], unique=False)
    op.create_index(op.f('ix_speech_transcriptions_provider'), 'speech_transcriptions', ['provider'], unique=False)
    op.create_index(op.f('ix_speech_transcriptions_status'), 'speech_transcriptions', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_speech_transcriptions_status'), table_name='speech_transcriptions')
    op.drop_index(op.f('ix_speech_transcriptions_provider'), table_name='speech_transcriptions')
    op.drop_index(op.f('ix_speech_transcriptions_attachment_id'), table_name='speech_transcriptions')
    op.drop_index(op.f('ix_speech_transcriptions_user_id'), table_name='speech_transcriptions')
    op.drop_table('speech_transcriptions')
