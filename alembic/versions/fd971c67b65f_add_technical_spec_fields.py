"""add technical spec fields

Revision ID: fd971c67b65f
Revises: add_user_roles
Create Date: 2025-03-30 14:44:25.866085

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd971c67b65f'
down_revision: Union[str, None] = 'add_user_roles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to technical_specs table
    op.add_column('technical_specs', sa.Column('paint_finish', sa.String(50), nullable=True))
    op.add_column('technical_specs', sa.Column('voc_content', sa.String(50), nullable=True))
    op.add_column('technical_specs', sa.Column('coverage_area', sa.Float(), nullable=True))
    op.add_column('technical_specs', sa.Column('drying_time', sa.Float(), nullable=True))
    op.add_column('technical_specs', sa.Column('pattern_repeat', sa.Float(), nullable=True))
    op.add_column('technical_specs', sa.Column('washable', sa.Boolean(), nullable=True))
    op.add_column('technical_specs', sa.Column('removable', sa.Boolean(), nullable=True))
    op.add_column('technical_specs', sa.Column('wear_layer', sa.Float(), nullable=True))


def downgrade() -> None:
    # Remove columns from technical_specs table
    op.drop_column('technical_specs', 'paint_finish')
    op.drop_column('technical_specs', 'voc_content')
    op.drop_column('technical_specs', 'coverage_area')
    op.drop_column('technical_specs', 'drying_time')
    op.drop_column('technical_specs', 'pattern_repeat')
    op.drop_column('technical_specs', 'washable')
    op.drop_column('technical_specs', 'removable')
    op.drop_column('technical_specs', 'wear_layer')
