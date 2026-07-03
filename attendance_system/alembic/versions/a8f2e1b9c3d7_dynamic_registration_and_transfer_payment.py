"""dynamic_registration_and_transfer_payment

Revision ID: a8f2e1b9c3d7
Revises: 90de14d4073e
Create Date: 2026-07-03 15:00:00.000000

إضافة:
  - حقول الحوالة البنكية لجدول event_settings
  - حقول تتبع الحوالة لجدول participants
  - حقول إدارة حقول التسجيل الديناميكية لـ custom_field_definitions
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8f2e1b9c3d7'
down_revision: Union[str, Sequence[str], None] = ('90de14d4073e', '63f391ef27b5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """إضافة جميع الأعمدة الجديدة بأمان (IF NOT EXISTS)."""

    # ─── 1. جدول event_settings — حقول الحوالة البنكية ───────────────────
    with op.batch_alter_table('event_settings') as batch_op:
        batch_op.add_column(sa.Column('allow_transfer_payment', sa.Boolean(), nullable=True, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('bank_name',              sa.String(), nullable=True))
        batch_op.add_column(sa.Column('bank_account_number',    sa.String(), nullable=True))
        batch_op.add_column(sa.Column('bank_account_name',      sa.String(), nullable=True))
        batch_op.add_column(sa.Column('bank_instructions',      sa.Text(),   nullable=True))

    # ─── 2. جدول participants — حقول تتبع الحوالة ────────────────────────
    with op.batch_alter_table('participants') as batch_op:
        batch_op.add_column(sa.Column('transfer_proof_url',    sa.Text(),     nullable=True))
        batch_op.add_column(sa.Column('transfer_submitted_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('payment_notes',         sa.Text(),     nullable=True))

    # ─── 3. جدول custom_field_definitions — حقول الإدارة الديناميكية ─────
    with op.batch_alter_table('custom_field_definitions') as batch_op:
        batch_op.add_column(sa.Column('sort_order',    sa.Integer(), nullable=True, server_default=sa.text('0')))
        batch_op.add_column(sa.Column('is_visible',    sa.Boolean(), nullable=True, server_default=sa.text('true')))
        batch_op.add_column(sa.Column('default_value', sa.Text(),    nullable=True))
        batch_op.add_column(sa.Column('placeholder',   sa.String(),  nullable=True))


def downgrade() -> None:
    """إزالة الأعمدة المضافة."""

    with op.batch_alter_table('custom_field_definitions') as batch_op:
        batch_op.drop_column('placeholder')
        batch_op.drop_column('default_value')
        batch_op.drop_column('is_visible')
        batch_op.drop_column('sort_order')

    with op.batch_alter_table('participants') as batch_op:
        batch_op.drop_column('payment_notes')
        batch_op.drop_column('transfer_submitted_at')
        batch_op.drop_column('transfer_proof_url')

    with op.batch_alter_table('event_settings') as batch_op:
        batch_op.drop_column('bank_instructions')
        batch_op.drop_column('bank_account_name')
        batch_op.drop_column('bank_account_number')
        batch_op.drop_column('bank_name')
        batch_op.drop_column('allow_transfer_payment')
