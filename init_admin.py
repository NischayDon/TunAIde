from app.db.base import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash

import os
from dotenv import load_dotenv

def init_admin():
    load_dotenv()
    db = SessionLocal()
    username = "ADMIN_AZE"
    password = os.getenv("ADMIN_PASSWORD")
    
    if not password:
        print("ERROR: ADMIN_PASSWORD not set in .env")
        return
    
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        print(f"Creating admin user {username}...")
        user = User(
            username=username,
            email="admin@tunai.com", # placeholder
            hashed_password=get_password_hash(password),
            is_admin=True
        )
        db.add(user)
    else:
        print(f"Admin user {username} exists. Updating credentials...")
        user.hashed_password = get_password_hash(password)
        user.is_admin = True
        
    db.commit()
    print("Admin initialization complete.")
    db.close()

if __name__ == "__main__":
    init_admin()
