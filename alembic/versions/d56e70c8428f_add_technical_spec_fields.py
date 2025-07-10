"""add technical spec fields

Revision ID: d56e70c8428f
Revises: e3875a431dee
Create Date: 2025-04-01 07:05:27.441706

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd56e70c8428f'
down_revision: Union[str, None] = 'e3875a431dee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
