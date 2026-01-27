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
from app.api import jobs, auth, admin
from app.db.base import Base, engine
# Import models to register them with Base.metadata before create_all
from app.db import models 
import os

# Create tables on startup (Phase 1 simplification)
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run admin initialization
    # try:
    #     from init_admin import init_admin
    #     print("Running startup admin seeding...")
    #     init_admin()
    # except Exception as e:
    #     print(f"Startup admin seeding failed (Non-critical): {e}")
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

@app.get("/", response_class=HTMLResponse)
def read_root():
    with open(os.path.join("app", "templates", "index.html"), "r") as f:
        return f.read()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "TunAIde Phase One"}
