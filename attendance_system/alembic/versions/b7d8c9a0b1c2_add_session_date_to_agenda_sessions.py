"""add session_date to agenda_sessions

Revision ID: b7d8c9a0b1c2
Revises: a6c683c69b92
Create Date: 2026-07-04 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d8c9a0b1c2'
down_revision: Union[str, Sequence[str], None] = 'a6c683c69b92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agenda_sessions', sa.Column('session_date', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('agenda_sessions', 'session_date')
