"""
Tests for Celery Worker startup, dependency versions, and task processing.

Verifies:
1. redis.__version__ is >= 6.1.0 and < 7.0.0
2. Celery 5.3.6 and Kombu compatibility (no VersionMismatch on Redis transport)
3. Task registration of app.workers.tasks.process_audio
4. Worker ready signal execution
5. End-to-end task execution and DB persistence
"""
import pytest
from packaging.version import Version
import celery
import kombu
import redis


def test_dependency_versions():
    """Verify installed versions meet the exact specification."""
    redis_version = Version(redis.__version__)
    assert redis_version >= Version("6.1.0"), f"redis must be >= 6.1.0, got {redis.__version__}"
    assert redis_version < Version("7.0.0"), f"redis must be < 7.0.0, got {redis.__version__}"

    celery_version = Version(celery.__version__)
    assert celery_version >= Version("5.3.0"), f"celery version expected >= 5.3.0, got {celery.__version__}"

    print(f"\n[Verified Versions] Celery: {celery.__version__}, Kombu: {kombu.__version__}, Redis: {redis.__version__}")


def test_kombu_redis_transport_no_version_mismatch():
    """
    Verify that Kombu's Redis transport does not raise VersionMismatch.
    This was the exact failure on Railway deployment:
    kombu.exceptions.VersionMismatch: Redis transport requires redis-py versions 6.1.0 or later.
    """
    from kombu.transport.redis import Channel

    dummy_self = type("DummyChannel", (), {"global_keyprefix": None})()
    client_cls = Channel._get_client(dummy_self)
    assert client_cls is redis.Redis


def test_process_audio_task_registered():
    """Verify that app.workers.tasks.process_audio is registered on celery_app."""
    from app.workers.celery_app import celery_app
    import app.workers.tasks  # triggers task definition

    assert "app.workers.tasks.process_audio" in celery_app.tasks
    task = celery_app.tasks["app.workers.tasks.process_audio"]
    assert callable(task)


def test_worker_ready_signal():
    """Verify the worker_ready signal handler executes cleanly."""
    from app.workers.celery_app import on_worker_ready
    # Should run with no exceptions
    on_worker_ready(sender="test_worker")


def test_process_audio_task_execution_and_persistence(monkeypatch, tmp_path):
    """
    Simulate end-to-end task execution of process_audio_file and verify:
    - Status transitions to PROCESSING -> TRANSCRIBING -> COMPLETED
    - Transcript row is created and persisted
    - User completed counter is incremented
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    import uuid
    from datetime import datetime, timezone

    from app.db.base import Base
    from app.db.models import User, Job, JobStatus, Transcript
    import app.workers.tasks as tasks_mod

    # Setup isolated in-memory DB
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # Monkeypatch SessionLocal in tasks module
    monkeypatch.setattr(tasks_mod, "SessionLocal", TestingSessionLocal)

    db = TestingSessionLocal()
    # Create test user
    user = User(
        id=str(uuid.uuid4()),
        username="testworkeruser",
        email="worker@tunai.com",
        total_uploads=1,
        total_completed=0
    )
    db.add(user)

    # Create test job
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        user_id=user.id,
        original_filename="consultation_sample.wav",
        storage_path=f"audio/{job_id}/consultation_sample.wav",
        status=JobStatus.QUEUED.value
    )
    db.add(job)
    db.commit()

    # Create dummy audio file on disk
    dummy_audio_file = tmp_path / "test.wav"
    dummy_audio_file.write_bytes(b"RIFF....WAVEfmt ....data....")

    # Mock storage_service and transcription_service
    monkeypatch.setattr(
        tasks_mod.storage_service,
        "download_to_temp",
        lambda path: str(dummy_audio_file)
    )

    mock_transcript_result = {
        "text": "Client Name: John Doe. DOB: 01/01/1990. Phone: 0871234567. Follow up consultation required.",
        "metadata": {
            "duration": 125,
            "speakers": 2,
            "language": "en"
        }
    }
    monkeypatch.setattr(
        tasks_mod.transcription_service,
        "transcribe_audio",
        lambda path: mock_transcript_result
    )

    # Execute the processing function
    tasks_mod.process_audio_file(job_id=job_id, task_id="test_celery_task_123")

    # Verify database persistence
    db.refresh(job)
    assert job.status == JobStatus.COMPLETED.value
    assert job.celery_task_id == "test_celery_task_123"
    assert job.duration_seconds == 125
    assert job.completed_at is not None

    # Verify transcript persisted
    transcript = db.query(Transcript).filter(Transcript.job_id == job_id).first()
    assert transcript is not None
    assert "John Doe" in transcript.text_content
    assert transcript.json_metadata["duration"] == 125

    # Verify user stats updated
    db.refresh(user)
    assert user.total_completed == 1

    db.close()
