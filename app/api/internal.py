from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.core.config import settings
from app.db.base import get_db
from app.db.models import AudioQueueItem, AudioQueueStatus

router = APIRouter()
security = HTTPBearer()

def verify_ingest_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not settings.PHASE_ONE_INGEST_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ingest token is not configured on the server."
        )
    if credentials.credentials != settings.PHASE_ONE_INGEST_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ingest token"
        )
    return credentials.credentials

class APIngestPayload(BaseModel):
    source: str
    source_upload_id: str
    storage_key: str
    filename: str
    file_size: int
    mime_type: str
    duration: Optional[int] = None
    title: Optional[str] = None
    artist: Optional[str] = None
    note: Optional[str] = None

@router.post("/ingest/audio", response_model=dict)
def ingest_audio(
    payload: APIngestPayload,
    db: Session = Depends(get_db),
    token: str = Depends(verify_ingest_token)
):
    try:
        # Check idempotency
        existing_item = db.query(AudioQueueItem).filter(
            AudioQueueItem.source == payload.source,
            AudioQueueItem.source_upload_id == payload.source_upload_id
        ).first()

        if existing_item:
            return {
                "success": True,
                "queue_item_id": existing_item.id,
                "status": existing_item.status,
                "duplicate": True
            }

        # Create new item
        new_item = AudioQueueItem(
            source=payload.source,
            source_upload_id=payload.source_upload_id,
            title=payload.title,
            artist=payload.artist,
            note=payload.note,
            original_filename=payload.filename,
            storage_path=payload.storage_key,
            file_size_bytes=payload.file_size,
            mime_type=payload.mime_type,
            duration_seconds=payload.duration,
            status=AudioQueueStatus.AVAILABLE.value,
            uploaded_at=datetime.now(timezone.utc)
            # uploaded_by_id is null since it's anonymous from AP
        )
        
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        return {
            "success": True,
            "queue_item_id": new_item.id,
            "status": new_item.status,
            "duplicate": False
        }
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
