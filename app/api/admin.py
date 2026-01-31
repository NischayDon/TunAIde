from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db.base import get_db
from app.db.models import User, Job
from app.api.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class UserStat(BaseModel):
    username: str
    upload_count: int
    transcribed_minutes: float
    last_login: str | None = None

@router.get("/users", response_model=List[UserStat])
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Query stats
    # We want: User.username, Count(Job.id), Sum(Job.duration_seconds)
    # Users who have valid username (i.e. real login users)
    
    users = db.query(User).filter(User.username != None).all()
    
    stats = []
    for u in users:
        job_count = db.query(Job).filter(Job.user_id == u.id).count()
        # duration is in seconds.
        duration_seconds = db.query(func.sum(Job.duration_seconds)).filter(Job.user_id == u.id).scalar() or 0
        minutes = round(duration_seconds / 60, 2)
        
        stats.append(UserStat(
            username=u.username,
            upload_count=job_count,
            transcribed_minutes=minutes,
            last_login=str(u.last_login) if u.last_login else None
        ))
        
    return stats

class CreateUserRequest(BaseModel):
    username: str
    password: str

@router.post("/users", status_code=201)
def create_user(
    user_data: CreateUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    from app.core import security
    hashed_password = security.get_password_hash(user_data.password)
    
    new_user = User(
        username=user_data.username,
        hashed_password=hashed_password,
        is_admin=False
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@router.delete("/users/{username}")
def delete_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    user_to_delete = db.query(User).filter(User.username == username).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_to_delete.is_admin:
        raise HTTPException(status_code=403, detail="Cannot delete administrator accounts")
    
    db.delete(user_to_delete)
    db.commit()
    return {"message": "User deleted successfully"}
