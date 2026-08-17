"""Add Shared Audio Queue

Revision ID: 0001
Revises: 
Create Date: 2026-08-17 21:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create audio_queue table
    op.create_table(
        'audio_queue',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('storage_path', sa.String(), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=True, server_default='AVAILABLE'),
        sa.Column('uploaded_by_id', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
        sa.Column('claimed_by_id', sa.String(), nullable=True),
        sa.Column('claimed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['claimed_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audio_queue_claimed_by_id'), 'audio_queue', ['claimed_by_id'], unique=False)
    op.create_index(op.f('ix_audio_queue_status'), 'audio_queue', ['status'], unique=False)
    op.create_index(op.f('ix_audio_queue_uploaded_at'), 'audio_queue', ['uploaded_at'], unique=False)

    # Add columns to jobs table
    with op.batch_alter_table('jobs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('queue_item_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('celery_task_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('started_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('completed_at', sa.DateTime(), nullable=True))
        batch_op.create_foreign_key('fk_jobs_audio_queue_id', 'audio_queue', ['queue_item_id'], ['id'])
        batch_op.create_index(batch_op.f('ix_jobs_queue_item_id'), ['queue_item_id'], unique=False)

def downgrade() -> None:
    # Drop columns from jobs table
    with op.batch_alter_table('jobs', schema=None) as batch_op:
        batch_op.drop_constraint('fk_jobs_audio_queue_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_jobs_queue_item_id'))
        batch_op.drop_column('completed_at')
        batch_op.drop_column('started_at')
        batch_op.drop_column('celery_task_id')
        batch_op.drop_column('queue_item_id')

    # Drop audio_queue table
    op.drop_index(op.f('ix_audio_queue_uploaded_at'), table_name='audio_queue')
    op.drop_index(op.f('ix_audio_queue_status'), table_name='audio_queue')
    op.drop_index(op.f('ix_audio_queue_claimed_by_id'), table_name='audio_queue')
    op.drop_table('audio_queue')
