from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List
from app.core.database import get_db
from app.core.auth_deps import get_current_user
from app.models.others import UserNotification
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class NotificationSchema(BaseModel):
    id: int
    title: str
    message: str
    level: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationSchema])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    limit: int = 50
):
    stmt = (
        select(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return notifications

@router.post("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stmt = (
        update(UserNotification)
        .filter(
            UserNotification.user_id == current_user.id,
            UserNotification.is_read == False
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/clear")
async def clear_notifications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stmt = (
        delete(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "Notifications cleared"}
