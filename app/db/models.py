import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime, BigInteger, JSON, Boolean
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
    
    jobs = relationship("Job", back_populates="user")

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
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="jobs")
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
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    job = relationship("Job", back_populates="supporting_documents")
