from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import os
import time
from app.core.database import get_db
from app.models.others import Speaker
from app.models.event import Event
from app.schemas.others import SpeakerOut
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.core.rbac import require_permission

router = APIRouter()

@router.get("/{event_id}")
async def get_speakers(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:read"))
):
    """جلب المتحدثين لفعالية محددة"""
    stmt = select(Speaker).filter(Speaker.event_id == event_id)
    res = await db.execute(stmt)
    speakers = res.scalars().all()
    return [
        {
            "id": s.id,
            "event_id": s.event_id,
            "name": s.name,
            "title": s.title,
            "bio": s.bio,
            "image_url": s.image_url,
            "topic": s.topic
        }
        for s in speakers
    ]

@router.post("/")
async def create_speaker(
    event_id: int = Query(...),
    name: str = Form(...),
    title: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """إضافة متحدث جديد"""
    image_url = None
    if image:
        from app.services.cloud_storage import StorageService
        storage = StorageService()
        image_content = await image.read()
        image_url = storage.upload_image_or_file(
            file_content=image_content,
            filename=image.filename,
            folder=f"speakers/{event_id}",
            content_type=image.content_type or "image/png"
        )
    
    db_speaker = Speaker(
        event_id=event_id,
        name=name,
        title=title,
        bio=bio,
        topic=topic,
        image_url=image_url
    )
    db.add(db_speaker)
    await db.commit()
    await db.refresh(db_speaker)
    return {
        "id": db_speaker.id,
        "event_id": db_speaker.event_id,
        "name": db_speaker.name,
        "title": db_speaker.title,
        "bio": db_speaker.bio,
        "image_url": db_speaker.image_url,
        "topic": db_speaker.topic
    }

@router.delete("/{event_id}/{speaker_id}")
async def delete_speaker(
    event_id: int,
    speaker_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """حذف متحدث"""
    stmt = select(Speaker).filter(Speaker.id == speaker_id, Speaker.event_id == event_id)
    res = await db.execute(stmt)
    speaker = res.scalars().first()
    if not speaker:
        raise HTTPException(status_code=404, detail="المتحدث غير موجود في هذه الفعالية")
    
    await db.delete(speaker)
    await db.commit()
    return {"message": "تم حذف المتحدث بنجاح"}

@router.put("/{event_id}/{speaker_id}")
async def update_speaker(
    event_id: int,
    speaker_id: int,
    name: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """تحديث بيانات متحدث"""
    stmt = select(Speaker).filter(Speaker.id == speaker_id, Speaker.event_id == event_id)
    res = await db.execute(stmt)
    speaker = res.scalars().first()
    if not speaker:
        raise HTTPException(status_code=404, detail="المتحدث غير موجود")
    
    if name: speaker.name = name
    if title: speaker.title = title
    if bio: speaker.bio = bio
    if topic: speaker.topic = topic
    
    if image:
        from app.services.cloud_storage import StorageService
        storage = StorageService()
        image_content = await image.read()
        speaker.image_url = storage.upload_image_or_file(
            file_content=image_content,
            filename=image.filename,
            folder=f"speakers/{event_id}",
            content_type=image.content_type or "image/png"
        )

    await db.commit()
    await db.refresh(speaker)
    return {"message": "تم التحديث بنجاح"}
