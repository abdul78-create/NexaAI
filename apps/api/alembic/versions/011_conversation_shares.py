"""create conversation_shares table

Revision ID: 011_conversation_shares
Revises: 010_user_preferences
Create Date: 2026-09-16 19:00:00.000000

Phase 16: Conversation Search, Export, and Secure Sharing.
Creates the 'conversation_shares' table for hashed-token public conversation sharing.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011_conversation_shares'
down_revision: Union[str, None] = '010_user_preferences'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'conversation_shares',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('conversation_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
    )
    op.create_index(op.f('ix_conversation_shares_conversation_id'), 'conversation_shares', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_shares_owner_id'), 'conversation_shares', ['owner_id'], unique=False)
    op.create_index(op.f('ix_conversation_shares_token_hash'), 'conversation_shares', ['token_hash'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_conversation_shares_token_hash'), table_name='conversation_shares')
    op.drop_index(op.f('ix_conversation_shares_owner_id'), table_name='conversation_shares')
    op.drop_index(op.f('ix_conversation_shares_conversation_id'), table_name='conversation_shares')
    op.drop_table('conversation_shares')
