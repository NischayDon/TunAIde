"""
Migration: Add lifetime counters (total_uploads, total_completed) to users table.
Run this once after deploying the code changes.

Usage:
    cd TunAI
    python scripts/migrate_add_counters.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.db.base import Base, engine, SessionLocal
from app.db.models import User, Job, JobStatus

def migrate():
    print("Migration: Ensuring all tables exist...")
    Base.metadata.create_all(bind=engine)
    print("  Tables ensured.")
    
    print("Adding lifetime counter columns to users table...")
    with engine.connect() as conn:
        # Check if columns already exist
        try:
            conn.execute(text("SELECT total_uploads FROM users LIMIT 1"))
            print("  Columns already exist, skipping ALTER TABLE.")
        except Exception:
            # Add columns
            print("  Adding total_uploads column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN total_uploads INTEGER DEFAULT 0"))
            print("  Adding total_completed column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN total_completed INTEGER DEFAULT 0"))
            conn.commit()
            print("  Columns added successfully.")
    
    # Backfill counters from existing data
    print("Backfilling counters from existing job data...")
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("  No users found, nothing to backfill.")
        for user in users:
            total = db.query(Job).filter(Job.user_id == user.id).count()
            completed = db.query(Job).filter(
                Job.user_id == user.id,
                Job.status == JobStatus.COMPLETED.value
            ).count()
            user.total_uploads = total
            user.total_completed = completed
            print(f"  User '{user.username}': {total} uploads, {completed} completed")
        
        db.commit()
        print("Backfill complete!")
    finally:
        db.close()
    
    print("Migration finished successfully.")

if __name__ == "__main__":
    migrate()
