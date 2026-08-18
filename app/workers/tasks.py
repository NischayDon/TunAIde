import os
import subprocess
import json

from app.workers.celery_app import celery_app
from app.db.base import SessionLocal
from app.db.models import Job, JobStatus, Transcript, User
from app.core.config import settings
from app.services.transcription import transcription_service
from app.services.timestamp_agent import timestamp_agent
from app.services.storage import storage_service

import wave
import contextlib


def parse_time_value(val):
    """Convert a time value (float seconds OR 'HH:MM:SS'/'MM:SS' string) to numeric seconds."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            return float(val)
        except ValueError:
            pass
        # Parse HH:MM:SS or MM:SS
        parts = val.strip().split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + float(parts[1])
        except (ValueError, IndexError):
            pass
    return 0.0


def get_audio_duration_ffprobe(file_path: str) -> float:
    """Use ffprobe to get audio duration in seconds. Returns 0 on failure."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception as e:
        print(f"ffprobe duration failed: {e}")
    return 0.0

@celery_app.task(name="app.workers.tasks.process_audio", bind=True)
def process_audio(self, job_id: str):
    process_audio_file(job_id, task_id=self.request.id)

def process_audio_file(job_id: str, task_id: str = None):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        print(f"Job {job_id} not found.")
        return

    original_input_path = None  # Track the original downloaded file
    normalized_path = None       # Track the normalized mp3 file
    input_path = None
    try:
        from datetime import datetime, timezone
        # 1. Update Status -> PROCESSING
        print(f"Starting Job {job_id}")
        job.status = JobStatus.PROCESSING.value
        job.started_at = datetime.now(timezone.utc)
        if task_id:
            job.celery_task_id = task_id
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
        
        # 5. Generate Timestamps via Gemini Agent
        print("Generating timestamps with Gemini agent...")
        segments = timestamp_agent.generate_timestamps(input_path, transcription_result["text"])
        if segments:
            transcription_result["metadata"]["segments"] = segments
            # Compute duration from the last segment's end time (handles string timestamps)
            last_end = max((parse_time_value(s.get("end", 0)) for s in segments), default=0)
            if last_end > 0:
                transcription_result["metadata"]["duration"] = last_end
        else:
            print("Warning: Gemini failed to generate timestamps. Falling back to text-only.")
        
        # Fallback: use ffprobe if we still have no duration
        if not transcription_result["metadata"].get("duration"):
            probe_duration = get_audio_duration_ffprobe(input_path)
            if probe_duration > 0:
                transcription_result["metadata"]["duration"] = probe_duration
                print(f"Duration from ffprobe: {probe_duration}s")
        
        # 6. Save Transcript
        new_transcript = Transcript(
            job_id=job_id,
            text_content=transcription_result["text"],
            json_metadata=transcription_result["metadata"]
        )
        db.add(new_transcript)
        
        # 7. Auto-extract ledger fields from transcript text
        plain_text = transcription_result["text"].strip()
        words = plain_text.split()
        
        valid_service_types = {
            "recours": "Recours",
            "ofpra": "OFPRA",
            "réexamin": "Réexamin",
            "reexamin": "Réexamin",
            "tribunal": "Tribunal",
        }
        
        if words:
            first_word_lower = words[0].strip(".,;:!?").lower()
            matched_service = valid_service_types.get(first_word_lower)
            if matched_service:
                job.service_type = matched_service
                print(f"Auto-extracted service_type: {matched_service}")
            else:
                print(f"Warning: First word '{words[0]}' does not match a known service type.")
        
        if len(words) >= 2:
            job.client_name = words[1].strip(".,;:!?")
            print(f"Auto-extracted client_name: {job.client_name}")
        
        if len(words) >= 3:
            job.client_surname = words[2].strip(".,;:!?")
            print(f"Auto-extracted client_surname: {job.client_surname}")
        
        # 8. Complete Job
        job.status = JobStatus.COMPLETED.value
        job.completed_at = datetime.now(timezone.utc)
        # Use duration from metadata (calculated in service or from segments)
        raw_duration = transcription_result["metadata"].get("duration", 0)
        job.duration_seconds = int(parse_time_value(raw_duration)) if raw_duration else 0
        
        # 9. Increment lifetime completed counter
        user = db.query(User).filter(User.id == job.user_id).first()
        if user:
            user.total_completed = (user.total_completed or 0) + 1
            
        db.commit()
        print(f"Job {job_id} Completed Successfully.")

    except Exception as e:
        print(f"Job {job_id} Failed: {e}")
        db.rollback()
        job.status = JobStatus.FAILED.value
        job.completed_at = datetime.now(timezone.utc)
        job.error_message = str(e)
        db.commit()
        raise  # Re-raise so Celery marks task as failed instead of succeeded
        
    finally:
        # Cleanup temp files (storage is always remote — S3 or GCS)
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