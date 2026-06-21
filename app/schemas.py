from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Any, List
from app.db.models import JobStatus

# --- Job Schemas ---

class JobBase(BaseModel):
    original_filename: str

class JobCreate(JobBase):
    pass

class SupportingDocumentResponse(BaseModel):
    id: str
    original_filename: str
    file_size_bytes: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class JobResponse(JobBase):
    id: str
    status: JobStatus
    created_at: datetime
    error_message: Optional[str] = None
    
    # Ledger Entry Fields
    client_name: Optional[str] = None
    client_surname: Optional[str] = None
    service_type: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    login_date: Optional[datetime] = None
    phone_number: Optional[str] = None
    payment: Optional[str] = None
    
    # Supporting Documents
    supporting_documents: List[SupportingDocumentResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class LedgerEntryUpdate(BaseModel):
    """Schema for PATCH /jobs/{job_id} — all fields optional."""
    client_name: Optional[str] = None
    client_surname: Optional[str] = None
    service_type: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    phone_number: Optional[str] = None
    payment: Optional[str] = None

class UploadResponse(BaseModel):
    upload_url: str
    job_id: str
    storage_path: str

# --- Transcript Schemas ---

class TranscriptResponse(BaseModel):
    id: str
    text_content: str
    json_metadata: Optional[Any] = None
    
    model_config = ConfigDict(from_attributes=True)

