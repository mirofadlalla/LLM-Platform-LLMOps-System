"""add status column to runs

Revision ID: add_status_to_runs
Revises: c6633d3a19a7
Create Date: 2026-02-04 14:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_status_to_runs'
down_revision: Union[str, None] = 'c6633d3a19a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add status column to runs table."""
    op.add_column('runs', sa.Column('status', sa.String(), nullable=True, server_default='pending'))


def downgrade() -> None:
    """Downgrade schema - remove status column from runs table."""
    op.drop_column('runs', 'status')
