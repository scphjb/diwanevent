"""add_performance_indexes

Revision ID: add_performance_indexes
Revises: rename_court_to_department
Create Date: 2026-05-18 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = 'rename_court_to_department'
branch_labels = None
depends_on = None

def upgrade():
    # check-in endpoint — الأكثر استخداماً
    op.create_index('idx_attendance_participant_event',
                    'attendance', ['participant_id', 'event_type'],
                    if_not_exists=True)
    
    # list participants
    op.create_index('idx_participants_event_id',
                    'participants', ['event_id'],
                    if_not_exists=True)
    
    # public register dedup check
    op.create_index('idx_participants_event_email',
                    'participants', ['event_id', 'email'],
                    if_not_exists=True)
    
    # auth login
    op.create_index('idx_users_email',
                    'users', ['email'],
                    if_not_exists=True)
    
    # polls results
    op.create_index('idx_poll_votes_poll_id',
                    'poll_votes', ['poll_id'],
                    if_not_exists=True)
    
    # analytics summary
    op.create_index('idx_attendance_event_checkin',
                    'attendance', ['event_type'],
                    postgresql_where="event_type = 'check_in'",
                    if_not_exists=True)

def downgrade():
    op.drop_index('idx_attendance_participant_event', if_exists=True)
    op.drop_index('idx_participants_event_id', if_exists=True)
    op.drop_index('idx_participants_event_email', if_exists=True)
    op.drop_index('idx_users_email', if_exists=True)
    op.drop_index('idx_poll_votes_poll_id', if_exists=True)
    op.drop_index('idx_attendance_event_checkin', if_exists=True)
