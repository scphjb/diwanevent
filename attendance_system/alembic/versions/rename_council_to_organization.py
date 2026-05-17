"""rename council to organization

Revision ID: rename_council_to_organization
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # 1. إعادة تسمية عمود council إلى organization
    op.alter_column('participants', 'council', new_column_name='organization')

def downgrade():
    op.alter_column('participants', 'organization', new_column_name='council')
