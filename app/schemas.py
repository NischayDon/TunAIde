from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Any, List
from app.db.models import JobStatus, AudioQueueStatus

# --- Job Schemas ---

class JobBase(BaseModel):
    original_filename: str

class JobCreate(JobBase):
    pass

class SupportingDocumentResponse(BaseModel):
    id: str
    original_filename: str
    file_size_bytes: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class JobResponse(JobBase):
    id: str
    status: JobStatus
    storage_path: Optional[str] = None
    duration_seconds: Optional[int] = None
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

# --- Audio Queue Schemas ---

class AudioQueueItemBase(BaseModel):
    original_filename: str

class AudioQueueItemCreate(AudioQueueItemBase):
    pass

class AudioQueueItemResponse(AudioQueueItemBase):
    id: str
    source: Optional[str] = None
    source_upload_id: Optional[str] = None
    title: Optional[str] = None
    artist: Optional[str] = None
    note: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    duration_seconds: Optional[int] = None
    status: AudioQueueStatus
    uploaded_at: datetime
    
    # We do not expose uploaded_by or storage_path to the public queue response
    
    model_config = ConfigDict(from_attributes=True)

class AudioQueueListResponse(BaseModel):
    items: List[AudioQueueItemResponse]
    total: int

# --- Client / Ledger Schemas ---

class ClientFileResponse(BaseModel):
    id: str
    client_id: str
    original_filename: str
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    uploaded_at: Optional[datetime] = None
    uploaded_by_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ClientCreate(BaseModel):
    first_name: str
    surname: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    # Section A
    gender: Optional[str] = None
    nationality: Optional[str] = None
    place_of_birth: Optional[str] = None
    current_country: Optional[str] = None
    marital_status: Optional[str] = None
    preferred_language: Optional[str] = None
    # Section B
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    previous_address: Optional[str] = None
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    # Sections C-F
    identification_info: Optional[dict] = None
    case_info: Optional[dict] = None
    background_info: Optional[dict] = None
    additional_info: Optional[dict] = None

class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    surname: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    # Section A
    gender: Optional[str] = None
    nationality: Optional[str] = None
    place_of_birth: Optional[str] = None
    current_country: Optional[str] = None
    marital_status: Optional[str] = None
    preferred_language: Optional[str] = None
    # Section B
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    previous_address: Optional[str] = None
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    # Sections C-F
    identification_info: Optional[dict] = None
    case_info: Optional[dict] = None
    background_info: Optional[dict] = None
    additional_info: Optional[dict] = None

class ClientResponse(BaseModel):
    id: str
    created_by_id: str
    first_name: str
    surname: str
    full_name: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    place_of_birth: Optional[str] = None
    current_country: Optional[str] = None
    marital_status: Optional[str] = None
    preferred_language: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    previous_address: Optional[str] = None
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    identification_info: Optional[dict] = None
    case_info: Optional[dict] = None
    background_info: Optional[dict] = None
    additional_info: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    files: List[ClientFileResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ClientListResponse(BaseModel):
    items: List[ClientResponse]
    total: int

