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
    GCP_CREDENTIALS_JSON: str = "" # Raw JSON string for Railway/Cloud deployment

    # S3 / Railway Bucket Settings
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET_NAME: str | None = None
    S3_REGION_NAME: str = "us-east-1"

    # AI
    GEMINI_API_KEY: str = ""

    # Validator to fix postgres:// -> postgresql://
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
