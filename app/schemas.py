from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Any
from app.db.models import JobStatus

# --- Job Schemas ---

class JobBase(BaseModel):
    original_filename: str

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: str
    status: JobStatus
    created_at: datetime
    error_message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

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
