"""
Comprehensive tests for the StorageService rewrite.

Tests cover:
1. Lazy initialization — import does not crash
2. Configuration validation — missing/partial config produces clear errors
3. S3 client construction — correct botocore Config for Railway
4. GCS fallback — only when S3 is not configured
5. Module-level singleton — safe for Celery import
6. Upload/download/delete operations (mocked S3)
7. Health/verify endpoint reporting
"""

import os
import io
import json
import uuid
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from types import SimpleNamespace


# ---------------------------------------------------------------------------
# Helper: Build a fake settings object for tests
# ---------------------------------------------------------------------------

def make_settings(**overrides):
    """Return a Settings-like object with defaults matching 'no storage configured'."""
    defaults = {
        "S3_ACCESS_KEY_ID": None,
        "S3_SECRET_ACCESS_KEY": None,
        "S3_BUCKET_NAME": None,
        "S3_ENDPOINT_URL": None,
        "S3_REGION_NAME": "us-east-1",
        "GCP_PROJECT": "test-project",
        "GCP_BUCKET_NAME": "tunaide-uploads",
        "GCP_CREDENTIALS_JSON": "",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


RAILWAY_SETTINGS = make_settings(
    S3_ACCESS_KEY_ID="tid_TestAccessKey123",
    S3_SECRET_ACCESS_KEY="tsec_TestSecretKey456",
    S3_BUCKET_NAME="test-bucket-abc",
    S3_ENDPOINT_URL="https://t3.storageapi.dev",
)

PARTIAL_S3_SETTINGS = make_settings(
    S3_ACCESS_KEY_ID="tid_TestAccessKey123",
    S3_SECRET_ACCESS_KEY="tsec_TestSecretKey456",
    # Missing S3_BUCKET_NAME and S3_ENDPOINT_URL
)

BAD_ENDPOINT_SETTINGS = make_settings(
    S3_ACCESS_KEY_ID="tid_TestAccessKey123",
    S3_SECRET_ACCESS_KEY="tsec_TestSecretKey456",
    S3_BUCKET_NAME="test-bucket",
    S3_ENDPOINT_URL="not-a-url",
)

NO_STORAGE_SETTINGS = make_settings()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestStorageServiceImport:
    """Verify that importing the module does not crash."""

    def test_import_does_not_crash(self):
        """The module-level `storage_service = StorageService()` must not do I/O."""
        # If this import itself raises, the test fails immediately
        from app.services.storage import StorageService
        svc = StorageService()
        assert svc.is_initialized is False
        assert svc._mode is None

    def test_module_singleton_exists(self):
        """storage_service should be importable without errors."""
        from app.services.storage import storage_service
        assert storage_service is not None
        # It should NOT be initialized yet (lazy)
        assert storage_service._initialized is False


class TestConfigValidation:
    """Verify that missing/partial config produces clear diagnostics."""

    @patch("app.services.storage.settings", PARTIAL_S3_SETTINGS)
    def test_partial_s3_config_raises_config_error(self):
        from app.services.storage import StorageService, StorageConfigError
        svc = StorageService()
        with pytest.raises(StorageConfigError, match="Missing.*S3_BUCKET_NAME"):
            svc._ensure_initialized()

    @patch("app.services.storage.settings", BAD_ENDPOINT_SETTINGS)
    def test_bad_endpoint_raises_config_error(self):
        from app.services.storage import StorageService, StorageConfigError
        svc = StorageService()
        with pytest.raises(StorageConfigError, match="must start with http"):
            svc._ensure_initialized()

    @patch("app.services.storage.settings", NO_STORAGE_SETTINGS)
    def test_no_storage_raises_config_error(self):
        from app.services.storage import StorageService, StorageConfigError
        svc = StorageService()
        with pytest.raises(StorageConfigError, match="No remote storage configured"):
            svc._ensure_initialized()


class TestS3ClientConstruction:
    """Verify the boto3 client is built with the correct Railway-compatible config."""

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_s3_client_uses_sigv4_and_virtual(self, mock_boto3):
        """Ensure signature_version=s3v4 and addressing_style=virtual."""
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        svc = StorageService()
        svc._ensure_initialized()

        # Verify boto3.client was called with the right params
        call_kwargs = mock_boto3.client.call_args
        assert call_kwargs[0][0] == "s3"  # first positional arg
        assert call_kwargs[1]["endpoint_url"] == "https://t3.storageapi.dev"
        assert call_kwargs[1]["aws_access_key_id"] == "tid_TestAccessKey123"
        assert call_kwargs[1]["aws_secret_access_key"] == "tsec_TestSecretKey456"
        assert call_kwargs[1]["region_name"] == "us-east-1"

        # Check botocore Config
        config = call_kwargs[1]["config"]
        assert config.signature_version == "s3v4"
        assert config.s3["addressing_style"] == "virtual"

        assert svc._mode == "S3"
        assert svc._initialized is True
        assert svc._s3_bucket_name == "test-bucket-abc"

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_s3_does_not_call_head_bucket_on_init(self, mock_boto3):
        """head_bucket() must NOT be called during initialization."""
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        svc = StorageService()
        svc._ensure_initialized()

        mock_client.head_bucket.assert_not_called()


class TestS3DoesNotFallbackToGCS:
    """When S3 keys are set, GCS must never be tried."""

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_gcs_not_attempted_when_s3_configured(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        svc = StorageService()
        svc._ensure_initialized()

        assert svc._mode == "S3"
        assert svc._gcs_client is None
        assert svc._gcs_bucket is None


class TestVerifyEndpoint:
    """Test the verify() health-check method."""

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_verify_healthy(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.head_bucket.return_value = {}  # success

        svc = StorageService()
        result = svc.verify()

        assert result["healthy"] is True
        assert result["mode"] == "S3"
        assert result["bucket"] == "test-bucket-abc"
        mock_client.head_bucket.assert_called_once_with(Bucket="test-bucket-abc")

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_verify_auth_failure(self, mock_boto3):
        from app.services.storage import StorageService
        from botocore.exceptions import ClientError

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.head_bucket.side_effect = ClientError(
            {"Error": {"Code": "SignatureDoesNotMatch", "Message": "bad sig"}},
            "HeadBucket",
        )

        svc = StorageService()
        result = svc.verify()

        assert result["healthy"] is False
        assert "authentication failed" in result["error"]

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_verify_bucket_not_found(self, mock_boto3):
        from app.services.storage import StorageService
        from botocore.exceptions import ClientError

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.head_bucket.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "not found"}},
            "HeadBucket",
        )

        svc = StorageService()
        result = svc.verify()

        assert result["healthy"] is False
        assert "does not exist" in result["error"]

    @patch("app.services.storage.settings", NO_STORAGE_SETTINGS)
    def test_verify_no_config(self):
        from app.services.storage import StorageService

        svc = StorageService()
        result = svc.verify()

        assert result["healthy"] is False
        assert "No remote storage configured" in result["error"]


class TestSaveFile:
    """Test the upload (save_file) operation."""

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_save_file_returns_unique_key(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        svc = StorageService()
        file_obj = io.BytesIO(b"audio data here")

        key = svc.save_file(file_obj, "recording.mp3")

        assert key.endswith(".mp3")
        # Verify it's a UUID-based name
        name_part = key.rsplit(".", 1)[0]
        uuid.UUID(name_part)  # Should not raise

        mock_client.upload_fileobj.assert_called_once()
        call_args = mock_client.upload_fileobj.call_args
        assert call_args[0][1] == "test-bucket-abc"  # bucket name
        assert call_args[0][2] == key  # object key

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_save_file_handles_no_extension(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        svc = StorageService()
        file_obj = io.BytesIO(b"data")

        key = svc.save_file(file_obj, "noext")
        assert key.endswith(".bin")


class TestDownloadToTemp:
    """Test the download_to_temp operation."""

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_download_s3_key(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        svc = StorageService()
        # Mock download_file to write something to the temp file
        def fake_download(bucket, key, filename):
            with open(filename, "wb") as f:
                f.write(b"downloaded content")

        mock_client.download_file.side_effect = fake_download

        result = svc.download_to_temp("abc123.mp3")
        assert result.endswith(".mp3")
        assert os.path.exists(result)

        # Cleanup
        os.unlink(result)

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_download_strips_leading_slash(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.download_file.side_effect = lambda b, k, f: open(f, "wb").close()

        svc = StorageService()
        svc.download_to_temp("/leading/slash/file.wav")

        # Verify the key was stripped of leading slash
        call_args = mock_client.download_file.call_args
        assert call_args[0][1] == "leading/slash/file.wav"


class TestDeleteFile:
    """Test the delete_file operation."""

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_delete_file_calls_s3(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        svc = StorageService()
        svc.delete_file("some-key.mp3")

        mock_client.delete_object.assert_called_once_with(
            Bucket="test-bucket-abc", Key="some-key.mp3"
        )

    @patch("app.services.storage.settings", RAILWAY_SETTINGS)
    @patch("app.services.storage.boto3")
    def test_delete_file_swallows_error(self, mock_boto3):
        from app.services.storage import StorageService

        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.delete_object.side_effect = Exception("network error")

        svc = StorageService()
        # Should not raise
        svc.delete_file("some-key.mp3")


class TestCeleryWorkerImport:
    """Simulate the Celery worker's import chain."""

    def test_celery_app_imports_tasks_without_crash(self):
        """
        The critical test: importing tasks.py (which imports storage_service)
        must succeed without making any network calls.
        """
        # This is the exact import chain that Celery performs:
        #   celery_app.py -> include=["app.workers.tasks"]
        #   tasks.py -> from app.services.storage import storage_service
        #
        # Before the fix, this would call StorageService() -> _init_s3() -> head_bucket()
        # and crash.  After the fix, it just creates an uninitialized singleton.
        from app.services.storage import storage_service as ss
        assert ss is not None
        assert ss._initialized is False

    def test_tasks_module_importable(self):
        """The tasks module should import without errors."""
        # This would have crashed before the fix
        import app.workers.tasks as tasks_module
        assert hasattr(tasks_module, "process_audio")
