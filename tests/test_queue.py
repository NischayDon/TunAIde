import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid
from datetime import datetime, timezone

from app.main import app
from app.db.base import Base, get_db
from app.db.models import AudioQueueItem, AudioQueueStatus, User
from app.api.auth import get_current_user

# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_user():
    return User(id="test_user", username="test", is_admin=False)

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Add an AP-originated queue item
    ap_item = AudioQueueItem(
        id="e97ebc93-ecdc-4cf8-a5ef-ccea77fea553",
        source="tunaide_ap",
        source_upload_id="b61984b0-266c-4457-8b47-52c6201d6876",
        title="AP Audio Test",
        artist="AP Artist",
        original_filename="ap_audio.wav",
        storage_path="path/to/ap_audio.wav",
        duration_seconds=1110,
        status=AudioQueueStatus.AVAILABLE.value,
        uploaded_at=datetime.now(timezone.utc)
    )
    
    # Add a normal queue item
    normal_item = AudioQueueItem(
        id=str(uuid.uuid4()),
        original_filename="normal_audio.wav",
        storage_path="path/to/normal.wav",
        duration_seconds=120,
        status=AudioQueueStatus.AVAILABLE.value,
        uploaded_at=datetime.now(timezone.utc)
    )
    
    # Add a claimed queue item (should not be returned)
    claimed_item = AudioQueueItem(
        id=str(uuid.uuid4()),
        original_filename="claimed.wav",
        storage_path="path/to/claimed.wav",
        status=AudioQueueStatus.CLAIMED.value,
        uploaded_at=datetime.now(timezone.utc)
    )

    db.add(ap_item)
    db.add(normal_item)
    db.add(claimed_item)
    
    # Setup test user for claim test
    test_user = override_get_current_user()
    db.add(test_user)
    
    db.commit()
    db.close()
    yield

def test_get_queue_items():
    response = client.get("/queue/")
    
    # 1. GET /queue/ returns 200
    assert response.status_code == 200
    
    data = response.json()
    assert "items" in data
    assert "total" in data
    
    items = data["items"]
    
    # 2. AVAILABLE items are visible (AP + normal)
    assert len(items) == 2
    assert data["total"] == 2
    
    # 3. AP-originated queue items are returned
    ap_items = [item for item in items if item["source"] == "tunaide_ap"]
    assert len(ap_items) == 1
    
    ap_item = ap_items[0]
    
    # 4. Queue item e97ebc93-ecdc-4cf8-a5ef-ccea77fea553 is returned
    assert ap_item["id"] == "e97ebc93-ecdc-4cf8-a5ef-ccea77fea553"
    assert ap_item["source_upload_id"] == "b61984b0-266c-4457-8b47-52c6201d6876"
    assert ap_item["title"] == "AP Audio Test"
    assert ap_item["duration_seconds"] == 1110
    
    # 5. Existing queue items remain visible
    normal_items = [item for item in items if item["source"] is None]
    assert len(normal_items) == 1

def test_queue_item_claim():
    # Claim the AP-originated item
    response = client.post("/queue/e97ebc93-ecdc-4cf8-a5ef-ccea77fea553/claim")
    
    # Claiming should succeed
    assert response.status_code == 200
    data = response.json()
    assert data["queue_item_id"] == "e97ebc93-ecdc-4cf8-a5ef-ccea77fea553"
    assert "job_id" in data
    assert data["status"] == "QUEUED"
    
    # Item should no longer be available in the queue
    queue_response = client.get("/queue/")
    assert queue_response.status_code == 200
    queue_data = queue_response.json()
    
    assert queue_data["total"] == 1
    assert queue_data["items"][0]["id"] != "e97ebc93-ecdc-4cf8-a5ef-ccea77fea553"
