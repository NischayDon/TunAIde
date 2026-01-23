from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TunAIde"
    SECRET_KEY: str = "changeme"
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str
    
    # Redis
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    
    # Storage
    GCP_PROJECT: str = "test-project"
    GCP_BUCKET_NAME: str = "tunaide-uploads"
    GCP_STORAGE_EMULATOR_HOST: str = "" # Set if using emulator

    # AI
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
