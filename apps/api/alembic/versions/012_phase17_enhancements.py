"""create folders table and add phase 17 conversation/message columns

Revision ID: 012_phase17_enhancements
Revises: 011_conversation_shares
Create Date: 2026-09-16 19:05:00.000000

Phase 17 Sub-phase 17.1.1: Migration for folders, conversation workspace fields (is_pinned, deleted_at, folder_id, active_leaf_message_id), and message parent_message_id.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '012_phase17_enhancements'
down_revision: Union[str, None] = '011_conversation_shares'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create folders table
    op.create_table(
        'folders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=30), nullable=False, server_default='indigo'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_user_folder_name'),
    )
    op.create_index(op.f('ix_folders_user_id'), 'folders', ['user_id'], unique=False)

    # 2. Add columns to conversations (DO NOT RECREATE is_archived - ALREADY EXISTS)
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('folder_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key('fk_conversations_folder_id', 'folders', ['folder_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index(op.f('ix_conversations_deleted_at'), ['deleted_at'], unique=False)
        batch_op.create_index(op.f('ix_conversations_folder_id'), ['folder_id'], unique=False)

    # 3. Add parent_message_id to chat_messages
    with op.batch_alter_table('chat_messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parent_message_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key('fk_chat_messages_parent_message_id', 'chat_messages', ['parent_message_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index(op.f('ix_chat_messages_parent_message_id'), ['parent_message_id'], unique=False)

    # 4. Add active_leaf_message_id to conversations (after chat_messages exists)
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('active_leaf_message_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key('fk_conversations_active_leaf_message_id', 'chat_messages', ['active_leaf_message_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index(op.f('ix_conversations_active_leaf_message_id'), ['active_leaf_message_id'], unique=False)


def downgrade() -> None:
    # 1. Drop active_leaf_message_id from conversations
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_conversations_active_leaf_message_id', type_='foreignkey')
        batch_op.drop_index(op.f('ix_conversations_active_leaf_message_id'))
        batch_op.drop_column('active_leaf_message_id')

    # 2. Drop parent_message_id from chat_messages
    with op.batch_alter_table('chat_messages', schema=None) as batch_op:
        batch_op.drop_constraint('fk_chat_messages_parent_message_id', type_='foreignkey')
        batch_op.drop_index(op.f('ix_chat_messages_parent_message_id'))
        batch_op.drop_column('parent_message_id')

    # 3. Drop is_pinned, deleted_at, folder_id from conversations
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_conversations_folder_id', type_='foreignkey')
        batch_op.drop_index(op.f('ix_conversations_folder_id'))
        batch_op.drop_index(op.f('ix_conversations_deleted_at'))
        batch_op.drop_column('folder_id')
        batch_op.drop_column('deleted_at')
        batch_op.drop_column('is_pinned')

    # 4. Drop folders table
    op.drop_index(op.f('ix_folders_user_id'), table_name='folders')
    op.drop_table('folders')
