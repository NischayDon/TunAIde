import os
import shutil
import uuid
from typing import BinaryIO

class StorageService:
    def __init__(self):
        # Ensure upload directory exists
        self.upload_dir = os.path.join(os.getcwd(), "app", "static", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

    def save_file(self, file_obj: BinaryIO, filename: str) -> str:
        """
        Save a file-like object to local disk.
        Returns the relative path to be stored in DB.
        """
        # Generate safely unique filename
        ext = filename.split('.')[-1] if '.' in filename else "bin"
        unique_name = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(self.upload_dir, unique_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
            
        return unique_name

    def get_full_path(self, relative_path: str) -> str:
        return os.path.join(self.upload_dir, relative_path)

    def delete_file(self, relative_path: str):
        path = self.get_full_path(relative_path)
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                print(f"Error deleting file {path}: {e}")

storage_service = StorageService()
