"""create user_preferences table

Revision ID: 010_user_preferences
Revises: 009_chat_message_attachments
Create Date: 2026-09-16 18:41:00.000000

Phase 15: Settings Studio & AI Operations.
Creates the 'user_preferences' table for per-user settings.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010_user_preferences'
down_revision: Union[str, None] = '009_chat_message_attachments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('theme', sa.String(length=20), nullable=False, server_default='dark'),
        sa.Column('accent_color', sa.String(length=30), nullable=False, server_default='indigo'),
        sa.Column('default_model', sa.String(length=100), nullable=False, server_default='nexa-standard'),
        sa.Column('default_language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('auto_ocr_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('auto_rag_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('show_provider_disclosures', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('reduced_motion', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_preferences_user_id'), table_name='user_preferences')
    op.drop_table('user_preferences')
