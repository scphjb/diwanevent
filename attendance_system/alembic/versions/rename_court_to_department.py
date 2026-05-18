"""rename court to department and add role to participants

Revision ID: rename_court_to_department
Revises: rename_council_to_organization
Create Date: 2026-05-17 13:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rename_court_to_department'
down_revision = 'rename_council_to_organization'
branch_labels = None
depends_on = None

def upgrade():
    # 1. إعادة تسمية عمود court إلى department
    op.alter_column('participants', 'court', new_column_name='department')

def downgrade():
    op.alter_column('participants', 'department', new_column_name='court')
