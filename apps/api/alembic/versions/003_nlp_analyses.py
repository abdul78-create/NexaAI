"""create nlp_analyses table

Revision ID: 003_nlp_analyses
Revises: 002_chat_conversations
Create Date: 2026-09-16 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_nlp_analyses'
down_revision: Union[str, None] = '002_chat_conversations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'nlp_analyses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False, server_default='Untitled Analysis'),
        sa.Column('original_text', sa.Text(), nullable=False),
        sa.Column('analysis_type', sa.String(length=50), nullable=False, server_default='full'),
        sa.Column('result_json', sa.Text(), nullable=False),
        sa.Column('word_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('character_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_nlp_analyses_user_id'), 'nlp_analyses', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_nlp_analyses_user_id'), table_name='nlp_analyses')
    op.drop_table('nlp_analyses')
