from app.db.base import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash

import os
from dotenv import load_dotenv

def init_admin():
    load_dotenv()
    # Create tables if they don't exist (CRITICAL for first run on synchronous scripts)
    from app.db.base import Base, engine
    # Import models to ensure they are registered
    from app.db import models
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    admin_users = [
        {"username": "ADMIN_AZE", "password": os.getenv("ADMIN_PASSWORD"), "email": "admin@tunai.com"},
        {"username": "Chembakadas", "password": "Kangaroo@21", "email": "chembakadas@tunai.com"},
        {"username": "Binu", "password": "dindan", "email": "binu@tunai.com"}
    ]

    for admin_data in admin_users:
        if not admin_data["password"]:
            print(f"Skipping {admin_data['username']}: Password not set")
            continue

        user = db.query(User).filter(User.username == admin_data["username"]).first()
        
        if not user:
            print(f"Creating admin user {admin_data['username']}...")
            user = User(
                username=admin_data["username"],
                email=admin_data["email"],
                hashed_password=get_password_hash(admin_data["password"]),
                is_admin=True
            )
            db.add(user)
        else:
            print(f"Admin user {admin_data['username']} exists. Updating credentials...")
            user.hashed_password = get_password_hash(admin_data["password"])
            user.is_admin = True
        
    db.commit()
    print("Admin initialization complete.")
    db.close()

if __name__ == "__main__":
    init_admin()
