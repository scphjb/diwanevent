from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.event import Event
from app.models.user import User
from app.core.auth_deps import get_current_active_user

router = APIRouter()

@router.get("/")
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    جلب الفعاليات التابعة للمنظم الحالي فقط.
    """
    if current_user.role == "super_admin":
        return db.query(Event).all()
    
    return db.query(Event).filter(Event.created_by == current_user.id).all()

@router.get("/{event_id}")
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # تأكد من أن المنظم يملك صلاحية الوصول لهذه الفعالية
    if current_user.role != "super_admin" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this event")
        
    return event

@router.patch("/{event_id}")
def update_event(
    event_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if current_user.role != "super_admin" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    for key, value in data.items():
        if hasattr(event, key):
            setattr(event, key, value)
            
    db.commit()
    db.refresh(event)
    return event
@router.post("/")
def create_event(
    name: str,
    location: str = "",
    date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    إنشاء فعالية جديدة وربطها بالمنظم الحالي.
    """
    new_event = Event(
        event_name=name,
        location=location,
        event_date=date,
        created_by=current_user.id
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event
@router.post("/{event_id}/freeze")
def toggle_event_freeze(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    event.list_frozen = not event.list_frozen
    db.commit()
    return {"status": "success", "is_frozen": event.list_frozen}

@router.post("/{event_id}/reset-attendance")
def reset_event_attendance(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.participant import Participant
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # تصفير حالة الحاضرين (إعادتهم إلى حالة الانتظار)
    db.query(Participant).filter(Participant.event_id == event_id).update({"payment_status": "pending"})
    db.commit()
    return {"status": "success", "message": "Attendance records reset"}
