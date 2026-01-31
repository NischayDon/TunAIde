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
        
        # 3. Normalization (Ensure standard MP3 for Gemini)
        print("Normalizing audio with ffmpeg...")
        output_path = f"{input_path}.mp3"
        try:
            # -y: overwrite, -vn: no video, -acodec libmp3lame: mp3 codec, -q:a 4: decent quality
            subprocess.run(
                ["ffmpeg", "-y", "-i", input_path, "-vn", "-acodec", "libmp3lame", "-q:a", "4", output_path],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            print(f"Normalization successful: {output_path}")
            # Update input_path to the normalized file
            # Original input_path will be cleaned up in finally block if GCS (or we should clean it here)
            input_path = output_path
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg normalization failed: {e.stderr.decode()}")
            print("Falling back to original file.")
        except FileNotFoundError:
             print("FFmpeg not found in path. Using original file.")
        
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
        # Use duration from metadata (calculated in service)
        job.duration_seconds = transcription_result["metadata"].get("duration", 0) 
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