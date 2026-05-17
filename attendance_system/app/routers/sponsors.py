from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import time
from app.core.database import get_db
from app.models.others import Sponsor
from app.models.event import Event
from app.schemas.others import SponsorOut
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.core.rbac import require_permission

router = APIRouter()

@router.get("/{event_id}")
def get_sponsors(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:read"))
):
    """جلب الرعاة لفعالية محددة مع التحقق من الصلاحيات"""
    sponsors = db.query(Sponsor).filter(
        Sponsor.event_id == event_id, 
        Sponsor.is_active == True
    ).order_by(Sponsor.display_order).all()
    
    return [
        {
            "id": s.id,
            "event_id": s.event_id,
            "name": s.name,
            "logo_url": s.logo_url,
            "website_url": s.website_url,
            "tier": s.tier,
            "type": s.type,
            "display_duration": s.display_duration,
            "is_active": s.is_active,
            "display_order": s.display_order
        }
        for s in sponsors
    ]

@router.post("/")
async def create_sponsor(
    event_id: int = Query(...),
    name: str = Form(...),
    tier: str = Form("gold"),
    type: str = Form("sponsor"),
    website_url: Optional[str] = Form(None),
    display_duration: int = Form(8),
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """إضافة راع جديد للفعالية المحددة"""
    upload_dir = os.path.join("static", "sponsors", str(event_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    raw_ext = logo.filename.split('.')[-1] if '.' in logo.filename else 'png'
    file_ext = "".join(c for c in raw_ext if c.isalnum())
    filename = f"sponsor_{int(time.time())}.{file_ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await logo.read())
        
    logo_url = f"/static/sponsors/{event_id}/{filename}"
    
    db_sponsor = Sponsor(
        event_id=event_id,
        name=name,
        logo_url=logo_url,
        website_url=website_url,
        tier=tier,
        type=type,
        display_duration=display_duration
    )
    db.add(db_sponsor)
    db.commit()
    db.refresh(db_sponsor)
    
    return {
        "id": db_sponsor.id,
        "event_id": db_sponsor.event_id,
        "name": db_sponsor.name,
        "logo_url": db_sponsor.logo_url,
        "website_url": db_sponsor.website_url,
        "tier": db_sponsor.tier,
        "type": db_sponsor.type,
        "display_duration": db_sponsor.display_duration,
        "is_active": db_sponsor.is_active
    }

@router.delete("/{event_id}/{sponsor_id}")
def delete_sponsor(
    event_id: int,
    sponsor_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """حذف راع من فعالية محددة"""
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id, Sponsor.event_id == event_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="الراعي غير موجود في هذه الفعالية")
    
    db.delete(sponsor)
    db.commit()
    return {"message": "تم حذف الراعي بنجاح"}

@router.put("/{event_id}/{sponsor_id}")
async def update_sponsor(
    event_id: int,
    sponsor_id: int,
    name: Optional[str] = Form(None),
    tier: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    website_url: Optional[str] = Form(None),
    display_duration: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    """تحديث بيانات راع"""
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id, Sponsor.event_id == event_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="الراعي غير موجود")
    
    if name: sponsor.name = name
    if tier: sponsor.tier = tier
    if type: sponsor.type = type
    if website_url: sponsor.website_url = website_url
    if display_duration is not None: sponsor.display_duration = display_duration
    if is_active is not None: sponsor.is_active = is_active
    
    if logo:
        upload_dir = os.path.join("static", "sponsors", str(event_id))
        os.makedirs(upload_dir, exist_ok=True)
        raw_ext = logo.filename.split('.')[-1] if '.' in logo.filename else 'png'
        file_ext = "".join(c for c in raw_ext if c.isalnum())
        filename = f"sponsor_{int(time.time())}.{file_ext}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await logo.read())
        sponsor.logo_url = f"/static/sponsors/{event_id}/{filename}"

    db.commit()
    db.refresh(sponsor)
    return {"message": "تم التحديث بنجاح"}



