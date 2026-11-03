"""redesign_ledger_clients

Revision ID: 9f1a2b3c4d5e
Revises: 80466bf63a06
Create Date: 2026-11-03 22:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f1a2b3c4d5e'
down_revision: Union[str, Sequence[str], None] = '80466bf63a06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Reset obsolete ledger data in jobs table (preserve jobs, audio, transcripts, users)
    op.execute(
        "UPDATE jobs SET "
        "client_name = NULL, "
        "client_surname = NULL, "
        "service_type = NULL, "
        "date_of_birth = NULL, "
        "phone_number = NULL, "
        "payment = NULL"
    )

    # 2. Create clients table
    op.create_table(
        'clients',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('created_by_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('surname', sa.String(), nullable=False),
        sa.Column('phone_number', sa.String(), nullable=True),
        sa.Column('date_of_birth', sa.String(), nullable=True),
        # Section A: Personal Information
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('nationality', sa.String(), nullable=True),
        sa.Column('place_of_birth', sa.String(), nullable=True),
        sa.Column('current_country', sa.String(), nullable=True),
        sa.Column('marital_status', sa.String(), nullable=True),
        sa.Column('preferred_language', sa.String(), nullable=True),
        # Section B: Contact Information
        sa.Column('secondary_phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('previous_address', sa.Text(), nullable=True),
        sa.Column('country', sa.String(), nullable=True),
        sa.Column('state_province', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('postal_code', sa.String(), nullable=True),
        # Sections C-F: Structured extensible sections
        sa.Column('identification_info', sa.JSON(), nullable=True),
        sa.Column('case_info', sa.JSON(), nullable=True),
        sa.Column('background_info', sa.JSON(), nullable=True),
        sa.Column('additional_info', sa.JSON(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_clients_created_by_id', 'clients', ['created_by_id'])
    op.create_index('ix_clients_first_name', 'clients', ['first_name'])
    op.create_index('ix_clients_surname', 'clients', ['surname'])
    op.create_index('ix_clients_phone_number', 'clients', ['phone_number'])

    # 3. Create client_files table
    op.create_table(
        'client_files',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('client_id', sa.String(), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('storage_path', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('uploaded_by_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_client_files_client_id', 'client_files', ['client_id'])
    op.create_index('ix_client_files_uploaded_by_id', 'client_files', ['uploaded_by_id'])


def downgrade() -> None:
    op.drop_index('ix_client_files_uploaded_by_id', table_name='client_files')
    op.drop_index('ix_client_files_client_id', table_name='client_files')
    op.drop_table('client_files')
    op.drop_index('ix_clients_phone_number', table_name='clients')
    op.drop_index('ix_clients_surname', table_name='clients')
    op.drop_index('ix_clients_first_name', table_name='clients')
    op.drop_index('ix_clients_created_by_id', table_name='clients')
    op.drop_table('clients')

