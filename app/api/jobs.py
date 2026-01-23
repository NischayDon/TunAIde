from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import uuid
from io import BytesIO
from docx import Document
from fastapi.responses import StreamingResponse
import os
from pydantic import EmailStr, BaseModel
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

from app.db.base import get_db
from app.db.models import Job, JobStatus, Transcript, User
from app.schemas import JobCreate, JobResponse, UploadResponse, TranscriptResponse
from app.services.storage import storage_service
from app.workers.tasks import process_audio, process_audio_file
from app.api.auth import get_current_user


# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@example.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL", "False").lower() == "true",
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
        # Save file to local storage
        saved_filename = storage_service.save_file(file.file, file.filename)
        
        # Create Job Record
        new_job = Job(
            user_id=user.id,
            original_filename=file.filename,
            storage_path=saved_filename,
            status=JobStatus.UPLOADED.value
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        return UploadResponse(
            upload_url="",
            job_id=new_job.id,
            storage_path=new_job.storage_path
        )
    except Exception as e:
        print(f"Upload failed: {e}")
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
    status: Optional[str] = Query(None, description="Filter by status")
):
    query = db.query(Job).filter(Job.user_id == user.id)
    
    if status == "TRASHED":
        query = query.filter(Job.status == JobStatus.TRASHED.value)
    elif status:
        query = query.filter(Job.status == status)
    else:
        # Default: everything NOT trashed
        query = query.filter(Job.status != JobStatus.TRASHED.value)

    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    return jobs

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
    
    # Delete file from disk
    storage_service.delete_file(job.storage_path)
    
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
