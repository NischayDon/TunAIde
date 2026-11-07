"""enhance_ledger_workflow

Revision ID: b2c3d4e5f6a7
Revises: 9f1a2b3c4d5e
Create Date: 2026-11-07 19:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = '9f1a2b3c4d5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('clients') as batch_op:
        # Header / Workflow fields
        batch_op.add_column(sa.Column('reference_number', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('client_date', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('service_type', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('priority', sa.String(), server_default='Normal', nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(), server_default='Inwarded', nullable=True))
        batch_op.add_column(sa.Column('assigned_to_id', sa.String(), sa.ForeignKey('users.id', name='fk_clients_assigned_to_id'), nullable=True))

        # Section A: Personal Information additions
        batch_op.add_column(sa.Column('birth_place', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('personal_country', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('sp', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('ef', sa.String(), nullable=True))

        # Section B: Identification / OFPRA Information
        batch_op.add_column(sa.Column('numero_ofpra', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('numero_aps', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('from_date', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('to_date', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('delivered_by', sa.String(), nullable=True))

        # Section C: Contact Information additions
        batch_op.add_column(sa.Column('ville', sa.String(), nullable=True))

        # Section D: Remarks
        batch_op.add_column(sa.Column('remarks', sa.Text(), nullable=True))

        # Sections E-H: Family Information
        batch_op.add_column(sa.Column('parents_details', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('siblings', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('epouse', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('kids', sa.JSON(), nullable=True))

        # Indices
        batch_op.create_index('ix_clients_reference_number', ['reference_number'], unique=True)
        batch_op.create_index('ix_clients_assigned_to_id', ['assigned_to_id'])
        batch_op.create_index('ix_clients_service_type', ['service_type'])
        batch_op.create_index('ix_clients_priority', ['priority'])
        batch_op.create_index('ix_clients_status', ['status'])


def downgrade() -> None:
    with op.batch_alter_table('clients') as batch_op:
        batch_op.drop_index('ix_clients_status')
        batch_op.drop_index('ix_clients_priority')
        batch_op.drop_index('ix_clients_service_type')
        batch_op.drop_index('ix_clients_assigned_to_id')
        batch_op.drop_index('ix_clients_reference_number')

        batch_op.drop_column('kids')
        batch_op.drop_column('epouse')
        batch_op.drop_column('siblings')
        batch_op.drop_column('parents_details')
        batch_op.drop_column('remarks')
        batch_op.drop_column('ville')
        batch_op.drop_column('delivered_by')
        batch_op.drop_column('to_date')
        batch_op.drop_column('from_date')
        batch_op.drop_column('numero_aps')
        batch_op.drop_column('numero_ofpra')
        batch_op.drop_column('ef')
        batch_op.drop_column('sp')
        batch_op.drop_column('personal_country')
        batch_op.drop_column('birth_place')
        batch_op.drop_column('assigned_to_id')
        batch_op.drop_column('status')
        batch_op.drop_column('priority')
        batch_op.drop_column('service_type')
        batch_op.drop_column('client_date')
        batch_op.drop_column('reference_number')
