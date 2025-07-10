"""add user role and permissions

Revision ID: add_user_role_permissions
Revises: b63014bff12d
Create Date: 2023-08-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_user_role_permissions'
down_revision: Union[str, None] = 'b63014bff12d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add role and permissions columns to users table
    op.add_column('users', sa.Column('role', sa.String(20), nullable=True, server_default='user'))
    op.add_column('users', sa.Column('permissions', sa.String(255), nullable=True))


def downgrade() -> None:
    # Drop the columns
    op.drop_column('users', 'permissions')
    op.drop_column('users', 'role')
