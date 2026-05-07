from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import time
from app.core.database import get_db
from app.models.others import Sponsor
from app.schemas.others import SponsorOut # Assuming we create this or use a dict
from app.core.auth_deps import get_current_active_user
from app.models.user import User

from app.core.rbac import require_permission

router = APIRouter()

@router.get("/{event_id}", response_model=List[dict])
def get_sponsors(event_id: int, db: Session = Depends(get_db)):
    return db.query(Sponsor).filter(Sponsor.event_id == event_id, Sponsor.is_active == True).order_by(Sponsor.display_order).all()

from app.models.event import Event

@router.post("/")
async def create_sponsor(
    event_id: int = Form(...),
    name: str = Form(...),
    tier: str = Form("gold"),
    website_url: Optional[str] = Form(None),
    display_duration: int = Form(8),
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    # event_id is now validated by require_permission
    # Save Logo
    upload_dir = os.path.join("static", "sponsors", str(event_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Security: Sanitize filename and extension
    raw_ext = logo.filename.split('.')[-1] if '.' in logo.filename else 'png'
    # Only allow alphanumeric extensions to prevent path traversal via extension
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
        display_duration=display_duration
    )
    db.add(db_sponsor)
    db.commit()
    db.refresh(db_sponsor)
    return db_sponsor

@router.delete("/{event_id}/{sponsor_id}")
def delete_sponsor(
    event_id: int, # Added for RBAC
    sponsor_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    sponsor = db.query(Sponsor).get(sponsor_id)
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    
    if sponsor.event_id != event_id:
        raise HTTPException(status_code=400, detail="Sponsor does not belong to this event")

    db.delete(sponsor)
    db.commit()
    return {"message": "Sponsor deleted"}

@router.put("/{event_id}/{sponsor_id}")
async def update_sponsor(
    event_id: int,
    sponsor_id: int,
    name: Optional[str] = Form(None),
    tier: Optional[str] = Form(None),
    website_url: Optional[str] = Form(None),
    display_duration: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:write"))
):
    sponsor = db.query(Sponsor).get(sponsor_id)
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    
    if sponsor.event_id != event_id:
        raise HTTPException(status_code=400, detail="Sponsor does not belong to this event")

    if name: sponsor.name = name
    if tier: sponsor.tier = tier
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
    return sponsor


