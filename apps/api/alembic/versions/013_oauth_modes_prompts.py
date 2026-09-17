"""add oauth_accounts, prompts tables and usage mode columns

Revision ID: 013_oauth_modes_prompts
Revises: 012_phase17_enhancements
Create Date: 2026-09-17 13:00:00.000000

Adds OAuth provider accounts table, prompt library table,
and new columns to ai_usage_logs (mode, conversation_id, message_id, estimated_cost).
Also makes users.hashed_password nullable for OAuth-only accounts.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "013_oauth_modes_prompts"
down_revision: Union[str, None] = "012_phase17_enhancements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── OAuth Accounts ──────────────────────────────────────────────────
    op.create_table(
        "oauth_accounts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(30), nullable=False, index=True),
        sa.Column("provider_account_id", sa.String(255), nullable=False),
        sa.Column("provider_email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
    )

    # ── Prompts ─────────────────────────────────────────────────────────
    op.create_table(
        "prompts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("title", sa.String(200), nullable=False, index=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("category", sa.String(50), nullable=False, server_default="general", index=True),
        sa.Column("is_public", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("is_featured", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("usage_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── User: make hashed_password nullable ─────────────────────────────
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "hashed_password",
            existing_type=sa.String(255),
            nullable=True,
        )

    # ── AIUsageLog: add mode, conversation_id, message_id, estimated_cost
    with op.batch_alter_table("ai_usage_logs") as batch_op:
        batch_op.add_column(sa.Column("mode", sa.String(20), nullable=True))
        batch_op.add_column(sa.Column("conversation_id", sa.Uuid(as_uuid=True), nullable=True))
        batch_op.add_column(sa.Column("message_id", sa.Uuid(as_uuid=True), nullable=True))
        batch_op.add_column(sa.Column("estimated_cost", sa.Float, nullable=True))
        batch_op.create_index("ix_usage_mode", ["mode"])
        batch_op.create_index("ix_usage_conversation_id", ["conversation_id"])


def downgrade() -> None:
    with op.batch_alter_table("ai_usage_logs") as batch_op:
        batch_op.drop_index("ix_usage_conversation_id")
        batch_op.drop_index("ix_usage_mode")
        batch_op.drop_column("estimated_cost")
        batch_op.drop_column("message_id")
        batch_op.drop_column("conversation_id")
        batch_op.drop_column("mode")

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "hashed_password",
            existing_type=sa.String(255),
            nullable=False,
        )

    op.drop_table("prompts")
    op.drop_table("oauth_accounts")
