from contextlib import asynccontextmanager
from fastapi import FastAPI
from dotenv import load_dotenv
import os

# Explicitly load env vars so os.getenv works in api/jobs.py
load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api import jobs, auth, admin, queue, internal, ledger
from app.db.base import Base, engine
# Import models to register them with Base.metadata before create_all
from app.db import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup verification for dependency versions
    try:
        import celery
        import kombu
        import redis
        print(f"[Web Startup Verification] Celery: {celery.__version__}, Kombu: {kombu.__version__}, Redis: {redis.__version__}")
    except Exception as e:
        print(f"[Web Startup Verification Warning]: {e}")

    # Startup: Ensure DB is connected
    import time
    from sqlalchemy import text
    
    retries = 5
    for i in range(retries):
        try:
            print(f"Checking database connection (Attempt {i+1}/{retries})...")
            # Create tables (also verifies connection)
            Base.metadata.create_all(bind=engine)
            
            # Auto-migrate missing columns (for existing databases)
            with engine.connect() as conn:
                try:
                    conn.execute(text("SELECT total_uploads FROM users LIMIT 1"))
                except Exception:
                    conn.rollback()  # Clear aborted transaction in Postgres
                    print("Auto-migrating: Adding missing columns to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN total_uploads INTEGER DEFAULT 0"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN total_completed INTEGER DEFAULT 0"))
                    conn.commit()
                
                try:
                    conn.execute(text("SELECT description FROM supporting_documents LIMIT 1"))
                except Exception:
                    conn.rollback()
                    print("Auto-migrating: Adding description column to supporting_documents table...")
                    conn.execute(text("ALTER TABLE supporting_documents ADD COLUMN description TEXT"))
                    conn.commit()

                try:
                    conn.execute(text("SELECT reference_number FROM clients LIMIT 1"))
                except Exception:
                    conn.rollback()
                    print("Auto-migrating: Adding enhanced ledger workflow columns to clients table...")
                    cols = [
                        ("reference_number", "VARCHAR"),
                        ("client_date", "VARCHAR"),
                        ("service_type", "VARCHAR"),
                        ("priority", "VARCHAR DEFAULT 'Normal'"),
                        ("status", "VARCHAR DEFAULT 'Inwarded'"),
                        ("assigned_to_id", "VARCHAR"),
                        ("birth_place", "VARCHAR"),
                        ("personal_country", "VARCHAR"),
                        ("sp", "VARCHAR"),
                        ("ef", "VARCHAR"),
                        ("numero_ofpra", "VARCHAR"),
                        ("numero_aps", "VARCHAR"),
                        ("from_date", "VARCHAR"),
                        ("to_date", "VARCHAR"),
                        ("delivered_by", "VARCHAR"),
                        ("ville", "VARCHAR"),
                        ("remarks", "TEXT"),
                        ("parents_details", "JSON"),
                        ("siblings", "JSON"),
                        ("epouse", "JSON"),
                        ("kids", "JSON"),
                    ]
                    for col_name, col_type in cols:
                        try:
                            conn.execute(text(f"ALTER TABLE clients ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        except Exception:
                            conn.rollback()
            
            # Simple query to verify
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Database connected successfully!")
            break
        except Exception as e:
            if i == retries - 1:
                print(f"Database connection failed after {retries} attempts: {e}")
                raise e
            print(f"Database connection failed, retrying in 2s... Error: {e}")
            time.sleep(2)

    # Startup: Run admin initialization
    try:
        from init_admin import init_admin
        print("Running startup admin seeding...")
        init_admin()
    except Exception as e:
        print(f"Startup admin seeding failed (Non-critical): {e}")
    yield
    # Shutdown logic (if any)

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(queue.router, prefix="/queue", tags=["Queue"])
app.include_router(internal.router, prefix="/api/internal", tags=["Internal"])
app.include_router(ledger.router, prefix="/api/ledger", tags=["Ledger"])
app.include_router(ledger.router, prefix="/ledger", tags=["Ledger"])

@app.get("/", response_class=HTMLResponse)
def read_root():
    with open(os.path.join("app", "templates", "index.html"), "r") as f:
        content = f.read()
    response = HTMLResponse(content=content)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/health")
def health_check():
    """
    Health check that reports actual storage connectivity.
    Returns 200 even if storage is unhealthy (so Railway doesn't restart the
    service in a loop), but the response body distinguishes a live process
    from one that can actually process jobs.
    """
    result = {"status": "ok", "service": "TunAIde Phase One"}
    try:
        from app.services.storage import storage_service
        storage_status = storage_service.verify()
        result["storage"] = storage_status
        if not storage_status.get("healthy"):
            result["status"] = "degraded"
    except Exception as e:
        result["storage"] = {"healthy": False, "error": str(e)}
        result["status"] = "degraded"
    return result
