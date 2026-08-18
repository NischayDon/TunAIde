from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.db.base import get_db
from app.db.models import AudioQueueItem, AudioQueueStatus, Job, JobStatus, User
from app.schemas import AudioQueueItemResponse, JobResponse, AudioQueueListResponse
from app.api.auth import get_current_user
from app.services.storage import storage_service
from app.workers.tasks import process_audio

router = APIRouter()

@router.get("/", response_model=AudioQueueListResponse)
def list_queue_items(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    query = db.query(AudioQueueItem).filter(AudioQueueItem.status == AudioQueueStatus.AVAILABLE.value)
    
    total = query.count()
    items = query.order_by(AudioQueueItem.uploaded_at.desc()).offset(skip).limit(limit).all()
    
    validated_items = [AudioQueueItemResponse.model_validate(item) for item in items]
    
    return AudioQueueListResponse(
        items=validated_items,
        total=total
    )

@router.get("/{queue_item_id}", response_model=AudioQueueItemResponse)
def get_queue_item(
    queue_item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    item = db.query(AudioQueueItem).filter(
        AudioQueueItem.id == queue_item_id,
        AudioQueueItem.status == AudioQueueStatus.AVAILABLE.value
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found or unavailable")
    return item

@router.post("/upload", response_model=AudioQueueItemResponse)
def upload_to_queue(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    try:
        saved_filename = storage_service.save_file(file.file, file.filename)
        
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        # In a more advanced implementation, we could probe the file here using FFmpeg
        # to extract duration and exact mime type before saving to DB.
        
        new_item = AudioQueueItem(
            original_filename=file.filename,
            storage_path=saved_filename,
            file_size_bytes=file_size,
            mime_type=file.content_type,
            status=AudioQueueStatus.AVAILABLE.value,
            uploaded_by_id=user.id,
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        return new_item
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/{queue_item_id}/claim", response_model=dict)
def claim_queue_item(
    queue_item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # ATOMIC CLAIM LOGIC
    # Begin a transaction explicitly (though dependency does it, we are safe)
    try:
        # Use with_for_update() to lock the row
        item = db.query(AudioQueueItem).with_for_update().filter(
            AudioQueueItem.id == queue_item_id
        ).first()

        if not item:
            raise HTTPException(status_code=404, detail="Queue item not found")

        if item.status != AudioQueueStatus.AVAILABLE.value:
            raise HTTPException(status_code=409, detail="This audio has already been claimed.")

        # It is available, claim it
        item.status = AudioQueueStatus.CLAIMED.value
        item.claimed_by_id = user.id
        item.claimed_at = datetime.now(timezone.utc)

        # Create Personal Transcription Job
        new_job = Job(
            user_id=user.id,
            original_filename=item.original_filename,
            storage_path=item.storage_path, # Copied for convenience
            storage_provider=item.storage_provider,
            queue_item_id=item.id,
            status=JobStatus.QUEUED.value,
            login_date=datetime.now(timezone.utc)
        )
        db.add(new_job)
        
        # Increment lifetime upload counter for the user doing the claiming (as per job creation logic)
        user.total_uploads = (user.total_uploads or 0) + 1
        
        db.commit()
        db.refresh(new_job)
        
        # Dispatch Celery Task
        process_audio.delay(new_job.id)
        
        return {
            "queue_item_id": item.id,
            "job_id": new_job.id,
            "status": new_job.status
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to claim item: {str(e)}")
