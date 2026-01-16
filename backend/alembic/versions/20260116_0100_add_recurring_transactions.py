"""Add recurring_transactions table

Revision ID: add_recurring_trans
Revises: add_is_admin
Create Date: 2026-01-16 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_recurring_trans'
down_revision: Union[str, None] = 'add_is_admin'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'recurring_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('frequency', sa.String(20), nullable=False),
        sa.Column('day_of_month', sa.Integer, nullable=True),
        sa.Column('day_of_week', sa.Integer, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('last_created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_recurring_transactions_user_id', 'recurring_transactions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_recurring_transactions_user_id')
    op.drop_table('recurring_transactions')
