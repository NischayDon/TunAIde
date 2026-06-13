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
    
    # All admin credentials come from environment variables.
    # Format: ADMIN_<N>_USERNAME, ADMIN_<N>_PASSWORD
    # This keeps passwords out of source code entirely.
    admin_users = []
    i = 1
    while True:
        username = os.getenv(f"ADMIN_{i}_USERNAME")
        if not username:
            break
        admin_users.append({
            "username": username,
            "password": os.getenv(f"ADMIN_{i}_PASSWORD"),
        })
        i += 1

    if not admin_users:
        print("No admin users configured in environment. Set ADMIN_1_USERNAME, ADMIN_1_PASSWORD, etc.")
        db.close()
        return

    for admin_data in admin_users:
        if not admin_data["password"]:
            print(f"Skipping {admin_data['username']}: Password not set")
            continue

        user = db.query(User).filter(User.username == admin_data["username"]).first()
        
        if not user:
            print(f"Creating admin user {admin_data['username']}...")
            user = User(
                username=admin_data["username"],
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
