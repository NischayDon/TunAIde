import os
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
        self.mode = None
        self.bucket = None
        self.s3_client = None
        
        # S3 / Railway Object Storage Check (priority)
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

        if self.mode is None:
            raise RuntimeError(
                "StorageService: No remote storage configured! "
                "Set S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY (Railway Object Storage) "
                "or GCP_CREDENTIALS_JSON (GCS). Local storage is disabled."
            )
              
    def _check_gcs(self):
        # GCS Check
        self.bucket_name = settings.GCP_BUCKET_NAME
        if self.bucket_name and (settings.GCP_CREDENTIALS_JSON or os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or settings.GCP_PROJECT != "test-project"):
            try:
                self._init_gcs()
                self.mode = "GCS"
                print(f"StorageService initialized in GCS mode. Bucket: {self.bucket_name}")
            except Exception as e:
                print(f"Failed to initialize GCS: {e}")
        
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

    def get_full_path(self, relative_path: str) -> str:
        # Remote paths are just their keys/names
        return relative_path
    
    def download_to_temp(self, relative_path: str) -> str:
        import tempfile
        import urllib.request
        from urllib.parse import urlparse

        ext = relative_path.split('.')[-1] if '.' in relative_path else "bin"
        ext = ext.split('?')[0] # Clean query params if it's a URL
        
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
        tmp.close() # Close so we can write to it via SDK
        
        if relative_path.startswith("http://") or relative_path.startswith("https://"):
            try:
                req = urllib.request.Request(
                    relative_path,
                    headers={'User-Agent': 'TunAIde/1.0'}
                )
                with urllib.request.urlopen(req) as response, open(tmp.name, 'wb') as out_file:
                    out_file.write(response.read())
                return tmp.name
            except Exception as e:
                print(f"Error downloading HTTP URL {relative_path}: {e}")
                raise
                
        elif relative_path.startswith("s3://"):
            parsed = urlparse(relative_path)
            bucket = parsed.netloc
            key = parsed.path.lstrip('/')
            self.s3_client.download_file(bucket, key, tmp.name)
            return tmp.name
        
        if self.mode == "S3":
            # Just in case there is a leading slash causing a 404 on AWS/Minio
            s3_key = relative_path.lstrip('/')
            self.s3_client.download_file(self.s3_bucket_name, s3_key, tmp.name)
            return tmp.name
            
        elif self.mode == "GCS":
            # GCS doesn't typically mind leading slashes, but good to be consistent
            gcs_key = relative_path.lstrip('/')
            blob = self.bucket.blob(gcs_key)
            blob.download_to_filename(tmp.name)
            return tmp.name

    def delete_file(self, relative_path: str):
        try:
            if self.mode == "S3":
                self.s3_client.delete_object(Bucket=self.s3_bucket_name, Key=relative_path)
            elif self.mode == "GCS":
                blob = self.bucket.blob(relative_path)
                blob.delete()
        except Exception as e:
            print(f"Error deleting file {relative_path} in {self.mode}: {e}")

storage_service = StorageService()
