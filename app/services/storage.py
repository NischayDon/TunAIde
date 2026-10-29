import os
import uuid
import logging
from typing import BinaryIO, Optional

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError, BotoCoreError, NoCredentialsError

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageServiceError(Exception):
    """Base exception for storage service failures."""
    pass


class StorageConfigError(StorageServiceError):
    """Raised when storage configuration is missing or invalid."""
    pass


class StorageAuthError(StorageServiceError):
    """Raised when storage credentials are rejected."""
    pass


class StorageBucketError(StorageServiceError):
    """Raised when the configured bucket cannot be accessed."""
    pass


class StorageService:
    """
    S3-compatible storage service for Railway Buckets.

    Initialization is deferred until first use so that importing this module
    (e.g. from a Celery worker) never performs network I/O or raises at import
    time.  The first call to any storage operation triggers _ensure_initialized(),
    which validates config and constructs the client.  A separate verify() method
    performs a live head_bucket() for health checks.

    GCS fallback is only attempted when S3 credentials are NOT configured.
    When S3 is explicitly configured (keys present), GCS is never used — errors
    produce clear diagnostics instead of silent provider switches.
    """

    def __init__(self):
        self._mode: Optional[str] = None
        self._s3_client = None
        self._s3_bucket_name: Optional[str] = None
        self._gcs_bucket = None
        self._gcs_client = None
        self._gcs_bucket_name: Optional[str] = None
        self._initialized = False
        self._init_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Public properties
    # ------------------------------------------------------------------

    @property
    def mode(self) -> Optional[str]:
        """Return the active storage mode (S3 | GCS | None)."""
        if not self._initialized:
            self._ensure_initialized()
        return self._mode

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def s3_client(self):
        """Access the raw boto3 S3 client (after initialization)."""
        if not self._initialized:
            self._ensure_initialized()
        return self._s3_client

    @property
    def s3_bucket_name(self) -> Optional[str]:
        if not self._initialized:
            self._ensure_initialized()
        return self._s3_bucket_name

    # ------------------------------------------------------------------
    # Deferred initialization
    # ------------------------------------------------------------------

    def _ensure_initialized(self):
        """Initialize on first use.  Raises StorageServiceError on fatal config issues."""
        if self._initialized:
            return

        s3_configured = bool(settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY)

        if s3_configured:
            self._init_s3()
            # If we reach here without exception, S3 is ready
            self._mode = "S3"
            self._initialized = True
            self._init_error = None
            logger.info(
                "StorageService initialized in S3 mode.  Bucket: %s  Endpoint: %s",
                self._s3_bucket_name,
                settings.S3_ENDPOINT_URL,
            )
            return

        # S3 not configured — try GCS as a legitimate alternative (not a silent fallback)
        if self._try_init_gcs():
            self._mode = "GCS"
            self._initialized = True
            self._init_error = None
            logger.info(
                "StorageService initialized in GCS mode.  Bucket: %s",
                self._gcs_bucket_name,
            )
            return

        # Neither provider configured
        msg = (
            "StorageService: No remote storage configured.  "
            "Set S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY + S3_BUCKET_NAME + S3_ENDPOINT_URL "
            "for Railway Object Storage, or configure GCP_CREDENTIALS_JSON + GCP_BUCKET_NAME for GCS."
        )
        self._init_error = msg
        raise StorageConfigError(msg)

    def _init_s3(self):
        """
        Construct the boto3 S3 client for Railway Buckets.

        Does NOT call head_bucket() — client construction is separated from
        connectivity verification so that config problems fail fast but transient
        network glitches don't prevent the process from starting.
        """
        # --- Validate required settings ---
        missing = []
        if not settings.S3_ACCESS_KEY_ID:
            missing.append("S3_ACCESS_KEY_ID")
        if not settings.S3_SECRET_ACCESS_KEY:
            missing.append("S3_SECRET_ACCESS_KEY")
        if not settings.S3_BUCKET_NAME:
            missing.append("S3_BUCKET_NAME")
        if not settings.S3_ENDPOINT_URL:
            missing.append("S3_ENDPOINT_URL")

        if missing:
            raise StorageConfigError(
                f"S3 storage is partially configured.  Missing: {', '.join(missing)}.  "
                "All four S3 variables must be set."
            )

        # Detect obviously wrong endpoint formats
        endpoint = settings.S3_ENDPOINT_URL.strip()
        if not endpoint.startswith(("http://", "https://")):
            raise StorageConfigError(
                f"S3_ENDPOINT_URL must start with http:// or https://.  Got: '{endpoint[:40]}...'"
            )

        self._s3_bucket_name = settings.S3_BUCKET_NAME.strip()

        # --- Build the boto3 client with Railway-compatible config ---
        # Railway Buckets (Tigris) require:
        #   - AWS Signature Version 4 (s3v4)
        #   - Virtual-hosted–style addressing (bucket as subdomain)
        boto_config = BotoConfig(
            signature_version="s3v4",
            s3={"addressing_style": "virtual"},
            connect_timeout=10,
            read_timeout=30,
            retries={"max_attempts": 2, "mode": "standard"},
        )

        try:
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                region_name=settings.S3_REGION_NAME or "us-east-1",
                config=boto_config,
            )
        except (BotoCoreError, NoCredentialsError) as e:
            raise StorageConfigError(f"Failed to construct S3 client: {e}") from e

        logger.info(
            "S3 client constructed.  Endpoint: %s  Bucket: %s  Region: %s  Signing: s3v4/virtual",
            endpoint,
            self._s3_bucket_name,
            settings.S3_REGION_NAME or "us-east-1",
        )

    def _try_init_gcs(self) -> bool:
        """Attempt GCS initialization.  Returns True on success, False otherwise."""
        try:
            # pyrefly: ignore[missing-import]
            from google.cloud import storage as gcs_storage
            # pyrefly: ignore[missing-import]
            from google.oauth2 import service_account
            # pyrefly: ignore[missing-import]
            import json as _json
        except ImportError:
            logger.debug("google-cloud-storage not installed — skipping GCS.")
            return False

        bucket_name = settings.GCP_BUCKET_NAME
        has_credentials = bool(
            settings.GCP_CREDENTIALS_JSON
            or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        )
        is_real_project = settings.GCP_PROJECT and settings.GCP_PROJECT != "test-project"

        if not bucket_name or (not has_credentials and not is_real_project):
            return False

        try:
            credentials = None
            if settings.GCP_CREDENTIALS_JSON:
                try:
                    info = _json.loads(settings.GCP_CREDENTIALS_JSON)
                    credentials = service_account.Credentials.from_service_account_info(info)
                except _json.JSONDecodeError as e:
                    logger.warning("GCP_CREDENTIALS_JSON is not valid JSON: %s", e)
                    return False

            if credentials:
                client = gcs_storage.Client(project=settings.GCP_PROJECT, credentials=credentials)
            else:
                client = gcs_storage.Client(project=settings.GCP_PROJECT)

            self._gcs_client = client
            self._gcs_bucket = client.bucket(bucket_name)
            self._gcs_bucket_name = bucket_name
            return True
        except Exception as e:
            logger.warning("GCS initialization failed: %s", e)
            return False

    # ------------------------------------------------------------------
    # Health / verification (separate from initialization)
    # ------------------------------------------------------------------

    def verify(self) -> dict:
        """
        Perform a live connectivity check against the configured provider.
        Returns a dict with status information.  Never raises.
        """
        result = {"mode": None, "healthy": False, "error": None}

        try:
            self._ensure_initialized()
        except StorageServiceError as e:
            result["error"] = str(e)
            return result

        result["mode"] = self._mode

        if self._mode == "S3":
            try:
                self._s3_client.head_bucket(Bucket=self._s3_bucket_name)
                result["healthy"] = True
                result["bucket"] = self._s3_bucket_name
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                if error_code in ("403", "SignatureDoesNotMatch"):
                    result["error"] = (
                        f"S3 authentication failed (code {error_code}).  "
                        "Check S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY."
                    )
                elif error_code in ("404", "NoSuchBucket"):
                    result["error"] = (
                        f"S3 bucket '{self._s3_bucket_name}' does not exist.  "
                        "Check S3_BUCKET_NAME."
                    )
                else:
                    result["error"] = f"S3 head_bucket failed: {error_code} — {e}"
            except Exception as e:
                result["error"] = f"S3 connectivity check failed: {e}"

        elif self._mode == "GCS":
            try:
                self._gcs_bucket.exists()
                result["healthy"] = True
                result["bucket"] = self._gcs_bucket_name
            except Exception as e:
                result["error"] = f"GCS connectivity check failed: {e}"

        return result

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    def save_file(self, file_obj: BinaryIO, filename: str) -> str:
        """Upload a file to storage.  Returns the unique object key."""
        self._ensure_initialized()

        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        unique_name = f"{uuid.uuid4()}.{ext}"

        if self._mode == "S3":
            file_obj.seek(0)
            self._s3_client.upload_fileobj(file_obj, self._s3_bucket_name, unique_name)
            return unique_name

        elif self._mode == "GCS":
            blob = self._gcs_bucket.blob(unique_name)
            file_obj.seek(0)
            blob.upload_from_file(file_obj)
            return unique_name

        raise StorageServiceError("No storage provider initialized.")

    def get_full_path(self, relative_path: str) -> str:
        """Remote paths are just their keys/names."""
        return relative_path

    def download_to_temp(self, relative_path: str) -> str:
        """Download an object to a temporary local file.  Returns the temp file path."""
        self._ensure_initialized()

        import tempfile
        import urllib.request
        from urllib.parse import urlparse

        ext = relative_path.rsplit(".", 1)[-1] if "." in relative_path else "bin"
        ext = ext.split("?")[0]  # Clean query params if it's a URL

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
        tmp.close()  # Close so we can write to it via SDK

        # --- HTTP URLs ---
        if relative_path.startswith(("http://", "https://")):
            try:
                req = urllib.request.Request(
                    relative_path,
                    headers={"User-Agent": "TunAIde/1.0"},
                )
                with urllib.request.urlopen(req) as response, open(tmp.name, "wb") as out_file:
                    out_file.write(response.read())
                return tmp.name
            except Exception as e:
                logger.error("Error downloading HTTP URL %s: %s", relative_path, e)
                raise

        # --- s3:// URIs ---
        if relative_path.startswith("s3://"):
            parsed = urlparse(relative_path)
            bucket = parsed.netloc
            key = parsed.path.lstrip("/")
            self._s3_client.download_file(bucket, key, tmp.name)
            return tmp.name

        # --- S3 object keys ---
        if self._mode == "S3":
            s3_key = relative_path.lstrip("/")
            try:
                self._s3_client.download_file(self._s3_bucket_name, s3_key, tmp.name)
                return tmp.name
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code")
                if error_code == "404":
                    basename = os.path.basename(s3_key)
                    logger.warning(
                        "Key '%s' not found in bucket '%s'.  Searching for fallback match...",
                        s3_key,
                        self._s3_bucket_name,
                    )
                    try:
                        paginator = self._s3_client.get_paginator("list_objects_v2")
                        for page in paginator.paginate(Bucket=self._s3_bucket_name):
                            for obj in page.get("Contents", []):
                                if obj["Key"].endswith(basename) or s3_key in obj["Key"]:
                                    logger.info("Found fallback match: '%s'.  Downloading...", obj["Key"])
                                    self._s3_client.download_file(
                                        self._s3_bucket_name, obj["Key"], tmp.name
                                    )
                                    return tmp.name
                    except Exception as search_e:
                        logger.warning("Fallback search failed: %s", search_e)

                raise RuntimeError(
                    f"Failed to download '{relative_path}' from S3 bucket "
                    f"'{self._s3_bucket_name}'. Error: {e}"
                )

        # --- GCS object keys ---
        elif self._mode == "GCS":
            gcs_key = relative_path.lstrip("/")
            blob = self._gcs_bucket.blob(gcs_key)
            blob.download_to_filename(tmp.name)
            return tmp.name

        raise StorageServiceError("No storage provider initialized.")

    def delete_file(self, relative_path: str):
        """Delete an object from storage."""
        self._ensure_initialized()

        try:
            if self._mode == "S3":
                self._s3_client.delete_object(
                    Bucket=self._s3_bucket_name, Key=relative_path
                )
            elif self._mode == "GCS":
                blob = self._gcs_bucket.blob(relative_path)
                blob.delete()
        except Exception as e:
            logger.warning("Error deleting file %s in %s: %s", relative_path, self._mode, e)


# ---------------------------------------------------------------------------
# Module-level singleton — lazy.  Construction does NOT perform I/O.
# ---------------------------------------------------------------------------
storage_service = StorageService()
