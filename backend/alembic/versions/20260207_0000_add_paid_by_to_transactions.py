"""Add paid_by_user_id to transactions

Revision ID: add_paid_by
Revises: add_assets_table
Create Date: 2026-02-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_paid_by'
down_revision: Union[str, None] = 'add_assets_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('paid_by_user_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_transactions_paid_by_user_id',
        'transactions', 'users',
        ['paid_by_user_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_transactions_paid_by_user_id', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'paid_by_user_id')
