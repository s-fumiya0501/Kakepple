"""Add authentication fields to users table

Revision ID: add_auth_fields
Revises: 7ada178c5612
Create Date: 2026-01-09 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_auth_fields'
down_revision: Union[str, None] = '7ada178c5612'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to users table
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('apple_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('line_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))

    # Make google_id nullable (was NOT NULL before)
    op.alter_column('users', 'google_id', existing_type=sa.String(255), nullable=True)

    # Create unique indexes for new OAuth IDs
    op.create_index('ix_users_apple_id', 'users', ['apple_id'], unique=True)
    op.create_index('ix_users_line_id', 'users', ['line_id'], unique=True)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_users_line_id', table_name='users')
    op.drop_index('ix_users_apple_id', table_name='users')

    # Remove columns
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'line_id')
    op.drop_column('users', 'apple_id')
    op.drop_column('users', 'password_hash')

    # Revert google_id to NOT NULL (this may fail if there are NULL values)
    op.alter_column('users', 'google_id', existing_type=sa.String(255), nullable=False)
