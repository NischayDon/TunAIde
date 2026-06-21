from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import uuid
import os
from io import BytesIO
from docx import Document
from fastapi.responses import StreamingResponse
from pydantic import EmailStr, BaseModel
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from datetime import datetime, timezone

from app.db.base import get_db
from app.db.models import Job, JobStatus, Transcript, User, SupportingDocument
from app.schemas import (
    JobCreate, JobResponse, UploadResponse, TranscriptResponse,
    LedgerEntryUpdate, SupportingDocumentResponse
)
from app.services.storage import storage_service
from app.workers.tasks import process_audio, process_audio_file
from app.api.auth import get_current_user
from app.core.config import settings


# Email Configuration — reads from centralized settings (which loads from .env)
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

class EmailRequest(BaseModel):
    email: EmailStr
    include_timestamps: bool = False

def generate_docx(job: Job, include_timestamps: bool) -> BytesIO:
    document = Document()
    document.add_heading(job.original_filename, 0)
    
    # Logic to populate document
    # Safely access json_metadata, defaulting to empty dict if None
    json_metadata = job.transcript.json_metadata or {}
    segments = json_metadata.get("segments", [])
    
    if segments:
        for seg in segments:
            text = seg.get("text", "")
            if include_timestamps:
                start = seg.get("start")
                end = seg.get("end")
                p = document.add_paragraph()
                # Bold timestamp
                timestamp_run = p.add_run(f"[{start} - {end}] ")
                timestamp_run.bold = True
                p.add_run(text)
            else:
                document.add_paragraph(text)
    else:
        # Fallback to plain text if no segments available
        text_content = job.transcript.text_content or ""
        for line in text_content.split('\n'):
            if line.strip():
                document.add_paragraph(line)
                
    buffer = BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
def initiate_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    try:
        print(f"Starting upload for file: {file.filename}")
        # Save file to local storage
        saved_filename = storage_service.save_file(file.file, file.filename)
        print(f"File saved successfully at: {saved_filename}")
        
        # Create Job Record with login_date auto-set
        new_job = Job(
            user_id=user.id,
            original_filename=file.filename,
            storage_path=saved_filename,
            status=JobStatus.UPLOADED.value,
            login_date=datetime.now(timezone.utc)
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        print(f"Job created successfully: {new_job.id}")

        return UploadResponse(
            upload_url="",
            job_id=new_job.id,
            storage_path=new_job.storage_path
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL UPLOAD FAILURE: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/{job_id}/process", response_model=JobResponse)
def start_processing(
    job_id: str, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.UPLOADED.value and job.status != JobStatus.FAILED.value:
         if job.status in [JobStatus.QUEUED.value, JobStatus.PROCESSING.value, JobStatus.TRANSCRIBING.value]:
             return job

    # Update Status
    job.status = JobStatus.QUEUED.value
    db.commit()
    db.refresh(job)

    # Trigger Local Task (BackgroundTasks)
    background_tasks.add_task(process_audio_file, job_id)

    return job

@router.get("/", response_model=List[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = 0, 
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status"),
    service_type: Optional[str] = Query(None, description="Filter by service type")
):
    query = db.query(Job).filter(Job.user_id == user.id)
    
    if status == "TRASHED":
        query = query.filter(Job.status == JobStatus.TRASHED.value)
    elif status:
        query = query.filter(Job.status == status)
    else:
        # Default: everything NOT trashed
        query = query.filter(Job.status != JobStatus.TRASHED.value)
    
    if service_type:
        query = query.filter(Job.service_type == service_type)

    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    return jobs

@router.patch("/{job_id}", response_model=JobResponse)
def update_ledger_entry(
    job_id: str,
    update_data: LedgerEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update ledger entry fields for a job."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only update fields that were explicitly set (not None)
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(job, field, value)
    
    db.commit()
    db.refresh(job)
    return job

@router.delete("/trash/all", status_code=204)
def empty_trash(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Permanently delete all jobs in TRASHED status.
    """
    jobs_to_delete = db.query(Job).filter(
        Job.user_id == user.id, 
        Job.status == JobStatus.TRASHED.value
    ).all()
    
    for job in jobs_to_delete:
        # Delete file from disk
        storage_service.delete_file(job.storage_path)
        # Delete supporting documents from disk
        for doc in job.supporting_documents:
            storage_service.delete_file(doc.storage_path)
        # Delete from DB
        db.delete(job)
        
    db.commit()
    return

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/{job_id}/transcript", response_model=TranscriptResponse)
def get_transcript(
    job_id: str, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.transcript:
        raise HTTPException(status_code=404, detail="Transcript not ready")
        
    return job.transcript

@router.delete("/{job_id}", response_model=JobResponse)
def delete_job(
    job_id: str, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Soft delete
    job.status = JobStatus.TRASHED.value
    db.commit()
    db.refresh(job)
    return job

@router.delete("/{job_id}/permanent", status_code=204)
def delete_job_permanent(
    job_id: str, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete audio file from disk
    storage_service.delete_file(job.storage_path)
    # Delete supporting documents from disk
    for doc in job.supporting_documents:
        storage_service.delete_file(doc.storage_path)
    
    # Delete from DB
    db.delete(job)
    db.commit()
    return

@router.post("/{job_id}/restore", response_model=JobResponse)
def restore_job(
    job_id: str, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.transcript:
        job.status = JobStatus.COMPLETED.value
    else:
        job.status = JobStatus.FAILED.value
        
    db.commit()
    db.refresh(job)
    return job

@router.post("/{job_id}/email")
async def email_job(
    job_id: str,
    email_req: EmailRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.transcript:
        raise HTTPException(status_code=400, detail="Transcript not ready")
        
    try:
        # Generate plain text body
        if job.transcript.json_metadata and "segments" in job.transcript.json_metadata:
            segments = job.transcript.json_metadata["segments"]
            if email_req.include_timestamps:
                body_text = "\n".join([f"[{s['start']} - {s['end']}] {s['text']}" for s in segments])
            else:
                body_text = "\n".join([s['text'] for s in segments])
        else:
            # Fallback
            body_text = job.transcript.text_content or "No transcript available."
            
        message = MessageSchema(
            subject=f"Transcript: {job.original_filename}",
            recipients=[email_req.email],
            body=body_text,
            subtype=MessageType.plain
        )
        
        fm = FastMail(conf)
        await fm.send_message(message)
        
        return {"message": "Email sent successfully"}
    except Exception as e:
        print(f"Email failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.get("/{job_id}/download")
def download_job(
    job_id: str,
    include_timestamps: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.transcript:
        raise HTTPException(status_code=400, detail="Transcript not ready")
        
    buffer = generate_docx(job, include_timestamps)
    filename = f"{job.original_filename}.docx"
    
    return StreamingResponse(
        buffer, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =====================================================
# Supporting Documents Endpoints
# =====================================================

@router.post("/{job_id}/documents", response_model=List[SupportingDocumentResponse])
def upload_supporting_documents(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Upload one or more supporting documents for a ledger entry."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    uploaded_docs = []
    for file in files:
        try:
            # Save to storage
            saved_filename = storage_service.save_file(file.file, file.filename)
            
            # Get file size
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)
            
            doc = SupportingDocument(
                job_id=job_id,
                original_filename=file.filename,
                storage_path=saved_filename,
                file_size_bytes=file_size
            )
            db.add(doc)
            uploaded_docs.append(doc)
        except Exception as e:
            print(f"Failed to upload supporting document {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}: {str(e)}")
    
    db.commit()
    for doc in uploaded_docs:
        db.refresh(doc)
    
    return uploaded_docs

@router.get("/{job_id}/documents", response_model=List[SupportingDocumentResponse])
def list_supporting_documents(
    job_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all supporting documents for a ledger entry."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job.supporting_documents

@router.get("/{job_id}/documents/{doc_id}/download")
def download_supporting_document(
    job_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Download a specific supporting document."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    doc = db.query(SupportingDocument).filter(
        SupportingDocument.id == doc_id,
        SupportingDocument.job_id == job_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = storage_service.download_to_temp(doc.storage_path)
    
    # Determine MIME type from extension
    ext = doc.original_filename.rsplit(".", 1)[-1].lower() if "." in doc.original_filename else "bin"
    mime_map = {
        "pdf": "application/pdf",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png",
        "txt": "text/plain",
    }
    media_type = mime_map.get(ext, "application/octet-stream")
    
    def iterfile():
        with open(file_path, "rb") as f:
            yield from f
    
    return StreamingResponse(
        iterfile(),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={doc.original_filename}"}
    )

@router.delete("/{job_id}/documents/{doc_id}", status_code=204)
def delete_supporting_document(
    job_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a specific supporting document."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    doc = db.query(SupportingDocument).filter(
        SupportingDocument.id == doc_id,
        SupportingDocument.job_id == job_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from storage
    storage_service.delete_file(doc.storage_path)
    
    # Delete from DB
    db.delete(doc)
    db.commit()
    return

