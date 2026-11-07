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

SERVICE_TYPES = ["CONSEIL", "OFPRA", "RECOURS", "TA", "REEXAIN", "RERECOURS"]
PRIORITIES = ["Normal", "Urgent", "Very Urgent", "Critical", "Rework"]
STATUSES = ["Inwarded", "On Process", "Ready to delivered", "Delivered", "Closed"]

class UserAssigneeResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

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
    # Header / Workflow
    client_date: Optional[str] = None
    service_type: Optional[str] = None
    priority: Optional[str] = "Normal"
    status: Optional[str] = "Inwarded"
    assigned_to_id: Optional[str] = None

    # Section A: Personal Information
    first_name: str
    surname: str
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    birth_place: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = "SRI LANKAISE"
    marital_status: Optional[str] = None
    personal_country: Optional[str] = None
    sp: Optional[str] = None
    ef: Optional[str] = None
    current_country: Optional[str] = None
    preferred_language: Optional[str] = None

    # Section B: Identification / OFPRA Information
    numero_ofpra: Optional[str] = None
    numero_aps: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    delivered_by: Optional[str] = None

    # Section C: Contact Information
    phone_number: Optional[str] = None  # Primary Phone
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    previous_address: Optional[str] = None
    ville: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None

    # Section D: Remarks
    remarks: Optional[str] = None

    # Sections E-H: Family Information
    parents_details: Optional[Any] = None
    siblings: Optional[Any] = None
    epouse: Optional[Any] = None
    kids: Optional[Any] = None

    # Legacy extensible JSON fields
    identification_info: Optional[dict] = None
    case_info: Optional[dict] = None
    background_info: Optional[dict] = None
    additional_info: Optional[dict] = None

class ClientUpdate(BaseModel):
    # Header / Workflow
    client_date: Optional[str] = None
    service_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[str] = None

    # Section A
    first_name: Optional[str] = None
    surname: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    birth_place: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    personal_country: Optional[str] = None
    sp: Optional[str] = None
    ef: Optional[str] = None
    current_country: Optional[str] = None
    preferred_language: Optional[str] = None

    # Section B
    numero_ofpra: Optional[str] = None
    numero_aps: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    delivered_by: Optional[str] = None

    # Section C
    phone_number: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    previous_address: Optional[str] = None
    ville: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None

    # Section D
    remarks: Optional[str] = None

    # Sections E-H
    parents_details: Optional[Any] = None
    siblings: Optional[Any] = None
    epouse: Optional[Any] = None
    kids: Optional[Any] = None

    # Legacy fields
    identification_info: Optional[dict] = None
    case_info: Optional[dict] = None
    background_info: Optional[dict] = None
    additional_info: Optional[dict] = None

class ClientResponse(BaseModel):
    id: str
    created_by_id: str
    reference_number: Optional[str] = None
    client_date: Optional[str] = None
    service_type: Optional[str] = None
    priority: Optional[str] = "Normal"
    status: Optional[str] = "Inwarded"
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None

    first_name: str
    surname: str
    full_name: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    birth_place: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    personal_country: Optional[str] = None
    sp: Optional[str] = None
    ef: Optional[str] = None
    current_country: Optional[str] = None
    preferred_language: Optional[str] = None

    numero_ofpra: Optional[str] = None
    numero_aps: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    delivered_by: Optional[str] = None

    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    previous_address: Optional[str] = None
    ville: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None

    remarks: Optional[str] = None
    parents_details: Optional[Any] = None
    siblings: Optional[Any] = None
    epouse: Optional[Any] = None
    kids: Optional[Any] = None

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

