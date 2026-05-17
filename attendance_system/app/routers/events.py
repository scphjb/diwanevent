from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List
import os
import time
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

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    حذف فعالية مع جميع بياناتها المرتبطة.
    مسموح فقط للمنظم المالك أو super_admin.
    """
    from app.models.participant import Participant, Attendance
    from app.models.others import Speaker, Sponsor, AgendaSession

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    if current_user.role != "super_admin" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="غير مصرح لك بحذف هذه الفعالية")

    # حذف البيانات المرتبطة بالترتيب الصحيح (FK constraints)
    attendance_subq = db.query(Participant.id).filter(Participant.event_id == event_id)
    db.query(Attendance).filter(Attendance.participant_id.in_(attendance_subq)).delete(synchronize_session=False)
    db.query(Participant).filter(Participant.event_id == event_id).delete(synchronize_session=False)
    db.query(Speaker).filter(Speaker.event_id == event_id).delete(synchronize_session=False)
    db.query(AgendaSession).filter(AgendaSession.event_id == event_id).delete(synchronize_session=False)
    db.query(Sponsor).filter(Sponsor.event_id == event_id).delete(synchronize_session=False)

    db.delete(event)
    db.commit()

    return {"status": "success", "message": f"تم حذف الفعالية '{event.event_name}'"}

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

@router.get("/{event_id}/settings")
def get_public_event_settings(
    event_id: int,
    db: Session = Depends(get_db)
):
    """جلب إعدادات الفعالية العامة (للكيوسك والتسجيل)"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "welcome_title": event.welcome_title or "بوابة الخدمة الذاتية",
        "welcome_subtitle": event.welcome_subtitle or "ابحث عن بياناتك وحمل بطاقتك",
        "primary_color": event.primary_color or "#10b981",
        "registration_enabled": event.registration_enabled
    }

@router.post("/{event_id}/reset-attendance")
def reset_event_attendance(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # BUG 6 FIX: حذف سجلات الحضور من جدول Attendance بدلاً من تعديل payment_status
    from app.models.participant import Participant, Attendance

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # ✅ الصحيح: حذف سجلات الحضور من جدول attendance
    participant_ids = db.query(Participant.id).filter(Participant.event_id == event_id)
    deleted_count = db.query(Attendance).filter(
        Attendance.participant_id.in_(participant_ids)
    ).delete(synchronize_session=False)

    db.commit()
    return {
        "status": "success",
        "message": f"تم مسح {deleted_count} سجل حضور",
        "deleted_count": deleted_count
    }

@router.post("/{event_id}/display/scene")
async def change_display_scene(
    event_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.core.websockets import manager
    
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    scene = data.get("scene")
    channel = data.get("channel", "main")
    if not scene:
        raise HTTPException(status_code=400, detail="Scene is required")
        
    await manager.broadcast_to_event(event_id, {
        "type": "scene_change",
        "scene": scene,
        "channel": channel
    })
    
    return {"status": "success", "scene": scene}

@router.get("/{event_id}/registration-fields")
def get_registration_fields(
    event_id: int,
    db: Session = Depends(get_db)
):
    """جلب الحقول المخصصة المطلوبة للتسجيل في فعالية معينة (مفتوح للعموم)"""
    from app.models.rbac import CustomFieldDefinition
    fields = db.query(CustomFieldDefinition).filter(
        CustomFieldDefinition.event_id == event_id
    ).all()
    
    return [
        {
            "id": f.id,
            "field_name": f.field_name,
            "display_label": f.display_label,
            "field_type": f.field_type,
            "is_required": f.is_required,
            "options": f.options
        }
        for f in fields
    ]

@router.post("/{event_id}/registration-fields")
def create_registration_field(
    event_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """إضافة حقل جديد لنموذج التسجيل"""
    from app.models.rbac import CustomFieldDefinition
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_field = CustomFieldDefinition(
        event_id=event_id,
        field_name=data.get("field_name"),
        display_label=data.get("display_label"),
        field_type=data.get("field_type", "text"),
        is_required=data.get("is_required", False),
        options=data.get("options")
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field

@router.delete("/{event_id}/registration-fields/{field_id}")
def delete_registration_field(
    event_id: int,
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """حذف حقل من نموذج التسجيل"""
    from app.models.rbac import CustomFieldDefinition
    field = db.query(CustomFieldDefinition).filter(
        CustomFieldDefinition.id == field_id,
        CustomFieldDefinition.event_id == event_id
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # تحقق من الصلاحية عبر الفعالية
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(field)
    db.commit()
    return {"status": "success"}

@router.post("/{event_id}/logo")
async def upload_event_logo(
    event_id: int,
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    upload_dir = os.path.join("static", "events", str(event_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    raw_ext = logo.filename.split('.')[-1] if '.' in logo.filename else 'png'
    file_ext = "".join(c for c in raw_ext if c.isalnum())
    filename = f"logo_{int(time.time())}.{file_ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await logo.read())
        
    event.logo_url = f"/static/events/{event_id}/{filename}"
    db.commit()
    db.refresh(event)
    
    return {"status": "success", "logo_url": event.logo_url}

@router.get("/{event_id}/halls")
def list_event_halls(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.event import EventHall
    return db.query(EventHall).filter(EventHall.event_id == event_id).all()

@router.post("/{event_id}/halls")
def create_event_hall(
    event_id: int, 
    data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    from app.models.event import EventHall
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_hall = EventHall(
        event_id=event_id,
        name=data.get("name"),
        capacity=data.get("capacity", 100),
        hall_type=data.get("hall_type", "main")
    )
    db.add(new_hall)
    db.commit()
    db.refresh(new_hall)
    return new_hall

@router.delete("/{event_id}/halls/{hall_id}")
def delete_event_hall(
    event_id: int, 
    hall_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    from app.models.event import EventHall
    hall = db.query(EventHall).filter(EventHall.id == hall_id, EventHall.event_id == event_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(hall)
    db.commit()
    return {"status": "success"}
