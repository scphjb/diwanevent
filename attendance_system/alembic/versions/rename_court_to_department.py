"""rename court to department and add role to participants

Revision ID: rename_court_to_department
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # 1. إعادة تسمية عمود court إلى department
    op.alter_column('participants', 'court', new_column_name='department')

def downgrade():
    op.alter_column('participants', 'department', new_column_name='court')
