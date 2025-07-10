"""add user roles and permissions

Revision ID: add_user_roles
Revises: b63014bff12d
Create Date: 2023-08-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_user_roles'
down_revision: Union[str, None] = 'b63014bff12d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add role and permissions columns to users table
    op.add_column('users', sa.Column('role', sa.String(20), nullable=True, server_default='customer'))
    op.add_column('users', sa.Column('permissions', sa.String(255), nullable=True))
    
    # Set default role to 'user' for existing users
    op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
    
    # Make role column not nullable
    op.alter_column('users', 'role', nullable=False, server_default='user')


def downgrade() -> None:
    # Drop the columns
    op.drop_column('users', 'permissions')
    op.drop_column('users', 'role')
