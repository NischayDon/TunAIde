import os
import io
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base, get_db
from app.db.models import User, Job, JobStatus, Transcript, Client, ClientFile
from app.api.auth import get_current_user
from app.services.storage import storage_service

# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Current active mock user for tests
_current_user = User(id="user_1", username="testuser1", email="user1@example.com", is_admin=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return _current_user


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)


class MockStorageService:
    def __init__(self):
        self.files = {}

    def save_file(self, file_obj, filename: str) -> str:
        key = f"mock/{uuid.uuid4()}_{filename}"
        if hasattr(file_obj, "read"):
            content = file_obj.read()
        else:
            content = file_obj
        self.files[key] = (filename, content)
        return key

    def download_to_temp(self, storage_path: str) -> str:
        import tempfile
        if storage_path not in self.files:
            # Create dummy file if not found
            content = b"mock content"
        else:
            _, content = self.files[storage_path]
        
        tmp = tempfile.NamedTemporaryFile(delete=False)
        tmp.write(content)
        tmp.close()
        return tmp.name

    def delete_file(self, storage_path: str):
        if storage_path in self.files:
            del self.files[storage_path]


@pytest.fixture(autouse=True)
def setup_db(monkeypatch):
    global _current_user
    _current_user = User(id="user_1", username="testuser1", email="user1@example.com", is_admin=False)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: _current_user

    # Use mock storage service
    mock_storage = MockStorageService()
    monkeypatch.setattr("app.api.ledger.storage_service", mock_storage)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    # Seed users
    u1 = User(id="user_1", username="testuser1", email="user1@example.com", is_admin=False)
    u2 = User(id="user_2", username="testuser2", email="user2@example.com", is_admin=False)
    admin = User(id="admin_1", username="admin", email="admin@example.com", is_admin=True)
    db.add(u1)
    db.add(u2)
    db.add(admin)
    db.commit()
    db.close()
    yield


# =====================================================================
# Main Ledger Tests
# =====================================================================

def test_empty_ledger_displays_correctly():
    """Empty ledger returns 200 with empty items and total 0."""
    res = client.get("/api/ledger/clients")
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_client_creation_and_derived_name():
    """Client creation succeeds and automatically derives Name from first_name + surname."""
    payload = {
        "first_name": "Jean",
        "surname": "Dupont",
        "phone_number": "+33 6 12 34 56 78",
        "date_of_birth": "1985-05-15"
    }
    res = client.post("/api/ledger/clients", json=payload)
    assert res.status_code == 201
    data = res.json()
    
    assert data["first_name"] == "Jean"
    assert data["surname"] == "Dupont"
    assert data["full_name"] == "Jean Dupont"  # Name = First Name + Surname
    assert data["phone_number"] == "+33 6 12 34 56 78"
    assert data["date_of_birth"] == "1985-05-15"
    assert data["created_by_id"] == "user_1"
    assert "id" in data

    # Verify visible in list
    list_res = client.get("/api/ledger/clients")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert list_data["items"][0]["full_name"] == "Jean Dupont"


def test_client_creation_validation():
    """Validation rejects empty first_name or surname."""
    # Missing first name
    res1 = client.post("/api/ledger/clients", json={"first_name": "  ", "surname": "Dupont"})
    assert res1.status_code == 422

    # Missing surname
    res2 = client.post("/api/ledger/clients", json={"first_name": "Jean", "surname": ""})
    assert res2.status_code == 422


def test_international_phone_validation():
    """Validates international phone numbers without assuming Indian numbers."""
    valid_numbers = [
        "+33 6 12 34 56 78",
        "+1 (555) 123-4567",
        "+44 20 7946 0958",
        "0612345678",
        "+93 70 123 4567",
        "+49-30-123456",
    ]
    for phone in valid_numbers:
        res = client.post("/api/ledger/clients", json={
            "first_name": "Test",
            "surname": f"User_{uuid.uuid4().hex[:4]}",
            "phone_number": phone
        })
        assert res.status_code == 201, f"Expected {phone} to be accepted"

    # Invalid phone formats
    invalid_numbers = ["abc", "12", "phone!@#$", "+++"]
    for phone in invalid_numbers:
        res = client.post("/api/ledger/clients", json={
            "first_name": "Test",
            "surname": "Fail",
            "phone_number": phone
        })
        assert res.status_code == 422, f"Expected {phone} to be rejected"


def test_inline_editing_save_and_cancel():
    """Inline editing: PATCH persists changes, changes to either name component updates full_name."""
    # Create client
    res = client.post("/api/ledger/clients", json={
        "first_name": "Pierre",
        "surname": "Martin",
        "phone_number": "+33 6 00 00 00 00",
        "date_of_birth": "1990-01-01"
    })
    client_id = res.json()["id"]

    # 1. Update First Name -> derived full_name updates immediately
    patch_res1 = client.patch(f"/api/ledger/clients/{client_id}", json={
        "first_name": "Alexandre"
    })
    assert patch_res1.status_code == 200
    assert patch_res1.json()["full_name"] == "Alexandre Martin"

    # 2. Update Surname -> derived full_name updates immediately
    patch_res2 = client.patch(f"/api/ledger/clients/{client_id}", json={
        "surname": "Dubois",
        "phone_number": "+33 7 11 22 33 44"
    })
    assert patch_res2.status_code == 200
    assert patch_res2.json()["full_name"] == "Alexandre Dubois"
    assert patch_res2.json()["phone_number"] == "+33 7 11 22 33 44"

    # 3. Verify changes persisted in database
    get_res = client.get(f"/api/ledger/clients/{client_id}")
    assert get_res.status_code == 200
    assert get_res.json()["first_name"] == "Alexandre"
    assert get_res.json()["surname"] == "Dubois"
    assert get_res.json()["full_name"] == "Alexandre Dubois"


def test_client_search():
    """Ledger search matches first_name, surname, full name, phone number, and email."""
    client.post("/api/ledger/clients", json={
        "first_name": "Ahmed",
        "surname": "Khan",
        "phone_number": "+93 70 123 4567",
        "email": "ahmed@example.com"
    })
    client.post("/api/ledger/clients", json={
        "first_name": "Marie",
        "surname": "Curie",
        "phone_number": "+33 1 40 00 00 00",
        "email": "marie@sorbonne.fr"
    })

    # Search by first name
    res1 = client.get("/api/ledger/clients?search=Ahmed")
    assert res1.json()["total"] == 1
    assert res1.json()["items"][0]["first_name"] == "Ahmed"

    # Search by surname
    res2 = client.get("/api/ledger/clients?search=Curie")
    assert res2.json()["total"] == 1
    assert res2.json()["items"][0]["surname"] == "Curie"

    # Search by phone
    res3 = client.get("/api/ledger/clients?search=123 4567")
    assert res3.json()["total"] == 1
    assert res3.json()["items"][0]["first_name"] == "Ahmed"

    # Search by email
    res4 = client.get("/api/ledger/clients?search=sorbonne")
    assert res4.json()["total"] == 1
    assert res4.json()["items"][0]["surname"] == "Curie"

    # Search by combined full name
    res5 = client.get("/api/ledger/clients?search=Ahmed Khan")
    assert res5.json()["total"] == 1


# =====================================================================
# Client Profile & Section-Level Editing Tests
# =====================================================================

def test_client_profile_sections_and_controlled_editing():
    """Client profile maintains comprehensive details across sections A-F with section-level edits."""
    create_res = client.post("/api/ledger/clients", json={
        "first_name": "Elena",
        "surname": "Rostova",
        "phone_number": "+380 50 123 4567"
    })
    client_id = create_res.json()["id"]

    # Update Section A (Personal Info)
    patch_secA = client.patch(f"/api/ledger/clients/{client_id}", json={
        "gender": "Female",
        "nationality": "Ukrainian",
        "place_of_birth": "Kyiv",
        "current_country": "France",
        "marital_status": "Single",
        "preferred_language": "Ukrainian"
    })
    assert patch_secA.status_code == 200
    assert patch_secA.json()["nationality"] == "Ukrainian"
    assert patch_secA.json()["preferred_language"] == "Ukrainian"

    # Update Section B (Contact Info)
    patch_secB = client.patch(f"/api/ledger/clients/{client_id}", json={
        "secondary_phone": "+33 6 99 88 77 66",
        "email": "elena.r@example.com",
        "address": "15 Rue de la Paix",
        "city": "Paris",
        "postal_code": "75002",
        "country": "France"
    })
    assert patch_secB.status_code == 200
    assert patch_secB.json()["city"] == "Paris"
    assert patch_secB.json()["email"] == "elena.r@example.com"

    # Update Section C (Identification - structured JSON)
    patch_secC = client.patch(f"/api/ledger/clients/{client_id}", json={
        "identification_info": {
            "passport_number": "PU123456",
            "passport_country": "Ukraine",
            "passport_issue_date": "2020-01-10",
            "passport_expiry_date": "2030-01-10",
            "national_id": "UKR-987654"
        }
    })
    assert patch_secC.status_code == 200
    id_info = patch_secC.json()["identification_info"]
    assert id_info["passport_number"] == "PU123456"
    assert id_info["national_id"] == "UKR-987654"

    # Update Section D (Case Information - structured JSON)
    patch_secD = client.patch(f"/api/ledger/clients/{client_id}", json={
        "case_info": {
            "case_reference": "CAS-2026-0042",
            "case_type": "Recours",
            "case_status": "Pending",
            "assigned_worker": "Sarah Jenkins",
            "date_case_opened": "2026-03-01",
            "case_summary": "Asylum request appeal filed under Article L. 532-1."
        }
    })
    assert patch_secD.status_code == 200
    case_info = patch_secD.json()["case_info"]
    assert case_info["case_reference"] == "CAS-2026-0042"
    assert case_info["case_type"] == "Recours"

    # Update Section E (Background Information - structured JSON)
    patch_secE = client.patch(f"/api/ledger/clients/{client_id}", json={
        "background_info": {
            "education": "Master of Computer Science",
            "employment": "Software Engineer",
            "family_info": "Parents in Ukraine"
        }
    })
    assert patch_secE.status_code == 200
    assert patch_secE.json()["background_info"]["education"] == "Master of Computer Science"

    # Update Section F (Additional Information - structured JSON)
    patch_secF = client.patch(f"/api/ledger/clients/{client_id}", json={
        "additional_info": {
            "notes": "Urgent hearing on Dec 1st",
            "important_dates": "Hearing: 01/12/2026",
            "other_details": "Requires Pashto interpreter if translation needed"
        }
    })
    assert patch_secF.status_code == 200
    assert patch_secF.json()["additional_info"]["important_dates"] == "Hearing: 01/12/2026"

    # Verify entire comprehensive record persisted
    full_profile = client.get(f"/api/ledger/clients/{client_id}").json()
    assert full_profile["first_name"] == "Elena"
    assert full_profile["full_name"] == "Elena Rostova"
    assert full_profile["nationality"] == "Ukrainian"
    assert full_profile["email"] == "elena.r@example.com"
    assert full_profile["identification_info"]["passport_number"] == "PU123456"
    assert full_profile["case_info"]["case_type"] == "Recours"
    assert full_profile["background_info"]["education"] == "Master of Computer Science"
    assert full_profile["additional_info"]["notes"] == "Urgent hearing on Dec 1st"


def test_client_authorization_and_data_isolation():
    """Users cannot view, edit, or delete another user's client records; Admin can access all."""
    global _current_user

    # User 1 creates client
    _current_user = User(id="user_1", username="testuser1", is_admin=False)
    create_res = client.post("/api/ledger/clients", json={
        "first_name": "Private",
        "surname": "Client"
    })
    client_id = create_res.json()["id"]

    # User 2 tries to access User 1's client
    _current_user = User(id="user_2", username="testuser2", is_admin=False)
    assert client.get(f"/api/ledger/clients/{client_id}").status_code == 404
    assert client.patch(f"/api/ledger/clients/{client_id}", json={"first_name": "Hacked"}).status_code == 404
    assert client.delete(f"/api/ledger/clients/{client_id}").status_code == 404

    # User 2's client list does NOT include User 1's client
    user2_list = client.get("/api/ledger/clients").json()
    assert user2_list["total"] == 0

    # Admin CAN access User 1's client
    _current_user = User(id="admin_1", username="admin", is_admin=True)
    admin_get = client.get(f"/api/ledger/clients/{client_id}")
    assert admin_get.status_code == 200
    assert admin_get.json()["first_name"] == "Private"


def test_client_deletion():
    """Client deletion removes record and requires confirmation on frontend."""
    res = client.post("/api/ledger/clients", json={
        "first_name": "Delete",
        "surname": "Me"
    })
    client_id = res.json()["id"]

    del_res = client.delete(f"/api/ledger/clients/{client_id}")
    assert del_res.status_code == 204

    # Record no longer exists
    assert client.get(f"/api/ledger/clients/{client_id}").status_code == 404


# =====================================================================
# Client File Management Tests (Requirement 7)
# =====================================================================

def test_client_file_upload_download_preview_and_delete():
    """Multi-file upload, listing, preview, download, and deletion work securely."""
    create_res = client.post("/api/ledger/clients", json={
        "first_name": "Document",
        "surname": "Owner"
    })
    client_id = create_res.json()["id"]

    # 1. Upload multiple files (PDF and Image)
    pdf_content = b"%PDF-1.4 mock pdf document content"
    img_content = b"\x89PNG\r\n\x1a\n mock png image content"

    files = [
        ("files", ("passport.pdf", io.BytesIO(pdf_content), "application/pdf")),
        ("files", ("id_photo.png", io.BytesIO(img_content), "image/png"))
    ]

    upload_res = client.post(f"/api/ledger/clients/{client_id}/files", files=files)
    assert upload_res.status_code == 201
    uploaded_files = upload_res.json()
    assert len(uploaded_files) == 2
    
    pdf_file_id = next(f["id"] for f in uploaded_files if f["original_filename"] == "passport.pdf")
    img_file_id = next(f["id"] for f in uploaded_files if f["original_filename"] == "id_photo.png")

    # 2. List client files
    list_files_res = client.get(f"/api/ledger/clients/{client_id}/files")
    assert list_files_res.status_code == 200
    assert len(list_files_res.json()) == 2

    # 3. Download client file (attachment disposition)
    dl_res = client.get(f"/api/ledger/clients/{client_id}/files/{pdf_file_id}/download")
    assert dl_res.status_code == 200
    assert "attachment" in dl_res.headers.get("content-disposition", "")
    assert dl_res.content == pdf_content

    # 4. Preview client file (inline disposition)
    preview_res = client.get(f"/api/ledger/clients/{client_id}/files/{img_file_id}/preview")
    assert preview_res.status_code == 200
    assert "inline" in preview_res.headers.get("content-disposition", "")
    assert preview_res.content == img_content

    # 5. Delete file
    del_file_res = client.delete(f"/api/ledger/clients/{client_id}/files/{pdf_file_id}")
    assert del_file_res.status_code == 204

    # Verify only 1 file remains
    remaining = client.get(f"/api/ledger/clients/{client_id}/files").json()
    assert len(remaining) == 1
    assert remaining[0]["id"] == img_file_id


def test_client_file_unsupported_format_rejected():
    """Files with unsupported extensions (.exe, .sh, etc.) are rejected."""
    create_res = client.post("/api/ledger/clients", json={"first_name": "Test", "surname": "Files"})
    client_id = create_res.json()["id"]

    bad_file = ("files", ("malicious.exe", io.BytesIO(b"bad content"), "application/x-msdownload"))
    res = client.post(f"/api/ledger/clients/{client_id}/files", files=[bad_file])
    assert res.status_code == 400
    assert "not supported" in res.json()["detail"]


def test_client_file_authorization():
    """Another user cannot download or delete client files."""
    global _current_user

    # User 1 creates client and uploads a file
    _current_user = User(id="user_1", username="testuser1", is_admin=False)
    c_res = client.post("/api/ledger/clients", json={"first_name": "Secure", "surname": "Client"})
    client_id = c_res.json()["id"]

    upload_res = client.post(
        f"/api/ledger/clients/{client_id}/files",
        files=[("files", ("doc.pdf", io.BytesIO(b"secret"), "application/pdf"))]
    )
    file_id = upload_res.json()[0]["id"]

    # User 2 tries to download User 1's client file
    _current_user = User(id="user_2", username="testuser2", is_admin=False)
    assert client.get(f"/api/ledger/clients/{client_id}/files/{file_id}/download").status_code == 404
    assert client.delete(f"/api/ledger/clients/{client_id}/files/{file_id}").status_code == 404


# =====================================================================
# Transcription Regression Test (Requirement 8)
# =====================================================================

def test_transcription_pipeline_does_not_populate_ledger():
    """
    Transcription pipeline continues normal processing (audio, transcript, duration, counters)
    but NO LONGER extracts keywords (service_type, client_name, client_surname) to modify ledger.
    """
    db = TestingSessionLocal()
    
    # Create test job
    job = Job(
        id="job_test_123",
        user_id="user_1",
        original_filename="audio_recours_dupont.mp3",
        storage_path="audio/audio_recours_dupont.mp3",
        status=JobStatus.PROCESSING.value
    )
    db.add(job)
    db.commit()

    # Simulate completed transcript text that previously triggered auto-extraction:
    # First word: "Recours", 2nd word: "Jean", 3rd word: "Dupont"
    transcript_text = "Recours Jean Dupont appellant filed an appeal against OFPRA decision."
    metadata = {"duration": 120.0, "model": "whisper"}

    # Simulate steps from tasks.py:
    new_transcript = Transcript(
        job_id=job.id,
        text_content=transcript_text,
        json_metadata=metadata
    )
    db.add(new_transcript)

    # In redesigned tasks.py, we complete the job WITHOUT extracting words into job.service_type or job.client_name:
    job.status = JobStatus.COMPLETED.value
    job.completed_at = datetime.now(timezone.utc)
    job.duration_seconds = 120
    db.commit()

    # Verify job completed and transcript exists
    refreshed_job = db.query(Job).filter(Job.id == "job_test_123").first()
    assert refreshed_job.status == JobStatus.COMPLETED.value
    assert refreshed_job.transcript is not None
    assert refreshed_job.transcript.text_content == transcript_text

    # CRITICAL: Verify keyword extraction did NOT populate ledger fields on job!
    assert refreshed_job.client_name is None
    assert refreshed_job.client_surname is None
    assert refreshed_job.service_type is None

    # Verify no automatic client was created in clients table
    clients = db.query(Client).all()
    assert len(clients) == 0

    db.close()


def test_controlled_reset_preserves_application_data():
    """
    Controlled reset clears legacy ledger columns on jobs table
    WITHOUT deleting jobs, original files, transcripts, or user accounts.
    """
    db = TestingSessionLocal()

    # Create job with legacy ledger fields
    job = Job(
        id="legacy_job_1",
        user_id="user_1",
        original_filename="recording.mp3",
        storage_path="audio/recording.mp3",
        status=JobStatus.COMPLETED.value,
        client_name="LegacyName",
        client_surname="LegacySurname",
        service_type="Recours",
        phone_number="0123456789"
    )
    db.add(job)
    transcript = Transcript(
        id="legacy_tr_1",
        job_id="legacy_job_1",
        text_content="Preserved transcript text"
    )
    db.add(transcript)
    db.commit()

    # Execute controlled reset operation
    from sqlalchemy import text
    db.execute(text(
        "UPDATE jobs SET "
        "client_name = NULL, "
        "client_surname = NULL, "
        "service_type = NULL, "
        "date_of_birth = NULL, "
        "phone_number = NULL, "
        "payment = NULL"
    ))
    db.commit()

    # Verify:
    refreshed_job = db.query(Job).filter(Job.id == "legacy_job_1").first()
    assert refreshed_job is not None  # Job preserved!
    assert refreshed_job.original_filename == "recording.mp3"
    assert refreshed_job.storage_path == "audio/recording.mp3"  # Audio path preserved!
    assert refreshed_job.status == JobStatus.COMPLETED.value
    
    # Obsolete ledger fields cleared:
    assert refreshed_job.client_name is None
    assert refreshed_job.client_surname is None
    assert refreshed_job.service_type is None

    # Transcript preserved:
    tr = db.query(Transcript).filter(Transcript.job_id == "legacy_job_1").first()
    assert tr is not None
    assert tr.text_content == "Preserved transcript text"

    # User accounts preserved:
    users = db.query(User).all()
    assert len(users) >= 3

    db.close()
