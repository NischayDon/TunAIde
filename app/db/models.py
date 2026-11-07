import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime, BigInteger, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base

class JobStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    TRANSCRIBING = "TRANSCRIBING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TRASHED = "TRASHED"

class AudioQueueStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    CLAIMED = "CLAIMED"
    REMOVED = "REMOVED"

class ServiceType(str, enum.Enum):
    RECOURS = "Recours"
    OFPRA = "OFPRA"
    REEXAMIN = "Réexamin"
    TRIBUNAL = "Tribunal"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=True) # made nullable as username might be primary login
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Lifetime counters — only increment, never decrement on delete
    total_uploads = Column(Integer, default=0)
    total_completed = Column(Integer, default=0)
    
    jobs = relationship("Job", back_populates="user")
    clients = relationship("Client", back_populates="creator", foreign_keys="Client.created_by_id")
    assigned_clients = relationship("Client", back_populates="assigned_to", foreign_keys="Client.assigned_to_id")

class AudioQueueItem(Base):
    __tablename__ = "audio_queue"
    __table_args__ = (UniqueConstraint('source', 'source_upload_id', name='uq_source_upload_id'),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String, nullable=True)
    source_upload_id = Column(String, nullable=True)
    title = Column(String, nullable=True)
    artist = Column(String, nullable=True)
    note = Column(String, nullable=True)
    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)
    mime_type = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String, default=AudioQueueStatus.AVAILABLE.value, index=True)
    
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    claimed_by_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    claimed_at = Column(DateTime, nullable=True)
    
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    claimed_by = relationship("User", foreign_keys=[claimed_by_id])
    jobs = relationship("Job", back_populates="queue_item")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    status = Column(String, default=JobStatus.UPLOADED.value) # Storing as string for simplicity with SQLite/PG compat
    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False) # S3 Key
    
    duration_seconds = Column(Integer, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # --- Ledger Entry Fields ---
    client_name = Column(String, nullable=True)       # Extracted from 2nd word of transcript
    client_surname = Column(String, nullable=True)     # Extracted from 3rd word of transcript
    service_type = Column(String, nullable=True)       # One of: Recours, OFPRA, Réexamin, Tribunal
    date_of_birth = Column(DateTime, nullable=True)    # Manually entered/edited
    login_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # Auto-set on upload
    phone_number = Column(String, nullable=True)       # Manually entered/edited
    payment = Column(String, nullable=True)            # Free-form payment info
    
    queue_item_id = Column(String, ForeignKey("audio_queue.id"), nullable=True, index=True)
    celery_task_id = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="jobs")
    queue_item = relationship("AudioQueueItem", back_populates="jobs")
    transcript = relationship("Transcript", back_populates="job", uselist=False, cascade="all, delete-orphan")
    supporting_documents = relationship("SupportingDocument", back_populates="job", cascade="all, delete-orphan")

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), unique=True, nullable=False)
    
    text_content = Column(Text, nullable=False)
    json_metadata = Column(JSON, nullable=True) # Timestamps, confidence, etc.
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    job = relationship("Job", back_populates="transcript")

class SupportingDocument(Base):
    __tablename__ = "supporting_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    
    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)
    description = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    job = relationship("Job", back_populates="supporting_documents")


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Header / Workflow fields
    reference_number = Column(String, unique=True, index=True, nullable=True)
    client_date = Column(String, nullable=True)
    service_type = Column(String, nullable=True, index=True)
    priority = Column(String, default="Normal", nullable=True, index=True)
    status = Column(String, default="Inwarded", nullable=True, index=True)
    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)

    # Core primary fields
    first_name = Column(String, nullable=False, index=True)
    surname = Column(String, nullable=False, index=True)
    phone_number = Column(String, nullable=True, index=True)  # Primary Phone
    date_of_birth = Column(String, nullable=True)

    # Section A: Personal Information
    place_of_birth = Column(String, nullable=True)
    birth_place = Column(String, nullable=True)  # Separate field preserved from spreadsheet
    gender = Column(String, nullable=True)
    nationality = Column(String, default="SRI LANKAISE", nullable=True)
    marital_status = Column(String, nullable=True)
    personal_country = Column(String, nullable=True)
    sp = Column(String, nullable=True)  # SP date
    ef = Column(String, nullable=True)  # EF date
    current_country = Column(String, nullable=True)
    preferred_language = Column(String, nullable=True)

    # Section B: Identification / OFPRA Information
    numero_ofpra = Column(String, nullable=True)
    numero_aps = Column(String, nullable=True)
    from_date = Column(String, nullable=True)
    to_date = Column(String, nullable=True)
    delivered_by = Column(String, nullable=True)

    # Section C: Contact Information
    secondary_phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    previous_address = Column(Text, nullable=True)
    ville = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    state_province = Column(String, nullable=True)
    city = Column(String, nullable=True)

    # Section D: Remarks (Rich Text)
    remarks = Column(Text, nullable=True)

    # Sections E-H: Family Information
    parents_details = Column(JSON, default=dict)
    siblings = Column(JSON, default=list)
    epouse = Column(JSON, default=dict)
    kids = Column(JSON, default=list)

    # Legacy structured extensible sections for backwards compatibility
    identification_info = Column(JSON, default=dict)
    case_info = Column(JSON, default=dict)
    background_info = Column(JSON, default=dict)
    additional_info = Column(JSON, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    creator = relationship("User", foreign_keys=[created_by_id], back_populates="clients")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_clients")
    files = relationship("ClientFile", back_populates="client", cascade="all, delete-orphan", order_by="desc(ClientFile.uploaded_at)")

    @property
    def full_name(self) -> str:
        last = (self.surname or "").strip().upper()
        first = (self.first_name or "").strip()
        if last and first:
            return f"{last} {first}"
        return last or first or ""

    @property
    def assigned_to_name(self) -> str | None:
        return self.assigned_to.username if self.assigned_to else None


class ClientFile(Base):
    __tablename__ = "client_files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)

    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)

    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    client = relationship("Client", back_populates="files")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

