"""add technical spec fields

Revision ID: 15da97278665
Revises: 94a59bcb4ea8
Create Date: 2025-04-01 07:14:18.826542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15da97278665'
down_revision: Union[str, None] = '94a59bcb4ea8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
