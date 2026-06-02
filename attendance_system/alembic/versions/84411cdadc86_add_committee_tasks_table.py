"""add_committee_tasks_table

Revision ID: 84411cdadc86
Revises: a2cb4ffc17d5
Create Date: 2026-06-02 18:55:50.977963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84411cdadc86'
down_revision: Union[str, Sequence[str], None] = 'a2cb4ffc17d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'committee_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('committee', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('participant_id', sa.Integer(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('assigned_to_name', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('due_time', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['event_settings.id'], ),
        sa.ForeignKeyConstraint(['participant_id'], ['participants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['participants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_committee_tasks_id'), 'committee_tasks', ['id'], unique=False)
    op.create_index(op.f('ix_committee_tasks_event_id'), 'committee_tasks', ['event_id'], unique=False)
    op.create_index(op.f('ix_committee_tasks_participant_id'), 'committee_tasks', ['participant_id'], unique=False)
    op.create_index(op.f('ix_committee_tasks_assigned_to_id'), 'committee_tasks', ['assigned_to_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_committee_tasks_assigned_to_id'), table_name='committee_tasks')
    op.drop_index(op.f('ix_committee_tasks_participant_id'), table_name='committee_tasks')
    op.drop_index(op.f('ix_committee_tasks_event_id'), table_name='committee_tasks')
    op.drop_index(op.f('ix_committee_tasks_id'), table_name='committee_tasks')
    op.drop_table('committee_tasks')
