from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
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
def get_speakers(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:read"))
):
    """جلب المتحدثين لفعالية محددة"""
    speakers = db.query(Speaker).filter(Speaker.event_id == event_id).all()
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """إضافة متحدث جديد"""
    image_url = None
    if image:
        upload_dir = os.path.join("static", "speakers", str(event_id))
        os.makedirs(upload_dir, exist_ok=True)
        raw_ext = image.filename.split('.')[-1] if '.' in image.filename else 'png'
        file_ext = "".join(c for c in raw_ext if c.isalnum())
        filename = f"speaker_{int(time.time())}.{file_ext}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await image.read())
        image_url = f"/static/speakers/{event_id}/{filename}"
    
    db_speaker = Speaker(
        event_id=event_id,
        name=name,
        title=title,
        bio=bio,
        topic=topic,
        image_url=image_url
    )
    db.add(db_speaker)
    db.commit()
    db.refresh(db_speaker)
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
def delete_speaker(
    event_id: int,
    speaker_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """حذف متحدث"""
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id, Speaker.event_id == event_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="المتحدث غير موجود في هذه الفعالية")
    
    db.delete(speaker)
    db.commit()
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """تحديث بيانات متحدث"""
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id, Speaker.event_id == event_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="المتحدث غير موجود")
    
    if name: speaker.name = name
    if title: speaker.title = title
    if bio: speaker.bio = bio
    if topic: speaker.topic = topic
    
    if image:
        upload_dir = os.path.join("static", "speakers", str(event_id))
        os.makedirs(upload_dir, exist_ok=True)
        raw_ext = image.filename.split('.')[-1] if '.' in image.filename else 'png'
        file_ext = "".join(c for c in raw_ext if c.isalnum())
        filename = f"speaker_{int(time.time())}.{file_ext}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await image.read())
        speaker.image_url = f"/static/speakers/{event_id}/{filename}"

    db.commit()
    db.refresh(speaker)
    return {"message": "تم التحديث بنجاح"}

