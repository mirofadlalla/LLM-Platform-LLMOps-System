"""add_username_password_name_to_user_apikey

Revision ID: f6c7b7868853
Revises: a4d2ef240277
Create Date: 2026-09-30 14:04:26.841747

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6c7b7868853'
down_revision: Union[str, None] = 'a4d2ef240277'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # api_keys.name — nullable, safe to add directly
    op.add_column('api_keys', sa.Column('name', sa.String(), nullable=True))

    # users.username — add as nullable, fill existing rows with id as placeholder,
    # then enforce NOT NULL + unique index
    op.add_column('users', sa.Column('username', sa.String(), nullable=True))
    op.execute("UPDATE users SET username = id WHERE username IS NULL")
    op.alter_column('users', 'username', nullable=False)

    # users.password_hash — same approach (empty string for legacy rows;
    # those rows will never be able to log in, which is the correct behaviour)
    op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True))
    op.execute("UPDATE users SET password_hash = '' WHERE password_hash IS NULL")
    op.alter_column('users', 'password_hash', nullable=False)

    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'username')
    op.drop_column('api_keys', 'name')
