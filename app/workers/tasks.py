import os
import subprocess

from app.workers.celery_app import celery_app
from app.db.base import SessionLocal
from app.db.models import Job, JobStatus, Transcript
from app.core.config import settings
from app.services.transcription import transcription_service
from app.services.storage import storage_service

import wave
import contextlib

@celery_app.task(name="app.workers.tasks.process_audio", bind=True)
def process_audio(self, job_id: str):
    process_audio_file(job_id)

def process_audio_file(job_id: str):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        print(f"Job {job_id} not found.")
        return

    input_path = None
    try:
        # 1. Update Status -> PROCESSING
        print(f"Starting Job {job_id}")
        job.status = JobStatus.PROCESSING.value
        db.commit()

        # 2. Get Local Path (Download if GCS, Get Path if Local)
        try:
            input_path = storage_service.download_to_temp(job.storage_path)
        except Exception as e:
            raise FileNotFoundError(f"Failed to retrieve file: {e}")

        print(f"Processing file: {input_path}")
        
        # 3. Skip Normalization (FFmpeg missing) - Send original file to Gemini
        print("Skipping normalization (ffmpeg not found/required). Using original file.")
        
        # Duration: Skip local calculation for non-wav files (or better, rely on metadata if possible later)
        duration_sec = 0

        # 4. Transcribe
        print("Transcribing...")
        job.status = JobStatus.TRANSCRIBING.value
        db.commit()

        # Pass input_path directly
        transcription_result = transcription_service.transcribe_audio(input_path)
        
        # 5. Save Transcript
        new_transcript = Transcript(
            job_id=job_id,
            text_content=transcription_result["text"],
            json_metadata=transcription_result["metadata"]
        )
        db.add(new_transcript)
        
        # 6. Complete Job
        job.status = JobStatus.COMPLETED.value
        job.duration_seconds = duration_sec
        # Update file size too if useful? 
        # job.file_size_bytes = os.path.getsize(input_path) 
            
        db.commit()
        print(f"Job {job_id} Completed Successfully.")

    except Exception as e:
        print(f"Job {job_id} Failed: {e}")
        db.rollback()
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)
        db.commit()
        
    finally:
        # Cleanup temp file if we are in GCS mode AND input_path exists
        if storage_service.mode == "GCS" and input_path and os.path.exists(input_path):
             try:
                 os.remove(input_path)
                 print(f"Cleaned up temp file: {input_path}")
             except Exception as cleanup_err:
                 print(f"Warning: Failed to cleanup temp file {input_path}: {cleanup_err}")
        db.close()