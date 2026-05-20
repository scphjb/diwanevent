"""merge performance indexes and is_public branches

Revision ID: merge_heads_2026_05
Revises: add_performance_indexes, add_is_public_to_events
Create Date: 2026-05-20 23:45:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_heads_2026_05'
down_revision = ('add_performance_indexes', 'add_is_public_to_events')
branch_labels = None
depends_on = None


def upgrade():
    # migration دمج فقط — لا تغييرات على الـ schema
    pass


def downgrade():
    pass
