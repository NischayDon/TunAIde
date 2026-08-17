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
from app.api import jobs, auth, admin, queue
from app.db.base import Base, engine
# Import models to register them with Base.metadata before create_all
from app.db import models

@asynccontextmanager
async def lifespan(app: FastAPI):
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

@app.get("/", response_class=HTMLResponse)
def read_root():
    with open(os.path.join("app", "templates", "index.html"), "r") as f:
        return f.read()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "TunAIde Phase One"}
