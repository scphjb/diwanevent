"""add_driver_info_to_activity_registration

Revision ID: 90de14d4073e
Revises: 84411cdadc86
Create Date: 2026-06-04 22:16:26.571870

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '90de14d4073e'
down_revision: Union[str, Sequence[str], None] = '84411cdadc86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('activity_registrations', 'vehicle_details')
    op.drop_column('activity_registrations', 'driver_phone')
    op.drop_column('activity_registrations', 'driver_name')
