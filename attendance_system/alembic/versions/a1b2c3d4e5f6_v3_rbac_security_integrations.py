"""v3.0 — إضافة جداول RBAC والأمان والتكاملات والشهادات

Revision ID: a1b2c3d4e5f6
Revises: ed9c6a342fdd
Create Date: 2026-05-06 16:25:00.000000

الجداول الجديدة في هذا الترحيل:
- permissions: صلاحيات النظام (RBAC)
- roles: أدوار النظام (RBAC)
- role_permissions: جدول وسيط أدوار ← صلاحيات
- user_event_roles: ربط المستخدم بدور داخل فعالية
- custom_field_definitions: حقول ديناميكية لكل فعالية
- communication_logs: سجل المراسلات
- webhook_subscriptions: اشتراكات Webhooks
- outbox_events: Transactional Outbox
- index_usage_stats: تتبع استخدام الفهارس
- badge_templates: قوالب الشارات
- audit_trail: سجل رقابة مشفّر (Micro-Blockchain)
- api_keys: مفاتيح API للشركاء
- audit_logs: سجل الرقابة الإدارية
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'ed9c6a342fdd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """إنشاء جميع الجداول الجديدة لنظام v3.0."""

    # ═══ [1] نظام الصلاحيات (RBAC) ═══

    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)
    op.create_index(op.f('ix_permissions_code'), 'permissions', ['code'], unique=True)

    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('is_system_role', sa.Boolean(), default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)

    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id'), primary_key=True),
        sa.Column('permission_id', sa.Integer(), sa.ForeignKey('permissions.id'), primary_key=True),
    )

    op.create_table(
        'user_event_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id']),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_event_roles_id'), 'user_event_roles', ['id'], unique=False)

    # ═══ [2] الحقول المخصصة ═══

    op.create_table(
        'custom_field_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('display_label', sa.String(255), nullable=False),
        sa.Column('field_type', sa.String(20), nullable=False),
        sa.Column('is_required', sa.Boolean(), default=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('validation_regex', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_custom_field_definitions_id'), 'custom_field_definitions', ['id'], unique=False)

    # ═══ [3] سجل المراسلات ═══

    op.create_table(
        'communication_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('participant_id', sa.Integer(), nullable=True),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(20), nullable=True),
        sa.Column('recipient', sa.String(255), nullable=True),
        sa.Column('subject', sa.String(255), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('provider_response', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['participant_id'], ['participants.id']),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ═══ [4] اشتراكات Webhooks ═══

    op.create_table(
        'webhook_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('target_url', sa.String(512), nullable=False),
        sa.Column('secret_key', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ═══ [5] Transactional Outbox ═══

    op.create_table(
        'outbox_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_uuid', sa.String(36), nullable=True),
        sa.Column('task_type', sa.String(50), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(20), default='PENDING'),
        sa.Column('is_processed', sa.Boolean(), default=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('error_log', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_uuid'),
    )
    op.create_index(op.f('ix_outbox_events_id'), 'outbox_events', ['id'], unique=False)
    op.create_index(op.f('ix_outbox_events_task_type'), 'outbox_events', ['task_type'], unique=False)
    op.create_index(op.f('ix_outbox_events_status'), 'outbox_events', ['status'], unique=False)
    op.create_index(op.f('ix_outbox_events_is_processed'), 'outbox_events', ['is_processed'], unique=False)

    # ═══ [6] إحصائيات استخدام الفهارس ═══

    op.create_table(
        'index_usage_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('field_key', sa.String(100), nullable=False),
        sa.Column('query_count', sa.Integer(), default=0),
        sa.Column('is_indexed', sa.Boolean(), default=False),
        sa.Column('last_queried', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('field_key'),
    )

    # ═══ [7] قوالب الشارات ═══

    op.create_table(
        'badge_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('background_image', sa.String(), nullable=True),
        sa.Column('elements_config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_badge_templates_id'), 'badge_templates', ['id'], unique=False)

    # ═══ [8] سجل الرقابة المشفّر (Audit Trail — Micro-Blockchain) ═══

    op.create_table(
        'audit_trail',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('previous_hash', sa.String(64), nullable=False),
        sa.Column('current_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('current_hash'),
    )

    # ═══ [9] مفاتيح API ═══

    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(64), nullable=False),
        sa.Column('client_name', sa.String(100), nullable=True),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('scopes', sa.JSON(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_api_keys_id'), 'api_keys', ['id'], unique=False)
    op.create_index(op.f('ix_api_keys_key'), 'api_keys', ['key'], unique=True)

    # ═══ [10] سجل الرقابة الإدارية ═══

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=True),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)


def downgrade() -> None:
    """حذف جميع الجداول الجديدة (بترتيب عكسي يراعي الـ FK)."""

    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_table('audit_logs')

    op.drop_index(op.f('ix_api_keys_key'), table_name='api_keys')
    op.drop_index(op.f('ix_api_keys_id'), table_name='api_keys')
    op.drop_table('api_keys')

    op.drop_table('audit_trail')

    op.drop_index(op.f('ix_badge_templates_id'), table_name='badge_templates')
    op.drop_table('badge_templates')

    op.drop_table('index_usage_stats')

    op.drop_index(op.f('ix_outbox_events_is_processed'), table_name='outbox_events')
    op.drop_index(op.f('ix_outbox_events_status'), table_name='outbox_events')
    op.drop_index(op.f('ix_outbox_events_task_type'), table_name='outbox_events')
    op.drop_index(op.f('ix_outbox_events_id'), table_name='outbox_events')
    op.drop_table('outbox_events')

    op.drop_table('webhook_subscriptions')
    op.drop_table('communication_logs')

    op.drop_index(op.f('ix_custom_field_definitions_id'), table_name='custom_field_definitions')
    op.drop_table('custom_field_definitions')

    op.drop_index(op.f('ix_user_event_roles_id'), table_name='user_event_roles')
    op.drop_table('user_event_roles')

    op.drop_table('role_permissions')

    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')

    op.drop_index(op.f('ix_permissions_code'), table_name='permissions')
    op.drop_index(op.f('ix_permissions_id'), table_name='permissions')
    op.drop_table('permissions')
