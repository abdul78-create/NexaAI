"""create ai_usage_logs table

Revision ID: 007_ai_usage_logs
Revises: 006_image_analyses
Create Date: 2026-09-16 18:25:00.000000

Phase 12: Production OCR and Vision AI Integration.
Creates the 'ai_usage_logs' table for recording token consumption,
latency, provider metadata, and execution telemetry across features.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_ai_usage_logs'
down_revision: Union[str, None] = '006_image_analyses'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('feature_type', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False, server_default='unknown'),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('execution_duration_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='success'),
        sa.Column('error_code', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_ai_usage_logs_user_id'), 'ai_usage_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_feature_type'), 'ai_usage_logs', ['feature_type'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_provider'), 'ai_usage_logs', ['provider'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_status'), 'ai_usage_logs', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_usage_logs_status'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_provider'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_feature_type'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_user_id'), table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')
