"""add push_subscriptions table

Revision ID: add_push_subscriptions
Revises: 
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_push_subscriptions'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False, unique=True),
        sa.Column('subscription_data', sa.Text(), nullable=False),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_push_subscriptions_user_id', 'push_subscriptions', ['user_id'])
    op.create_index('ix_push_subscriptions_endpoint', 'push_subscriptions', ['endpoint'], unique=True)


def downgrade():
    op.drop_index('ix_push_subscriptions_endpoint', 'push_subscriptions')
    op.drop_index('ix_push_subscriptions_user_id', 'push_subscriptions')
    op.drop_table('push_subscriptions')
