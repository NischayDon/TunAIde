import os
import shutil
import uuid
from typing import BinaryIO
from google.cloud import storage
from google.oauth2 import service_account
import json
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.mode = "LOCAL"
        self.bucket = None
        self.bucket_name = settings.GCP_BUCKET_NAME
        
        # Check if we should use GCS
        # We need at least a bucket name and some form of credentials (or default auth)
        # Note: In production/Railway, we expect GCP_CREDENTIALS_JSON or a file
        if self.bucket_name and (settings.GCP_CREDENTIALS_JSON or os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or settings.GCP_PROJECT != "test-project"):
            try:
                self._init_gcs()
                self.mode = "GCS"
                print(f"StorageService initialized in GCS mode. Bucket: {self.bucket_name}")
            except Exception as e:
                print(f"Failed to initialize GCS, falling back to LOCAL: {e}")
                self._init_local()
        else:
            self._init_local()

    def _init_local(self):
        self.mode = "LOCAL"
        self.upload_dir = os.path.join(os.getcwd(), "app", "static", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        print(f"StorageService initialized in LOCAL mode. Path: {self.upload_dir}")

    def _init_gcs(self):
        credentials = None
        
        # Priority 1: Raw JSON content from ENV (Railway friendly)
        if settings.GCP_CREDENTIALS_JSON:
            try:
                info = json.loads(settings.GCP_CREDENTIALS_JSON)
                credentials = service_account.Credentials.from_service_account_info(info)
            except json.JSONDecodeError as e:
                print(f"Error decoding GCP_CREDENTIALS_JSON: {e}")
                # Don't crash, might fallback or fail later
        
        # Priority 2: File path (Local dev friendly, GOOGLE_APPLICATION_CREDENTIALS handled by lib by default, 
        # but explicit check helps log logic)
        
        if credentials:
            self.client = storage.Client(project=settings.GCP_PROJECT, credentials=credentials)
        else:
            # Fallback to default environment auth (GOOGLE_APPLICATION_CREDENTIALS path)
            self.client = storage.Client(project=settings.GCP_PROJECT)
            
        self.bucket = self.client.bucket(self.bucket_name)

    def save_file(self, file_obj: BinaryIO, filename: str) -> str:
        """
        Save file. Returns the storage path/identifier.
        """
        ext = filename.split('.')[-1] if '.' in filename else "bin"
        unique_name = f"{uuid.uuid4()}.{ext}"

        if self.mode == "GCS":
            blob = self.bucket.blob(unique_name)
            # Reset pointer just in case
            file_obj.seek(0)
            blob.upload_from_file(file_obj)
            return unique_name
        else:
            file_path = os.path.join(self.upload_dir, unique_name)
            file_obj.seek(0)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file_obj, buffer)
            return unique_name

    def get_full_path(self, relative_path: str) -> str:
        """
        For local: returns absolute path.
        For GCS: returns the relative path (blob name) or signed URL if needed.
        NOTE: Upstream code might expect a filesystem path for processing (ffmpeg).
        If so, we might need to download it first.
        """
        if self.mode == "GCS":
            # If the caller needs a local path (ffmpeg), this won't work directly.
            # We assume for now the caller handles it or we download on demand.
            # Implemented 'download_to_temp' helper just in case.
            return relative_path 
        else:
            return os.path.join(self.upload_dir, relative_path)
    
    def download_to_temp(self, relative_path: str) -> str:
        """
        Helper to get a local path for processing tools like ffmpeg.
        Returns path to a temporary file. Caller should cleanup.
        """
        if self.mode == "LOCAL":
            return self.get_full_path(relative_path)
        
        # GCS: Download to temp
        import tempfile
        blob = self.bucket.blob(relative_path)
        # Preserve extension
        ext = relative_path.split('.')[-1] if '.' in relative_path else "bin"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
        blob.download_to_filename(tmp.name)
        tmp.close()
        return tmp.name

    def delete_file(self, relative_path: str):
        if self.mode == "GCS":
            try:
                blob = self.bucket.blob(relative_path)
                blob.delete()
            except Exception as e:
                print(f"Error deleting GCS blob {relative_path}: {e}")
        else:
            path = self.get_full_path(relative_path)
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    print(f"Error deleting local file {path}: {e}")

storage_service = StorageService()
