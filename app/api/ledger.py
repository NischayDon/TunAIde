import re
import urllib.parse
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from sqlalchemy.exc import IntegrityError

from app.db.base import get_db
from app.db.models import User, Client, ClientFile
from app.api.auth import get_current_user
from app.schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
    ClientFileResponse,
    UserAssigneeResponse,
    SERVICE_TYPES,
    PRIORITIES,
    STATUSES,
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


# =====================================================================
# Validation and Data Integrity Helpers
# =====================================================================

def validate_alphabets(val: Optional[str], field_name: str, required: bool = False) -> Optional[str]:
    """Validate that field contains only alphabets, spaces, hyphens, or apostrophes."""
    if val is None or not str(val).strip():
        if required:
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} is required."
            )
        return None
    cleaned = str(val).strip()
    # Support letters (including accents like é, è, etc.), spaces, hyphens, and apostrophes
    if not re.match(r"^[A-Za-zÀ-ÿ\s\-']+$", cleaned):
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must contain alphabets only."
        )
    return cleaned


def validate_surname(val: Optional[str], required: bool = True) -> str:
    """Surname: Required, alphabets only, automatically converted to uppercase."""
    cleaned = validate_alphabets(val, "Surname", required=required)
    return cleaned.upper() if cleaned else ""


def validate_first_name(val: Optional[str], required: bool = True) -> str:
    """First Name: Required, alphabets only."""
    cleaned = validate_alphabets(val, "First Name", required=required)
    return cleaned if cleaned else ""


def validate_date(
    val: Optional[str],
    field_name: str,
    required: bool = False,
    allow_future: bool = False
) -> Optional[str]:
    """Validate date format and ensure it is not in the future when prohibited."""
    if val is None or not str(val).strip():
        if required:
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} is required."
            )
        return None
    raw = str(val).strip()
    parsed_date = None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d%m%Y", "%Y/%m/%d"):
        try:
            parsed_date = datetime.strptime(raw, fmt).date()
            break
        except ValueError:
            continue

    if not parsed_date:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid date format for {field_name}."
        )

    if not allow_future:
        today = datetime.now(timezone.utc).date()
        if parsed_date > today:
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} cannot be a future date."
            )

    return parsed_date.strftime("%Y-%m-%d")


def validate_date_range(from_d: Optional[str], to_d: Optional[str]) -> None:
    """Validate that To date is not earlier than From date."""
    if from_d and to_d:
        if to_d < from_d:
            raise HTTPException(
                status_code=422,
                detail="'To' date cannot precede 'From' date."
            )


def validate_primary_phone(val: Optional[str], required: bool = True) -> Optional[str]:
    """Primary Phone: Required, exactly 10 numeric digits, must start with 0."""
    if val is None or not str(val).strip():
        if required:
            raise HTTPException(
                status_code=422,
                detail="Primary Phone is required."
            )
        return None
    cleaned = str(val).strip()
    if not re.match(r"^0\d{9}$", cleaned):
        raise HTTPException(
            status_code=422,
            detail="Primary Phone must be exactly 10 digits and start with 0."
        )
    return cleaned


def validate_secondary_phone(val: Optional[str]) -> Optional[str]:
    """Secondary Phone: Optional, if entered: exactly 10 digits, must start with 0."""
    if val is None or not str(val).strip():
        return None
    cleaned = str(val).strip()
    if not re.match(r"^0\d{9}$", cleaned):
        raise HTTPException(
            status_code=422,
            detail="Secondary Phone must be exactly 10 digits and start with 0."
        )
    return cleaned


def validate_numero_aps(val: Optional[str]) -> Optional[str]:
    """Numéro APS: Optional, exactly 10 numeric digits if entered."""
    if val is None or not str(val).strip():
        return None
    cleaned = str(val).strip()
    if not re.match(r"^\d{10}$", cleaned):
        raise HTTPException(
            status_code=422,
            detail="Numéro APS must be exactly 10 digits."
        )
    return cleaned


def validate_postal_code(val: Optional[str], required: bool = True) -> Optional[str]:
    """Postal Code: Required, exactly 5 numeric digits."""
    if val is None or not str(val).strip():
        if required:
            raise HTTPException(
                status_code=422,
                detail="Postal Code is required."
            )
        return None
    cleaned = str(val).strip()
    if not re.match(r"^\d{5}$", cleaned):
        raise HTTPException(
            status_code=422,
            detail="Postal Code must be exactly 5 digits."
        )
    return cleaned


def validate_email(val: Optional[str]) -> Optional[str]:
    """Email: Optional, valid email format."""
    if val is None or not str(val).strip():
        return None
    cleaned = str(val).strip()
    if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", cleaned):
        raise HTTPException(
            status_code=422,
            detail="Invalid email address format."
        )
    return cleaned


def validate_enum_choice(val: Optional[str], valid_choices: list, field_name: str, required: bool = False) -> Optional[str]:
    """Validate dropdown choice against standard choices."""
    if not val or not str(val).strip():
        if required:
            raise HTTPException(status_code=422, detail=f"{field_name} is required.")
        return None
    val_clean = str(val).strip()
    if val_clean not in valid_choices:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name}. Must be one of: {', '.join(valid_choices)}"
        )
    return val_clean


def sanitize_html(val: Optional[str]) -> Optional[str]:
    """Sanitize HTML rich text content to prevent XSS attacks while preserving formatting."""
    if not val:
        return None
    content = str(val)
    # Strip script, style, iframe, object, embed, form, input tags and their contents
    clean = re.sub(
        r'<(script|style|iframe|object|embed|form|input)[^>]*>.*?</\1>',
        '',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    clean = re.sub(
        r'<(script|style|iframe|object|embed|form|input)[^>]*>',
        '',
        clean,
        flags=re.IGNORECASE
    )
    # Strip inline javascript event handlers
    clean = re.sub(r'\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', '', clean, flags=re.IGNORECASE)
    # Neutralize javascript: href/src
    clean = re.sub(
        r'(href|src)\s*=\s*("javascript:[^"]*"|\'javascript:[^\']*\'|javascript:[^\s>]+)',
        '\\1="#"',
        clean,
        flags=re.IGNORECASE
    )
    return clean.strip()


def generate_client_reference(db: Session, surname: str, phone: Optional[str], attempt: int = 0) -> str:
    """
    Generate automatic unique reference number:
    SURNAME + LAST 4 DIGITS OF PHONE NUMBER
    e.g. SRIKARAN + 0763796000 -> SRIKARAN6000
    Handles duplicates safely by appending suffix: SRIKARAN6000-1, SRIKARAN6000-2, etc.
    """
    clean_surname = re.sub(r'[^A-Za-z]', '', surname or '').upper()
    if not clean_surname:
        clean_surname = "CLIENT"

    digits = re.sub(r'\D', '', phone or '')
    phone_last4 = digits[-4:] if len(digits) >= 4 else (digits.zfill(4) if digits else "0000")

    base_ref = f"{clean_surname}{phone_last4}"

    if attempt == 0:
        existing = db.query(Client.reference_number).filter(Client.reference_number == base_ref).first()
        if not existing:
            return base_ref

    # Query all existing references matching base_ref
    pattern = f"{base_ref}%"
    existing_refs = {
        r[0] for r in db.query(Client.reference_number).filter(Client.reference_number.like(pattern)).all()
        if r[0]
    }

    if base_ref not in existing_refs and attempt == 0:
        return base_ref

    suffix = 1 + attempt
    while f"{base_ref}-{suffix}" in existing_refs:
        suffix += 1

    return f"{base_ref}-{suffix}"


# =====================================================================
# Users List Endpoint for Client Assignment Dropdown
# =====================================================================

@router.get("/users", response_model=List[UserAssigneeResponse])
def list_assignable_users(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all eligible users from user-management system for client assignment."""
    users = db.query(User).filter(User.username != None).order_by(User.username).all()
    return [{"id": u.id, "username": u.username, "email": u.email} for u in users]


# =====================================================================
# Ledger Clients Endpoints
# =====================================================================

@router.get("/clients", response_model=ClientListResponse)
def list_clients(
    search: Optional[str] = Query(None, description="Search by name, phone, email, ref #, ville"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    assigned_to_id: Optional[str] = Query(None, description="Filter by assigned user id"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List clients with filtering, search, and pagination."""
    query = db.query(Client)
    if not user.is_admin:
        query = query.filter(Client.created_by_id == user.id)

    # Filter by Service Type
    if service_type and service_type.strip():
        query = query.filter(Client.service_type == service_type.strip())

    # Filter by Priority
    if priority and priority.strip():
        query = query.filter(Client.priority == priority.strip())

    # Filter by Status
    if status_filter and status_filter.strip():
        query = query.filter(Client.status == status_filter.strip())

    # Filter by Assigned User
    if assigned_to_id and assigned_to_id.strip():
        query = query.filter(Client.assigned_to_id == assigned_to_id.strip())

    # Search filter
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Client.first_name.ilike(search_term),
                Client.surname.ilike(search_term),
                (Client.first_name + " " + Client.surname).ilike(search_term),
                (Client.surname + " " + Client.first_name).ilike(search_term),
                Client.phone_number.ilike(search_term),
                Client.secondary_phone.ilike(search_term),
                Client.email.ilike(search_term),
                Client.reference_number.ilike(search_term),
                Client.numero_ofpra.ilike(search_term),
                Client.numero_aps.ilike(search_term),
                Client.ville.ilike(search_term),
                Client.address.ilike(search_term),
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
    """
    Create a new client record with full validation, default values,
    and automatic concurrency-safe unique Ref # generation.
    """
    # 1. Section A: Personal Information validation
    surname = validate_surname(client_data.surname, required=True)
    first_name = validate_first_name(client_data.first_name, required=True)
    date_of_birth = validate_date(client_data.date_of_birth, "Date of Birth", required=True, allow_future=False)
    place_of_birth = validate_alphabets(client_data.place_of_birth, "Place of Birth", required=True)
    birth_place = validate_alphabets(client_data.birth_place, "Birth Place", required=True)
    sp = validate_date(client_data.sp, "SP", required=True, allow_future=False)
    ef = validate_date(client_data.ef, "EF", required=True, allow_future=False)
    gender = client_data.gender
    nationality = validate_alphabets(client_data.nationality, "Nationality", required=False) or "SRI LANKAISE"
    marital_status = client_data.marital_status
    personal_country = validate_alphabets(client_data.personal_country or client_data.country, "Country", required=False)

    # 2. Section B: Identification / OFPRA Information validation
    numero_ofpra = (client_data.numero_ofpra or "").strip() or None
    numero_aps = validate_numero_aps(client_data.numero_aps)
    from_date = validate_date(client_data.from_date, "From", required=False, allow_future=False)
    to_date = validate_date(client_data.to_date, "To", required=False, allow_future=False)
    validate_date_range(from_date, to_date)
    delivered_by = (client_data.delivered_by or "").strip() or None

    # 3. Section C: Contact Information validation
    phone_number = validate_primary_phone(client_data.phone_number, required=True)
    secondary_phone = validate_secondary_phone(client_data.secondary_phone)
    email = validate_email(client_data.email)
    address = (client_data.address or "").strip()
    if not address:
        raise HTTPException(status_code=422, detail="Address is required.")
    
    ville = (client_data.ville or client_data.city or "").strip()
    if not ville:
        raise HTTPException(status_code=422, detail="Ville is required.")
    
    postal_code = validate_postal_code(client_data.postal_code, required=True)
    contact_country = (client_data.country or "").strip() or None

    # 4. Section D: Remarks validation & sanitization
    remarks = sanitize_html(client_data.remarks)

    # 5. Header / Workflow fields
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    client_date = validate_date(client_data.client_date, "Date", required=False, allow_future=True) or today_str
    service_type = (client_data.service_type or "").strip() or None
    priority = (client_data.priority or "Normal").strip()
    status_val = (client_data.status or "Inwarded").strip()
    assigned_to_id = client_data.assigned_to_id or None
    if assigned_to_id:
        assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
        if not assigned_user:
            assigned_to_id = None

    # 6. Sections E-H: Family Information
    parents_details = client_data.parents_details or {}
    siblings = client_data.siblings or []
    epouse = client_data.epouse or {}
    kids = client_data.kids or []

    # Concurrency-safe insertion with reference number generation
    max_retries = 5
    client = None
    for attempt in range(max_retries):
        ref_num = generate_client_reference(db, surname, phone_number, attempt)
        client = Client(
            created_by_id=user.id,
            reference_number=ref_num,
            client_date=client_date,
            service_type=service_type,
            priority=priority,
            status=status_val,
            assigned_to_id=assigned_to_id,
            first_name=first_name,
            surname=surname,
            phone_number=phone_number,
            date_of_birth=date_of_birth,
            place_of_birth=place_of_birth,
            birth_place=birth_place,
            gender=gender,
            nationality=nationality,
            marital_status=marital_status,
            personal_country=personal_country,
            sp=sp,
            ef=ef,
            current_country=client_data.current_country,
            preferred_language=client_data.preferred_language,
            numero_ofpra=numero_ofpra,
            numero_aps=numero_aps,
            from_date=from_date,
            to_date=to_date,
            delivered_by=delivered_by,
            secondary_phone=secondary_phone,
            email=email,
            address=address,
            previous_address=client_data.previous_address,
            ville=ville,
            city=ville,
            postal_code=postal_code,
            country=contact_country or personal_country,
            state_province=client_data.state_province,
            remarks=remarks,
            parents_details=parents_details,
            siblings=siblings,
            epouse=epouse,
            kids=kids,
            identification_info=client_data.identification_info or {},
            case_info=client_data.case_info or {},
            background_info=client_data.background_info or {},
            additional_info=client_data.additional_info or {},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        try:
            db.add(client)
            db.commit()
            db.refresh(client)
            return client
        except IntegrityError:
            db.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Could not generate a unique client reference. Please try again."
                )

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
    """
    Update client fields or profile sections independently.
    Saving one section does not overwrite other sections.
    Ref # is permanent and never regenerated on update.
    """
    client = get_client_or_404(db, client_id, user)
    data_dict = update_data.model_dump(exclude_unset=True)

    # 1. Section A: Personal Information validation if passed
    if "surname" in data_dict:
        client.surname = validate_surname(data_dict["surname"], required=True)
        del data_dict["surname"]

    if "first_name" in data_dict:
        client.first_name = validate_first_name(data_dict["first_name"], required=True)
        del data_dict["first_name"]

    if "date_of_birth" in data_dict:
        client.date_of_birth = validate_date(data_dict["date_of_birth"], "Date of Birth", allow_future=False)
        del data_dict["date_of_birth"]

    if "place_of_birth" in data_dict:
        client.place_of_birth = validate_alphabets(data_dict["place_of_birth"], "Place of Birth", required=False)
        del data_dict["place_of_birth"]

    if "birth_place" in data_dict:
        client.birth_place = validate_alphabets(data_dict["birth_place"], "Birth Place", required=False)
        del data_dict["birth_place"]

    if "sp" in data_dict:
        client.sp = validate_date(data_dict["sp"], "SP", allow_future=False)
        del data_dict["sp"]

    if "ef" in data_dict:
        client.ef = validate_date(data_dict["ef"], "EF", allow_future=False)
        del data_dict["ef"]

    if "nationality" in data_dict:
        client.nationality = validate_alphabets(data_dict["nationality"], "Nationality", required=False)
        del data_dict["nationality"]

    if "personal_country" in data_dict:
        client.personal_country = validate_alphabets(data_dict["personal_country"], "Country", required=False)
        del data_dict["personal_country"]

    # 2. Section B: Identification / OFPRA Information
    if "numero_aps" in data_dict:
        client.numero_aps = validate_numero_aps(data_dict["numero_aps"])
        del data_dict["numero_aps"]

    if "from_date" in data_dict or "to_date" in data_dict:
        fd = validate_date(data_dict.get("from_date", client.from_date), "From", allow_future=False)
        td = validate_date(data_dict.get("to_date", client.to_date), "To", allow_future=False)
        validate_date_range(fd, td)
        if "from_date" in data_dict:
            client.from_date = fd
            del data_dict["from_date"]
        if "to_date" in data_dict:
            client.to_date = td
            del data_dict["to_date"]

    # 3. Section C: Contact Information
    if "phone_number" in data_dict:
        client.phone_number = validate_primary_phone(data_dict["phone_number"], required=True)
        del data_dict["phone_number"]

    if "secondary_phone" in data_dict:
        client.secondary_phone = validate_secondary_phone(data_dict["secondary_phone"])
        del data_dict["secondary_phone"]

    if "postal_code" in data_dict:
        client.postal_code = validate_postal_code(data_dict["postal_code"], required=True)
        del data_dict["postal_code"]

    if "email" in data_dict:
        client.email = validate_email(data_dict["email"])
        del data_dict["email"]

    if "ville" in data_dict:
        client.ville = data_dict["ville"]
        client.city = data_dict["ville"]
        del data_dict["ville"]

    # 4. Section D: Remarks
    if "remarks" in data_dict:
        client.remarks = sanitize_html(data_dict["remarks"])
        del data_dict["remarks"]

    # 5. Header fields validation
    if "client_date" in data_dict:
        client.client_date = validate_date(data_dict["client_date"], "Date", required=True, allow_future=True)
        del data_dict["client_date"]

    if "service_type" in data_dict:
        client.service_type = validate_enum_choice(data_dict["service_type"], SERVICE_TYPES, "Service Type", required=True)
        del data_dict["service_type"]

    if "priority" in data_dict:
        client.priority = validate_enum_choice(data_dict["priority"], PRIORITIES, "Priority", required=False) or "Normal"
        del data_dict["priority"]

    if "status" in data_dict:
        client.status = validate_enum_choice(data_dict["status"], STATUSES, "Status", required=False) or "Inwarded"
        del data_dict["status"]

    if "assigned_to_id" in data_dict:
        assigned_id = data_dict["assigned_to_id"]
        if assigned_id:
            assigned_user = db.query(User).filter(User.id == assigned_id).first()
            if not assigned_user:
                raise HTTPException(status_code=400, detail="Assigned user not found.")
            client.assigned_to = assigned_user
            client.assigned_to_id = assigned_id
        else:
            client.assigned_to = None
            client.assigned_to_id = None
        del data_dict["assigned_to_id"]

    # 6. Structured JSON dictionary updates
    for json_col in ["parents_details", "epouse", "identification_info", "case_info", "background_info", "additional_info"]:
        if json_col in data_dict:
            val = data_dict[json_col]
            if isinstance(val, dict):
                existing = dict(getattr(client, json_col) or {})
                existing.update(val)
                setattr(client, json_col, existing)
            else:
                setattr(client, json_col, val)
            del data_dict[json_col]

    # Array JSON fields (siblings, kids)
    for list_col in ["siblings", "kids"]:
        if list_col in data_dict:
            setattr(client, list_col, data_dict[list_col] or [])
            del data_dict[list_col]

    # Remaining scalar fields (service_type, priority, status, assigned_to_id, gender, marital_status, address, etc.)
    for key, val in data_dict.items():
        if key != "reference_number" and hasattr(client, key):
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


# =====================================================================
# Client Files Endpoints
# =====================================================================

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

    try:
        storage_service.delete_file(file_record.storage_path)
    except Exception as e:
        print(f"Warning: Failed to delete file {file_record.storage_path} from storage: {e}")

    db.delete(file_record)
    db.commit()
    return
