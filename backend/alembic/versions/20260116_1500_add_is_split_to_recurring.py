"""Add is_split column to recurring_transactions

Revision ID: add_recurring_split
Revises: add_recurring_trans
Create Date: 2026-01-16 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_recurring_split'
down_revision: Union[str, None] = 'add_recurring_trans'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'recurring_transactions',
        sa.Column('is_split', sa.Boolean, nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('recurring_transactions', 'is_split')
