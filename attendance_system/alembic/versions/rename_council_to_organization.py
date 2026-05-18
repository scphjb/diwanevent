"""rename council to organization

Revision ID: rename_council_to_organization
Revises: 56169754ec5c
Create Date: 2026-05-17 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rename_council_to_organization'
down_revision = '56169754ec5c'
branch_labels = None
depends_on = None

def upgrade():
    # 1. إعادة تسمية عمود council إلى organization
    op.alter_column('participants', 'council', new_column_name='organization')

def downgrade():
    op.alter_column('participants', 'organization', new_column_name='council')
