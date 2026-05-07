from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import time
from app.core.database import get_db
from app.models.others import Speaker
from app.core.auth_deps import get_current_active_user
from app.models.user import User

router = APIRouter()

@router.get("/{event_id}", response_model=List[dict])
def get_speakers(event_id: int, db: Session = Depends(get_db)):
    return db.query(Speaker).filter(Speaker.event_id == event_id).all()

from app.models.event import Event

@router.post("/")
async def create_speaker(
    event_id: int = Form(...),
    name: str = Form(...),
    title: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Security Check
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != 'super_admin' and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    image_url = None
    if image:
        upload_dir = os.path.join("static", "speakers", str(event_id))
        os.makedirs(upload_dir, exist_ok=True)
        # Security: Sanitize filename and extension
        raw_ext = image.filename.split('.')[-1] if '.' in image.filename else 'png'
        # Only allow alphanumeric extensions to prevent path traversal via extension
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
    return db_speaker

@router.delete("/{speaker_id}")
def delete_speaker(
    speaker_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    speaker = db.query(Speaker).get(speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    # Security Check
    event = db.query(Event).filter(Event.id == speaker.event_id).first()
    if not event or (current_user.role != 'super_admin' and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(speaker)
    db.commit()
    return {"message": "Speaker deleted"}
