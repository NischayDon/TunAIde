import os
import shutil
import uuid
from typing import BinaryIO
from google.cloud import storage
from google.oauth2 import service_account
import json
import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.mode = "LOCAL"
        self.bucket = None
        self.s3_client = None
        
        # S3 / Railway Bucket Check
        if settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY:
            try:
                self._init_s3()
                self.mode = "S3"
                print(f"StorageService initialized in S3 mode. Bucket: {settings.S3_BUCKET_NAME}")
            except Exception as e:
                print(f"Failed to initialize S3, checking GCS... Error: {e}")
                self._check_gcs()
        else:
             self._check_gcs()
             
    def _check_gcs(self):
        # GCS Check
        self.bucket_name = settings.GCP_BUCKET_NAME
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
        
    def _init_s3(self):
        self.s3_bucket_name = settings.S3_BUCKET_NAME
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT_URL, # Optional for AWS, required for MinIO/Railway
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION_NAME
        )
        # Verify connection
        self.s3_client.head_bucket(Bucket=self.s3_bucket_name)

    def _init_gcs(self):
        credentials = None
        
        if settings.GCP_CREDENTIALS_JSON:
            try:
                info = json.loads(settings.GCP_CREDENTIALS_JSON)
                credentials = service_account.Credentials.from_service_account_info(info)
            except json.JSONDecodeError as e:
                print(f"Error decoding GCP_CREDENTIALS_JSON: {e}")
        
        if credentials:
            self.client = storage.Client(project=settings.GCP_PROJECT, credentials=credentials)
        else:
            self.client = storage.Client(project=settings.GCP_PROJECT)
            
        self.bucket = self.client.bucket(self.bucket_name)

    def save_file(self, file_obj: BinaryIO, filename: str) -> str:
        ext = filename.split('.')[-1] if '.' in filename else "bin"
        unique_name = f"{uuid.uuid4()}.{ext}"

        if self.mode == "S3":
            file_obj.seek(0)
            self.s3_client.upload_fileobj(file_obj, self.s3_bucket_name, unique_name)
            return unique_name
            
        elif self.mode == "GCS":
            blob = self.bucket.blob(unique_name)
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
        if self.mode in ["GCS", "S3"]:
            # Remote paths are just their keys/names
            return relative_path 
        else:
            return os.path.join(self.upload_dir, relative_path)
    
    def download_to_temp(self, relative_path: str) -> str:
        if self.mode == "LOCAL":
            return self.get_full_path(relative_path)
            
        import tempfile
        ext = relative_path.split('.')[-1] if '.' in relative_path else "bin"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
        tmp.close() # Close so we can write to it via SDK
        
        if self.mode == "S3":
            self.s3_client.download_file(self.s3_bucket_name, relative_path, tmp.name)
            return tmp.name
            
        elif self.mode == "GCS":
            blob = self.bucket.blob(relative_path)
            blob.download_to_filename(tmp.name)
            return tmp.name

    def delete_file(self, relative_path: str):
        try:
            if self.mode == "S3":
                self.s3_client.delete_object(Bucket=self.s3_bucket_name, Key=relative_path)
            elif self.mode == "GCS":
                blob = self.bucket.blob(relative_path)
                blob.delete()
            else:
                path = self.get_full_path(relative_path)
                if os.path.exists(path):
                    os.remove(path)
        except Exception as e:
            print(f"Error deleting file {relative_path} in {self.mode}: {e}")

storage_service = StorageService()
