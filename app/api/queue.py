from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
import os
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

@router.get("/{queue_item_id}/audio")
def stream_audio(
    queue_item_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Stream the original uploaded audio file for browser playback."""
    item = db.query(AudioQueueItem).filter(
        AudioQueueItem.id == queue_item_id,
        AudioQueueItem.status == AudioQueueStatus.AVAILABLE.value
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    try:
        file_path = storage_service.download_to_temp(item.storage_path)
    except Exception as e:
        print(f"Failed to download audio for streaming: {e}")
        raise HTTPException(status_code=500, detail="Failed to load audio file")
    
    ext = item.original_filename.rsplit(".", 1)[-1].lower() if "." in item.original_filename else "bin"
    audio_mime_map = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "flac": "audio/flac",
        "aac": "audio/aac",
        "m4a": "audio/mp4",
        "wma": "audio/x-ms-wma",
        "webm": "audio/webm",
        "mp4": "video/mp4",
        "mkv": "video/x-matroska",
        "avi": "video/x-msvideo",
        "mov": "video/quicktime",
    }
    media_type = audio_mime_map.get(ext, item.mime_type or "application/octet-stream")
    
    file_size = os.path.getsize(file_path)
    
    range_header = request.headers.get("range")
    if range_header:
        range_spec = range_header.replace("bytes=", "")
        parts = range_spec.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        
        if start >= file_size:
            raise HTTPException(status_code=416, detail="Range not satisfiable")
        
        end = min(end, file_size - 1)
        content_length = end - start + 1
        
        def iter_range():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        return Response(
            content=b"".join(iter_range()),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            }
        )
    else:
        def iterfile():
            with open(file_path, "rb") as f:
                yield from f
        
        return StreamingResponse(
            iterfile(),
            media_type=media_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            }
        )

@router.get("/{queue_item_id}/download")
def download_queue_item(
    queue_item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    item = db.query(AudioQueueItem).filter(
        AudioQueueItem.id == queue_item_id,
        AudioQueueItem.status == AudioQueueStatus.AVAILABLE.value
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    try:
        file_path = storage_service.download_to_temp(item.storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to load audio file")
        
    ext = item.original_filename.rsplit(".", 1)[-1].lower() if "." in item.original_filename else "bin"
    audio_mime_map = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "flac": "audio/flac",
        "aac": "audio/aac",
        "m4a": "audio/mp4",
        "wma": "audio/x-ms-wma",
        "webm": "audio/webm",
        "mp4": "video/mp4",
        "mkv": "video/x-matroska",
        "avi": "video/x-msvideo",
        "mov": "video/quicktime",
    }
    media_type = audio_mime_map.get(ext, item.mime_type or "application/octet-stream")

    def iterfile():
        with open(file_path, "rb") as f:
            yield from f

    return StreamingResponse(
        iterfile(),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={item.original_filename}"}
    )
