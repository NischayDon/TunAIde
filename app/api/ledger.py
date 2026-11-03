import re
import urllib.parse
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.db.base import get_db
from app.db.models import User, Client, ClientFile
from app.api.auth import get_current_user
from app.schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
    ClientFileResponse,
)
from app.services.storage import storage_service

router = APIRouter()

ALLOWED_FILE_EXTENSIONS = {
    "pdf", "doc", "docx",
    "jpg", "jpeg", "png",
    "mp3", "mp4", "wav", "m4a"
}

MIME_TYPE_MAP = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "mp3": "audio/mpeg",
    "mp4": "video/mp4",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def get_content_disposition(filename: str, disposition_type: str = "attachment") -> str:
    """Generate RFC 6266 / RFC 5987 compliant Content-Disposition header."""
    clean_name = filename.replace('"', '').replace('\r', '').replace('\n', '')
    ascii_name = clean_name.encode('ascii', 'ignore').decode('ascii') or 'download'
    encoded_name = urllib.parse.quote(clean_name, encoding='utf-8')
    return f"{disposition_type}; filename=\"{ascii_name}\"; filename*=UTF-8''{encoded_name}"


def get_client_or_404(db: Session, client_id: str, user: User) -> Client:
    query = db.query(Client).filter(Client.id == client_id)
    if not user.is_admin:
        query = query.filter(Client.created_by_id == user.id)
    client = query.first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found or you do not have permission to access this record."
        )
    return client


def validate_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    phone_clean = phone.strip()
    if not phone_clean:
        return None
    # Validate flexible international format without assuming Indian or any specific country
    if not re.match(r'^[+]?[0-9\s\-\(\)\.]{4,25}$', phone_clean):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid phone number format. Please provide a valid international or local phone number."
        )
    return phone_clean


@router.get("/clients", response_model=ClientListResponse)
def list_clients(
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List clients with search and pagination."""
    query = db.query(Client)
    if not user.is_admin:
        query = query.filter(Client.created_by_id == user.id)

    if search:
        search_term = f"%{search.strip()}%"
        # Search by first name, surname, full name, phone number, or email
        query = query.filter(
            or_(
                Client.first_name.ilike(search_term),
                Client.surname.ilike(search_term),
                (Client.first_name + " " + Client.surname).ilike(search_term),
                (Client.surname + " " + Client.first_name).ilike(search_term),
                Client.phone_number.ilike(search_term),
                Client.email.ilike(search_term),
            )
        )

    total = query.count()
    clients = query.order_by(desc(Client.created_at)).offset(offset).limit(limit).all()

    return {"items": clients, "total": total}


@router.post("/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new client record."""
    first_name = (client_data.first_name or "").strip()
    surname = (client_data.surname or "").strip()

    if not first_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="First name is required."
        )
    if not surname:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Surname is required."
        )

    phone_number = validate_phone(client_data.phone_number)

    client = Client(
        created_by_id=user.id,
        first_name=first_name,
        surname=surname,
        phone_number=phone_number,
        date_of_birth=client_data.date_of_birth.strip() if client_data.date_of_birth else None,
        # Section A
        gender=client_data.gender,
        nationality=client_data.nationality,
        place_of_birth=client_data.place_of_birth,
        current_country=client_data.current_country,
        marital_status=client_data.marital_status,
        preferred_language=client_data.preferred_language,
        # Section B
        secondary_phone=validate_phone(client_data.secondary_phone),
        email=client_data.email.strip() if client_data.email else None,
        address=client_data.address,
        previous_address=client_data.previous_address,
        country=client_data.country,
        state_province=client_data.state_province,
        city=client_data.city,
        postal_code=client_data.postal_code,
        # Sections C-F
        identification_info=client_data.identification_info or {},
        case_info=client_data.case_info or {},
        background_info=client_data.background_info or {},
        additional_info=client_data.additional_info or {},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/clients/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get full details of a specific client."""
    return get_client_or_404(db, client_id, user)


@router.patch("/clients/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    update_data: ClientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update client fields or profile sections."""
    client = get_client_or_404(db, client_id, user)

    data_dict = update_data.model_dump(exclude_unset=True)

    # Validate names if updated
    if "first_name" in data_dict:
        fn = (data_dict["first_name"] or "").strip()
        if not fn:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="First name cannot be empty.")
        client.first_name = fn
        del data_dict["first_name"]

    if "surname" in data_dict:
        sn = (data_dict["surname"] or "").strip()
        if not sn:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Surname cannot be empty.")
        client.surname = sn
        del data_dict["surname"]

    if "phone_number" in data_dict:
        client.phone_number = validate_phone(data_dict["phone_number"])
        del data_dict["phone_number"]

    if "secondary_phone" in data_dict:
        client.secondary_phone = validate_phone(data_dict["secondary_phone"])
        del data_dict["secondary_phone"]

    # Handle structured JSON fields with dictionary merge
    for json_col in ["identification_info", "case_info", "background_info", "additional_info"]:
        if json_col in data_dict and data_dict[json_col] is not None:
            existing = dict(getattr(client, json_col) or {})
            existing.update(data_dict[json_col])
            setattr(client, json_col, existing)
            del data_dict[json_col]

    # Update remaining scalar columns
    for key, val in data_dict.items():
        if hasattr(client, key):
            setattr(client, key, val)

    client.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a client and all associated files from storage and database."""
    client = get_client_or_404(db, client_id, user)

    # Remove all files from S3/storage
    for file_record in client.files:
        try:
            storage_service.delete_file(file_record.storage_path)
        except Exception as e:
            print(f"Warning: Failed to delete file {file_record.storage_path} from storage: {e}")

    db.delete(client)
    db.commit()
    return


@router.post("/clients/{client_id}/files", response_model=List[ClientFileResponse], status_code=status.HTTP_201_CREATED)
async def upload_client_files(
    client_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload one or more files for a client."""
    client = get_client_or_404(db, client_id, user)
    uploaded_records: List[ClientFile] = []

    for file in files:
        if not file.filename:
            continue

        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_FILE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '.{ext}' is not supported. Supported: {', '.join(sorted(ALLOWED_FILE_EXTENSIONS))}"
            )

        # Check file size
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)

        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{file.filename}' exceeds maximum allowed size of 50MB."
            )

        mime_type = file.content_type or MIME_TYPE_MAP.get(ext, "application/octet-stream")

        try:
            storage_path = storage_service.save_file(file.file, file.filename)
        except Exception as e:
            print(f"Error saving file {file.filename} to storage: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload '{file.filename}' to storage: {str(e)}"
            )

        client_file = ClientFile(
            client_id=client.id,
            original_filename=file.filename,
            storage_path=storage_path,
            mime_type=mime_type,
            file_size_bytes=size,
            uploaded_by_id=user.id,
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(client_file)
        uploaded_records.append(client_file)

    db.commit()
    for rec in uploaded_records:
        db.refresh(rec)

    return uploaded_records


@router.get("/clients/{client_id}/files", response_model=List[ClientFileResponse])
def list_client_files(
    client_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all files belonging to a client."""
    client = get_client_or_404(db, client_id, user)
    return client.files


@router.get("/clients/{client_id}/files/{file_id}/download")
def download_client_file(
    client_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Download a client file."""
    client = get_client_or_404(db, client_id, user)
    file_record = db.query(ClientFile).filter(
        ClientFile.id == file_id,
        ClientFile.client_id == client.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    file_path = storage_service.download_to_temp(file_record.storage_path)

    def iterfile():
        with open(file_path, "rb") as f:
            yield from f

    ext = file_record.original_filename.rsplit(".", 1)[-1].lower() if "." in file_record.original_filename else ""
    media_type = file_record.mime_type or MIME_TYPE_MAP.get(ext, "application/octet-stream")

    return StreamingResponse(
        iterfile(),
        media_type=media_type,
        headers={"Content-Disposition": get_content_disposition(file_record.original_filename, "attachment")}
    )


@router.get("/clients/{client_id}/files/{file_id}/preview")
def preview_client_file(
    client_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Preview a client file (inline disposition)."""
    client = get_client_or_404(db, client_id, user)
    file_record = db.query(ClientFile).filter(
        ClientFile.id == file_id,
        ClientFile.client_id == client.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    file_path = storage_service.download_to_temp(file_record.storage_path)

    def iterfile():
        with open(file_path, "rb") as f:
            yield from f

    ext = file_record.original_filename.rsplit(".", 1)[-1].lower() if "." in file_record.original_filename else ""
    media_type = file_record.mime_type or MIME_TYPE_MAP.get(ext, "application/octet-stream")

    return StreamingResponse(
        iterfile(),
        media_type=media_type,
        headers={"Content-Disposition": get_content_disposition(file_record.original_filename, "inline")}
    )


@router.delete("/clients/{client_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_file(
    client_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a client file from storage and database."""
    client = get_client_or_404(db, client_id, user)
    file_record = db.query(ClientFile).filter(
        ClientFile.id == file_id,
        ClientFile.client_id == client.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    # Delete from object storage
    try:
        storage_service.delete_file(file_record.storage_path)
    except Exception as e:
        print(f"Warning: Failed to delete file {file_record.storage_path} from storage: {e}")

    db.delete(file_record)
    db.commit()
    return

