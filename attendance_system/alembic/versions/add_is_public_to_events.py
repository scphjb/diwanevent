"""add is_public field to event_settings

Revision ID: add_is_public_to_events
Revises: rename_court_to_department
Create Date: 2026-05-20 23:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_is_public_to_events'
down_revision = 'rename_court_to_department'
branch_labels = None
depends_on = None


def upgrade():
    # 1. إضافة العمود is_public مع قيمة افتراضية TRUE
    op.add_column(
        'event_settings',
        sa.Column('is_public', sa.Boolean(), nullable=True, server_default=sa.true())
    )

    # 2. تحديث جميع السجلات القديمة (NULL) لتصبح TRUE (فعالية عامة)
    op.execute(
        "UPDATE event_settings SET is_public = TRUE WHERE is_public IS NULL"
    )

    # 3. جعل العمود NOT NULL بعد تحديث البيانات
    op.alter_column('event_settings', 'is_public', nullable=False)


def downgrade():
    op.drop_column('event_settings', 'is_public')
