import os
import io
import uuid
import pytest
from datetime import datetime, timezone, date, timedelta
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

    mock_storage = MockStorageService()
    monkeypatch.setattr("app.api.ledger.storage_service", mock_storage)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    u1 = User(id="user_1", username="testuser1", email="user1@example.com", is_admin=False)
    u2 = User(id="user_2", username="testuser2", email="user2@example.com", is_admin=False)
    admin = User(id="admin_1", username="admin", email="admin@example.com", is_admin=True)
    db.add(u1)
    db.add(u2)
    db.add(admin)
    db.commit()
    db.close()
    yield


def valid_client_payload(**overrides):
    payload = {
        "surname": "SRIKARAN",
        "first_name": "Jean",
        "date_of_birth": "1990-05-15",
        "place_of_birth": "Jaffna",
        "birth_place": "Northern Province",
        "sp": "2024-01-01",
        "ef": "2024-06-01",
        "phone_number": "0763796000",
        "address": "15 Rue de la Paix",
        "ville": "Paris",
        "postal_code": "75001",
        "service_type": "OFPRA",
        "priority": "Normal",
        "status": "Inwarded",
        "nationality": "SRI LANKAISE"
    }
    payload.update(overrides)
    return payload


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
    """Client creation succeeds, converts surname to uppercase, and automatically derives Full Name."""
    payload = valid_client_payload(surname="srikaran", first_name="Jean", phone_number="0763796000")
    res = client.post("/api/ledger/clients", json=payload)
    assert res.status_code == 201
    data = res.json()
    
    assert data["surname"] == "SRIKARAN"
    assert data["first_name"] == "Jean"
    assert data["full_name"] == "SRIKARAN Jean"
    assert data["phone_number"] == "0763796000"
    assert data["reference_number"] == "SRIKARAN6000"
    assert data["created_by_id"] == "user_1"
    assert "id" in data

    # Verify visible in list
    list_res = client.get("/api/ledger/clients")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert list_data["items"][0]["full_name"] == "SRIKARAN Jean"
    assert list_data["items"][0]["reference_number"] == "SRIKARAN6000"


def test_reference_number_format_and_duplicate_handling():
    """Reference number format is SURNAME + LAST 4 DIGITS OF PHONE. Suffix added if duplicate."""
    # First client
    p1 = valid_client_payload(surname="SRIKARAN", phone_number="0763796000")
    res1 = client.post("/api/ledger/clients", json=p1)
    assert res1.status_code == 201
    assert res1.json()["reference_number"] == "SRIKARAN6000"

    # Second client with same surname and phone ending
    p2 = valid_client_payload(surname="SRIKARAN", phone_number="0145676000")
    res2 = client.post("/api/ledger/clients", json=p2)
    assert res2.status_code == 201
    assert res2.json()["reference_number"] == "SRIKARAN6000-1"

    # Third client
    p3 = valid_client_payload(surname="SRIKARAN", phone_number="0699996000")
    res3 = client.post("/api/ledger/clients", json=p3)
    assert res3.status_code == 201
    assert res3.json()["reference_number"] == "SRIKARAN6000-2"


def test_reference_number_immutable_on_patch():
    """Reference number cannot be changed even if surname or phone is updated."""
    p = valid_client_payload(surname="SRIKARAN", phone_number="0763796000")
    res = client.post("/api/ledger/clients", json=p)
    client_id = res.json()["id"]
    orig_ref = res.json()["reference_number"]
    assert orig_ref == "SRIKARAN6000"

    # Patch with new surname and phone
    patch_res = client.patch(f"/api/ledger/clients/{client_id}", json={
        "surname": "MOHAMED",
        "phone_number": "0711223344",
        "reference_number": "HACKED9999"
    })
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["surname"] == "MOHAMED"
    assert updated["phone_number"] == "0711223344"
    assert updated["reference_number"] == "SRIKARAN6000"  # Unchanged!


def test_client_creation_mandatory_fields_validation():
    """Validation rejects missing mandatory fields."""
    # Missing surname
    p1 = valid_client_payload(surname="")
    assert client.post("/api/ledger/clients", json=p1).status_code == 422

    # Missing first name
    p2 = valid_client_payload(first_name="")
    assert client.post("/api/ledger/clients", json=p2).status_code == 422

    # Missing date of birth
    p3 = valid_client_payload(date_of_birth="")
    assert client.post("/api/ledger/clients", json=p3).status_code == 422

    # Missing place of birth
    p4 = valid_client_payload(place_of_birth="")
    assert client.post("/api/ledger/clients", json=p4).status_code == 422

    # Missing birth place
    p5 = valid_client_payload(birth_place="")
    assert client.post("/api/ledger/clients", json=p5).status_code == 422

    # Missing sp
    p6 = valid_client_payload(sp="")
    assert client.post("/api/ledger/clients", json=p6).status_code == 422

    # Missing ef
    p7 = valid_client_payload(ef="")
    assert client.post("/api/ledger/clients", json=p7).status_code == 422

    # Missing phone number
    p8 = valid_client_payload(phone_number="")
    assert client.post("/api/ledger/clients", json=p8).status_code == 422

    # Missing address
    p9 = valid_client_payload(address="")
    assert client.post("/api/ledger/clients", json=p9).status_code == 422

    # Missing postal code
    p10 = valid_client_payload(postal_code="")
    assert client.post("/api/ledger/clients", json=p10).status_code == 422


def test_phone_validation():
    """Primary Phone must be exactly 10 digits and start with 0."""
    # Valid phone
    res_valid = client.post("/api/ledger/clients", json=valid_client_payload(phone_number="0763796000"))
    assert res_valid.status_code == 201

    # Invalid: 9 digits
    res_short = client.post("/api/ledger/clients", json=valid_client_payload(phone_number="076379600"))
    assert res_short.status_code == 422

    # Invalid: does not start with 0
    res_no_zero = client.post("/api/ledger/clients", json=valid_client_payload(phone_number="1763796000"))
    assert res_no_zero.status_code == 422

    # Invalid: international with plus
    res_intl = client.post("/api/ledger/clients", json=valid_client_payload(phone_number="+33612345678"))
    assert res_intl.status_code == 422

    # Secondary phone validation when provided
    res_sec_invalid = client.post("/api/ledger/clients", json=valid_client_payload(
        phone_number="0763796000",
        secondary_phone="12345"
    ))
    assert res_sec_invalid.status_code == 422

    res_sec_valid = client.post("/api/ledger/clients", json=valid_client_payload(
        phone_number="0763796000",
        secondary_phone="0611223344"
    ))
    assert res_sec_valid.status_code == 201


def test_postal_code_and_aps_validation():
    """Postal code must be exactly 5 numeric digits. APS must be 10 numeric digits."""
    # Invalid postal code
    res_bad_postal = client.post("/api/ledger/clients", json=valid_client_payload(postal_code="750"))
    assert res_bad_postal.status_code == 422

    res_alpha_postal = client.post("/api/ledger/clients", json=valid_client_payload(postal_code="7500A"))
    assert res_alpha_postal.status_code == 422

    # Invalid APS (not 10 digits)
    res_bad_aps = client.post("/api/ledger/clients", json=valid_client_payload(numero_aps="12345"))
    assert res_bad_aps.status_code == 422

    # Valid APS (10 digits)
    res_valid_aps = client.post("/api/ledger/clients", json=valid_client_payload(numero_aps="0123456789"))
    assert res_valid_aps.status_code == 201
    assert res_valid_aps.json()["numero_aps"] == "0123456789"


def test_future_dates_rejection():
    """Future dates are prohibited for Date of Birth, SP, EF, From, and To."""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    two_days_ago = (date.today() - timedelta(days=2)).isoformat()

    # Future DOB
    assert client.post("/api/ledger/clients", json=valid_client_payload(date_of_birth=tomorrow)).status_code == 422

    # Future SP
    assert client.post("/api/ledger/clients", json=valid_client_payload(sp=tomorrow)).status_code == 422

    # Future EF
    assert client.post("/api/ledger/clients", json=valid_client_payload(ef=tomorrow)).status_code == 422

    # From and To dates: To must not be earlier than From
    assert client.post("/api/ledger/clients", json=valid_client_payload(
        from_date=yesterday,
        to_date=two_days_ago
    )).status_code == 422

    # Valid From and To
    res_dates = client.post("/api/ledger/clients", json=valid_client_payload(
        from_date=two_days_ago,
        to_date=yesterday
    ))
    assert res_dates.status_code == 201


def test_inline_editing_save_and_cancel():
    """Inline editing: PATCH persists changes, changes to either name component updates full_name."""
    res = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Pierre",
        surname="MARTIN",
        phone_number="0600000000"
    ))
    client_id = res.json()["id"]

    # 1. Update First Name -> derived full_name updates
    patch_res1 = client.patch(f"/api/ledger/clients/{client_id}", json={
        "first_name": "Alexandre"
    })
    assert patch_res1.status_code == 200
    assert patch_res1.json()["first_name"] == "Alexandre"
    assert patch_res1.json()["full_name"] == "MARTIN Alexandre"

    # 2. Update Surname -> derived full_name updates
    patch_res2 = client.patch(f"/api/ledger/clients/{client_id}", json={
        "surname": "Dubois",
        "phone_number": "0711223344"
    })
    assert patch_res2.status_code == 200
    assert patch_res2.json()["surname"] == "DUBOIS"
    assert patch_res2.json()["full_name"] == "DUBOIS Alexandre"
    assert patch_res2.json()["phone_number"] == "0711223344"

    # 3. Verify changes persisted in database
    get_res = client.get(f"/api/ledger/clients/{client_id}")
    assert get_res.status_code == 200
    assert get_res.json()["first_name"] == "Alexandre"
    assert get_res.json()["surname"] == "DUBOIS"
    assert get_res.json()["full_name"] == "DUBOIS Alexandre"


def test_client_search_and_filters():
    """Ledger search matches reference_number, name, phone, email, and filters by service, priority, status."""
    c1 = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Ahmed",
        surname="KHAN",
        phone_number="0712345678",
        email="ahmed@example.com",
        service_type="OFPRA",
        priority="Urgent",
        status="On Process"
    )).json()

    c2 = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Marie",
        surname="CURIE",
        phone_number="0140000000",
        email="marie@sorbonne.fr",
        service_type="RECOURS",
        priority="Normal",
        status="Ready to delivered"
    )).json()

    # Search by first name
    res1 = client.get("/api/ledger/clients?search=Ahmed")
    assert res1.json()["total"] == 1
    assert res1.json()["items"][0]["first_name"] == "Ahmed"

    # Search by surname
    res2 = client.get("/api/ledger/clients?search=CURIE")
    assert res2.json()["total"] == 1
    assert res2.json()["items"][0]["surname"] == "CURIE"

    # Search by reference number
    ref_ahmed = c1["reference_number"]
    res_ref = client.get(f"/api/ledger/clients?search={ref_ahmed}")
    assert res_ref.json()["total"] == 1
    assert res_ref.json()["items"][0]["id"] == c1["id"]

    # Filter by service_type
    res_filter_st = client.get("/api/ledger/clients?service_type=RECOURS")
    assert res_filter_st.json()["total"] == 1
    assert res_filter_st.json()["items"][0]["first_name"] == "Marie"

    # Filter by priority
    res_filter_pr = client.get("/api/ledger/clients?priority=Urgent")
    assert res_filter_pr.json()["total"] == 1
    assert res_filter_pr.json()["items"][0]["first_name"] == "Ahmed"

    # Filter by status
    res_filter_status = client.get("/api/ledger/clients?status=Ready to delivered")
    assert res_filter_status.json()["total"] == 1
    assert res_filter_status.json()["items"][0]["status"] == "Ready to delivered"


def test_assignable_users_and_client_assignment():
    """Assignable users endpoint lists eligible users and clients can be assigned."""
    users_res = client.get("/api/ledger/users")
    assert users_res.status_code == 200
    user_list = users_res.json()
    assert len(user_list) >= 2
    u2_id = next(u["id"] for u in user_list if u["username"] == "testuser2")

    # Create client assigned to user 2
    c_res = client.post("/api/ledger/clients", json=valid_client_payload(
        assigned_to_id=u2_id
    ))
    assert c_res.status_code == 201
    created = c_res.json()
    assert created["assigned_to_id"] == u2_id
    assert created["assigned_to_name"] == "testuser2"

    # Filter clients by assigned_to_id
    filter_res = client.get(f"/api/ledger/clients?assigned_to_id={u2_id}")
    assert filter_res.status_code == 200
    assert filter_res.json()["total"] == 1


def test_remarks_rich_text_sanitization_and_persistence():
    """Remarks field accepts HTML formatted text and sanitizes malicious script tags."""
    html_input = '<p><b>Important Case:</b> Hearing on <i>Friday</i>.<script>alert("XSS")</script></p>'
    res = client.post("/api/ledger/clients", json=valid_client_payload(remarks=html_input))
    assert res.status_code == 201
    client_data = res.json()
    
    # Script tag must be sanitized out
    assert "<script>" not in client_data["remarks"]
    assert 'alert("XSS")' not in client_data["remarks"]
    # Safe tags preserved
    assert "<b>Important Case:</b>" in client_data["remarks"]
    assert "<i>Friday</i>" in client_data["remarks"]


def test_family_sections_e_to_h():
    """Sections E (Parents), F (Siblings), G (Epouse), H (Kids) are optional and persist accurately."""
    family_payload = valid_client_payload(
        parents_details={
            "father_name": "Arul SRIKARAN",
            "mother_name": "Devi SRIKARAN",
            "notes": "Living in Jaffna"
        },
        siblings=[
            {"name": "Rajan SRIKARAN", "relationship": "Brother", "gender": "Male", "date_of_birth": "1992-03-10"},
            {"name": "Priya SRIKARAN", "relationship": "Sister", "gender": "Female", "date_of_birth": "1995-07-22"}
        ],
        epouse={
            "name": "Kamala SRIKARAN",
            "maiden_name": "PERERA",
            "date_of_birth": "1993-11-05",
            "marriage_date": "2018-06-20",
            "marriage_place": "Colombo",
            "nationality": "SRI LANKAISE"
        },
        kids=[
            {"name": "Anan SRIKARAN", "gender": "Male", "date_of_birth": "2020-04-12", "place_of_birth": "Paris"}
        ]
    )

    create_res = client.post("/api/ledger/clients", json=family_payload)
    assert create_res.status_code == 201
    client_id = create_res.json()["id"]

    # Verify retrieval
    get_res = client.get(f"/api/ledger/clients/{client_id}")
    assert get_res.status_code == 200
    data = get_res.json()

    assert data["parents_details"]["father_name"] == "Arul SRIKARAN"
    assert len(data["siblings"]) == 2
    assert data["siblings"][0]["name"] == "Rajan SRIKARAN"
    assert data["epouse"]["name"] == "Kamala SRIKARAN"
    assert len(data["kids"]) == 1
    assert data["kids"][0]["name"] == "Anan SRIKARAN"

    # Add child and update via PATCH
    updated_kids = data["kids"] + [
        {"name": "Nila SRIKARAN", "gender": "Female", "date_of_birth": "2022-09-18", "place_of_birth": "Paris"}
    ]
    patch_res = client.patch(f"/api/ledger/clients/{client_id}", json={"kids": updated_kids})
    assert patch_res.status_code == 200
    assert len(patch_res.json()["kids"]) == 2


def test_client_authorization_and_data_isolation():
    """Users cannot view, edit, or delete another user's client records; Admin can access all."""
    global _current_user

    # User 1 creates client
    _current_user = User(id="user_1", username="testuser1", is_admin=False)
    create_res = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Private",
        surname="CLIENT"
    ))
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
    """Client deletion removes record from database."""
    res = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Delete",
        surname="ME"
    ))
    client_id = res.json()["id"]

    del_res = client.delete(f"/api/ledger/clients/{client_id}")
    assert del_res.status_code == 204

    # Record no longer exists
    assert client.get(f"/api/ledger/clients/{client_id}").status_code == 404


def test_client_file_upload_download_preview_and_delete():
    """Multi-file upload, listing, preview, download, and deletion work securely."""
    create_res = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Document",
        surname="OWNER"
    ))
    client_id = create_res.json()["id"]

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

    # List files
    list_files_res = client.get(f"/api/ledger/clients/{client_id}/files")
    assert list_files_res.status_code == 200
    assert len(list_files_res.json()) == 2

    # Download
    dl_res = client.get(f"/api/ledger/clients/{client_id}/files/{pdf_file_id}/download")
    assert dl_res.status_code == 200
    assert "attachment" in dl_res.headers.get("content-disposition", "")
    assert dl_res.content == pdf_content

    # Preview
    preview_res = client.get(f"/api/ledger/clients/{client_id}/files/{img_file_id}/preview")
    assert preview_res.status_code == 200
    assert "inline" in preview_res.headers.get("content-disposition", "")
    assert preview_res.content == img_content

    # Delete
    del_file_res = client.delete(f"/api/ledger/clients/{client_id}/files/{pdf_file_id}")
    assert del_file_res.status_code == 204
    remaining = client.get(f"/api/ledger/clients/{client_id}/files").json()
    assert len(remaining) == 1
    assert remaining[0]["id"] == img_file_id


def test_client_file_unsupported_format_rejected():
    """Files with unsupported extensions are rejected."""
    create_res = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Test",
        surname="FILES"
    ))
    client_id = create_res.json()["id"]

    bad_file = ("files", ("malicious.exe", io.BytesIO(b"bad content"), "application/x-msdownload"))
    res = client.post(f"/api/ledger/clients/{client_id}/files", files=[bad_file])
    assert res.status_code == 400
    assert "not supported" in res.json()["detail"]


def test_client_file_authorization():
    """Another user cannot download or delete client files."""
    global _current_user

    _current_user = User(id="user_1", username="testuser1", is_admin=False)
    c_res = client.post("/api/ledger/clients", json=valid_client_payload(
        first_name="Secure",
        surname="CLIENT"
    ))
    client_id = c_res.json()["id"]

    upload_res = client.post(
        f"/api/ledger/clients/{client_id}/files",
        files=[("files", ("doc.pdf", io.BytesIO(b"secret"), "application/pdf"))]
    )
    file_id = upload_res.json()[0]["id"]

    _current_user = User(id="user_2", username="testuser2", is_admin=False)
    assert client.get(f"/api/ledger/clients/{client_id}/files/{file_id}/download").status_code == 404
    assert client.delete(f"/api/ledger/clients/{client_id}/files/{file_id}").status_code == 404


def test_transcription_pipeline_does_not_populate_ledger():
    """Transcription pipeline completes jobs without polluting ledger tables."""
    db = TestingSessionLocal()
    
    job = Job(
        id="job_test_123",
        user_id="user_1",
        original_filename="audio_recours_dupont.mp3",
        storage_path="audio/audio_recours_dupont.mp3",
        status=JobStatus.PROCESSING.value
    )
    db.add(job)
    db.commit()

    transcript_text = "Recours Jean Dupont appellant filed an appeal against OFPRA decision."
    metadata = {"duration": 120.0, "model": "whisper"}

    new_transcript = Transcript(
        job_id=job.id,
        text_content=transcript_text,
        json_metadata=metadata
    )
    db.add(new_transcript)

    job.status = JobStatus.COMPLETED.value
    job.completed_at = datetime.now(timezone.utc)
    job.duration_seconds = 120
    db.commit()

    refreshed_job = db.query(Job).filter(Job.id == "job_test_123").first()
    assert refreshed_job.status == JobStatus.COMPLETED.value
    assert refreshed_job.transcript is not None
    assert refreshed_job.transcript.text_content == transcript_text

    assert refreshed_job.client_name is None
    assert refreshed_job.client_surname is None
    assert refreshed_job.service_type is None

    clients = db.query(Client).all()
    assert len(clients) == 0
    db.close()
