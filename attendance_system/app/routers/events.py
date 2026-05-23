from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import time
from datetime import date, datetime
from app.core.database import get_db
from app.models.event import Event
from app.models.user import User
from app.core.auth_deps import get_current_active_user
from sqlalchemy import select, delete, Date, Boolean, DateTime
from sqlalchemy.orm import class_mapper

router = APIRouter()

@router.get("/")
async def list_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    جلب الفعاليات التابعة للمنظم الحالي فقط.
    """
    if current_user.role == "super_admin":
        stmt = select(Event)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    stmt = select(Event).filter(Event.created_by == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/public/active")
async def list_public_events(
    db: AsyncSession = Depends(get_db)
):
    """
    دليل الفعاليات العامة لصفحة الهبوط.
    تُعرض كل الفعاليات العامة (ماضية + جارية + مقبلة).
    لا تُعرض الفعاليات الخاصة (is_public=False صراحةً).
    السجلات القديمة (is_public=NULL) تُعامَل كعامة.
    """
    from sqlalchemy import or_
    stmt = select(Event).filter(
        or_(Event.is_public == True, Event.is_public == None)
    ).order_by(Event.event_date.desc().nullslast())
    result = await db.execute(stmt)
    events = result.scalars().all()

    return [
        {
            "id": e.id,
            "event_name": e.event_name,
            "event_date": str(e.event_date) if e.event_date else None,
            "location": e.location,
            "organizer_text": e.organizer_text or "",
            "registration_enabled": e.registration_enabled,
            "status": e.status,
            "app_name": e.app_name,
            "app_subtitle": e.app_subtitle,
            "primary_color": e.primary_color or "#D4AF37",
            "logo_url": e.logo_url,
        }
        for e in events
    ]

@router.get("/public/{event_id}")
async def get_public_event(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    جلب المعلومات العامة لفعالية معينة (بدون تسجيل دخول).
    - إذا registration_enabled=True → تُعاد جميع بيانات التسجيل
    - إذا registration_enabled=False → تُعاد البيانات العامة فقط (اسم + تاريخ + مكان)
    """
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    # البيانات العامة دائماً
    public_info = {
        "id": event.id,
        "event_name": event.event_name,
        "event_date": str(event.event_date) if event.event_date else None,
        "location": event.location,
        "registration_enabled": event.registration_enabled,
        "primary_color": event.primary_color or "#D4AF37",
        "secondary_color": event.secondary_color or "#022C22",
        "logo_url": event.logo_url,
        "app_name": event.app_name or "Diwan Event",
        "app_subtitle": event.app_subtitle,
        "hero_title": event.hero_title,
        "hero_description": event.hero_description,
    }

    # بيانات إضافية للتسجيل — فقط إذا كان مفتوحاً
    if event.registration_enabled:
        public_info.update({
            "require_payment": event.require_payment,
            "ticket_price": float(event.ticket_price or 0),
            "currency": event.currency or "DZD",
            "payment_gateway": event.payment_gateway,
            "welcome_title": event.welcome_title,
            "welcome_subtitle": event.welcome_subtitle,
            "show_countdown": event.show_countdown,
            "event_timestamp": event.event_timestamp,
            "organizer_text": event.organizer_text,
        })

    return public_info

@router.get("/{event_id}")
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # تأكد من أن المنظم يملك صلاحية الوصول لهذه الفعالية
    if current_user.role != "super_admin" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this event")
        
    return event

@router.patch("/{event_id}")
async def update_event(
    event_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role != "super_admin" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ─── تحديد أنواع الأعمدة من الـ mapper لتحويل القيم بشكل صحيح ───
    mapper = class_mapper(Event)
    column_types = {col.key: type(col.columns[0].type) for col in mapper.column_attrs}

    for key, value in data.items():
        if not hasattr(event, key):
            continue
        col_type = column_types.get(key)
        # تحويل string → date لحقول التاريخ
        if col_type is Date and isinstance(value, str) and value:
            try:
                value = datetime.strptime(value[:10], "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=422, detail=f"تنسيق التاريخ غير صحيح لـ '{key}': {value} (المطلوب: YYYY-MM-DD)")
        # تحويل string → datetime لحقول التوقيت
        elif col_type is DateTime and isinstance(value, str) and value:
            try:
                value = datetime.fromisoformat(value)
            except ValueError:
                raise HTTPException(status_code=422, detail=f"تنسيق التوقيت غير صحيح لـ '{key}': {value}")
        setattr(event, key, value)

    await db.commit()
    await db.refresh(event)
    return event

@router.post("/")
async def create_event(
    name: str,
    location: str = "",
    date: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    إنشاء فعالية جديدة وربطها بالمنظم الحالي.
    """
    parsed_date = None
    if date:
        try:
            parsed_date = datetime.strptime(date[:10], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail=f"تنسيق التاريخ غير صحيح: {date} (المطلوب: YYYY-MM-DD)")

    new_event = Event(
        event_name=name,
        location=location,
        event_date=parsed_date,
        created_by=current_user.id
    )
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    return new_event

@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    حذف فعالية مع جميع بياناتها المرتبطة.
    مسموح فقط للمنظم المالك أو super_admin.
    """
    from app.models.participant import Participant, Attendance
    from app.models.others import Speaker, Sponsor, AgendaSession, Poll, PollOption, PollVote, Question, SocialPost, PostComment, PostLike, UserNotification, AuditLog, Document

    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    if current_user.role != "super_admin" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="غير مصرح لك بحذف هذه الفعالية")

    # حذف البيانات المرتبطة بالترتيب الصحيح (FK constraints)
    part_stmt = select(Participant.id).filter(Participant.event_id == event_id)
    part_result = await db.execute(part_stmt)
    participant_ids = part_result.scalars().all()
    
    if participant_ids:
        await db.execute(
            delete(Attendance).filter(Attendance.participant_id.in_(participant_ids))
        )
        await db.execute(
            delete(PollVote).filter(PollVote.participant_id.in_(participant_ids))
        )
    
    await db.execute(delete(Participant).filter(Participant.event_id == event_id))
    await db.execute(delete(Speaker).filter(Speaker.event_id == event_id))
    await db.execute(delete(AgendaSession).filter(AgendaSession.event_id == event_id))
    await db.execute(delete(Sponsor).filter(Sponsor.event_id == event_id))

    # حذف الاستطلاعات وخياراتها وتصويتاتها
    poll_stmt = select(Poll.id).filter(Poll.event_id == event_id)
    poll_result = await db.execute(poll_stmt)
    poll_ids = poll_result.scalars().all()
    if poll_ids:
        await db.execute(delete(PollVote).filter(PollVote.poll_id.in_(poll_ids)))
        await db.execute(delete(PollOption).filter(PollOption.poll_id.in_(poll_ids)))
        await db.execute(delete(Poll).filter(Poll.event_id == event_id))

    # حذف المنشورات الاجتماعية وتعليقاتها وإعجاباتها
    post_stmt = select(SocialPost.id).filter(SocialPost.event_id == event_id)
    post_result = await db.execute(post_stmt)
    post_ids = post_result.scalars().all()
    if post_ids:
        await db.execute(delete(PostComment).filter(PostComment.post_id.in_(post_ids)))
        await db.execute(delete(PostLike).filter(PostLike.post_id.in_(post_ids)))
        await db.execute(delete(SocialPost).filter(SocialPost.event_id == event_id))

    # حذف البقية
    await db.execute(delete(Question).filter(Question.event_id == event_id))
    await db.execute(delete(UserNotification).filter(UserNotification.event_id == event_id))
    await db.execute(delete(AuditLog).filter(AuditLog.event_id == event_id))
    await db.execute(delete(Document).filter(Document.event_id == event_id))

    await db.delete(event)
    await db.commit()

    return {"status": "success", "message": f"تم حذف الفعالية '{event.event_name}'"}

@router.post("/{event_id}/freeze")
async def toggle_event_freeze(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = await db.get(Event, event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    event.list_frozen = not event.list_frozen
    await db.commit()
    return {"status": "success", "is_frozen": event.list_frozen}

@router.get("/{event_id}/settings")
async def get_public_event_settings(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """جلب إعدادات الفعالية العامة (للكيوسك والتسجيل)"""
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "welcome_title": event.welcome_title or "بوابة الخدمة الذاتية",
        "welcome_subtitle": event.welcome_subtitle or "ابحث عن بياناتك وحمل بطاقتك",
        "primary_color": event.primary_color or "#10b981",
        "registration_enabled": event.registration_enabled
    }

@router.post("/{event_id}/reset-attendance")
async def reset_event_attendance(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.participant import Participant, Attendance

    event = await db.get(Event, event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # حذف سجلات الحضور من جدول attendance
    part_stmt = select(Participant.id).filter(Participant.event_id == event_id)
    part_result = await db.execute(part_stmt)
    participant_ids = part_result.scalars().all()
    
    deleted_count = 0
    if participant_ids:
        del_stmt = delete(Attendance).filter(Attendance.participant_id.in_(participant_ids))
        del_result = await db.execute(del_stmt)
        deleted_count = del_result.rowcount

    await db.commit()
    return {
        "status": "success",
        "message": f"تم مسح {deleted_count} سجل حضور",
        "deleted_count": deleted_count
    }

@router.post("/{event_id}/display/scene")
async def change_display_scene(
    event_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.core.websockets import manager
    
    event = await db.get(Event, event_id)
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
async def get_registration_fields(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """جلب الحقول المخصصة المطلوبة للتسجيل في فعالية معينة (مفتوح للعموم)"""
    from app.models.rbac import CustomFieldDefinition
    stmt = select(CustomFieldDefinition).filter(
        CustomFieldDefinition.event_id == event_id
    )
    result = await db.execute(stmt)
    fields = result.scalars().all()
    
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
async def create_registration_field(
    event_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """إضافة حقل جديد لنموذج التسجيل"""
    from app.models.rbac import CustomFieldDefinition
    event = await db.get(Event, event_id)
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
    await db.commit()
    await db.refresh(new_field)
    return new_field

@router.delete("/{event_id}/registration-fields/{field_id}")
async def delete_registration_field(
    event_id: int,
    field_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """حذف حقل من نموذج التسجيل"""
    from app.models.rbac import CustomFieldDefinition
    
    stmt = select(CustomFieldDefinition).filter(
        CustomFieldDefinition.id == field_id,
        CustomFieldDefinition.event_id == event_id
    )
    res = await db.execute(stmt)
    field = res.scalars().first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # تحقق من الصلاحية عبر الفعالية
    event = await db.get(Event, event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.delete(field)
    await db.commit()
    return {"status": "success"}

@router.post("/{event_id}/logo")
async def upload_event_logo(
    event_id: int,
    logo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    event = await db.get(Event, event_id)
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
    await db.commit()
    await db.refresh(event)
    
    return {"status": "success", "logo_url": event.logo_url}

@router.get("/{event_id}/halls")
async def list_event_halls(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.event import EventHall
    stmt = select(EventHall).filter(EventHall.event_id == event_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/{event_id}/halls")
async def create_event_hall(
    event_id: int, 
    data: dict, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    from app.models.event import EventHall
    event = await db.get(Event, event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_hall = EventHall(
        event_id=event_id,
        name=data.get("name"),
        capacity=data.get("capacity", 100),
        hall_type=data.get("hall_type", "main")
    )
    db.add(new_hall)
    await db.commit()
    await db.refresh(new_hall)
    return new_hall

@router.delete("/{event_id}/halls/{hall_id}")
async def delete_event_hall(
    event_id: int, 
    hall_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    from app.models.event import EventHall
    stmt = select(EventHall).filter(EventHall.id == hall_id, EventHall.event_id == event_id)
    res = await db.execute(stmt)
    hall = res.scalars().first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    
    event = await db.get(Event, event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.delete(hall)
    await db.commit()
    return {"status": "success"}
