"""create chat_message_attachments table

Revision ID: 009_chat_message_attachments
Revises: 008_speech_transcriptions
Create Date: 2026-09-16 18:40:00.000000

Phase 14: Multimodal Chat Composer.
Creates the 'chat_message_attachments' join table linking ChatMessage and Attachment.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_chat_message_attachments'
down_revision: Union[str, None] = '008_speech_transcriptions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chat_message_attachments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('message_id', sa.Uuid(), nullable=False),
        sa.Column('attachment_id', sa.Uuid(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False, server_default='image'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['chat_messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['attachment_id'], ['attachments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_chat_message_attachments_message_id'), 'chat_message_attachments', ['message_id'], unique=False)
    op.create_index(op.f('ix_chat_message_attachments_attachment_id'), 'chat_message_attachments', ['attachment_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chat_message_attachments_attachment_id'), table_name='chat_message_attachments')
    op.drop_index(op.f('ix_chat_message_attachments_message_id'), table_name='chat_message_attachments')
    op.drop_table('chat_message_attachments')
