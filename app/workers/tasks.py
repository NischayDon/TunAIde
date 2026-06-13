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

    original_input_path = None  # Track the original downloaded file
    normalized_path = None       # Track the normalized mp3 file
    input_path = None
    try:
        # 1. Update Status -> PROCESSING
        print(f"Starting Job {job_id}")
        job.status = JobStatus.PROCESSING.value
        db.commit()

        # 2. Get Local Path (Download if GCS/S3, Get Path if Local)
        try:
            input_path = storage_service.download_to_temp(job.storage_path)
            original_input_path = input_path
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
            normalized_path = output_path
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
            
        db.commit()
        print(f"Job {job_id} Completed Successfully.")

    except Exception as e:
        print(f"Job {job_id} Failed: {e}")
        db.rollback()
        job.status = JobStatus.FAILED.value
        job.error_message = str(e)
        db.commit()
        
    finally:
        # Cleanup temp files for remote storage modes (GCS and S3)
        if storage_service.mode in ("GCS", "S3"):
            # Clean up original downloaded temp file
            if original_input_path and os.path.exists(original_input_path):
                try:
                    os.remove(original_input_path)
                    print(f"Cleaned up temp file: {original_input_path}")
                except Exception as cleanup_err:
                    print(f"Warning: Failed to cleanup temp file {original_input_path}: {cleanup_err}")
            # Clean up normalized mp3 temp file
            if normalized_path and normalized_path != original_input_path and os.path.exists(normalized_path):
                try:
                    os.remove(normalized_path)
                    print(f"Cleaned up normalized file: {normalized_path}")
                except Exception as cleanup_err:
                    print(f"Warning: Failed to cleanup normalized file {normalized_path}: {cleanup_err}")
        db.close()