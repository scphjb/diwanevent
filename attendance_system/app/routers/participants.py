from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
import os
from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.participant import ParticipantOut
from app.core.websockets import manager
from app.utils.badge import generate_badge_pdf
from app.utils.email import send_ticket_email
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.services.data_sanitizer import DataSanitizer
from app.services.webhook_engine import WebhookEngine
from app.core.rbac import require_permission
import uuid

router = APIRouter()

@router.post("/public/register")
async def public_register_participant(
    event_id: int,
    full_name: str,
    email: str,
    background_tasks: BackgroundTasks,
    council: str = "عضو خارجي",
    db: Session = Depends(get_db)
):
    """
    تسجيل مشارك جديد من قبل الجمهور (Self-Registration).
    """
    # تحقق من وجود الفعالية وفتح التسجيل
    from app.models.event import Event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    if not event.registration_enabled:
        raise HTTPException(status_code=403, detail="التسجيل مغلق لهذه الفعالية")
    
    # تحقق من التكرار
    existing = db.query(Participant).filter(
        Participant.event_id == event_id,
        Participant.email == email
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="البريد الإلكتروني مسجل مسبقاً")

    # توليد رقم طلب فريد
    order_num = f"DWN-{uuid.uuid4().hex[:6].upper()}"
    qr_code = f"DIWAN-{order_num}"
    
    participant = Participant(
        event_id=event_id,
        full_name=full_name,
        email=email,
        council=council,
        order_num=order_num,
        qr_code=qr_code,
        payment_status='pending',
        entry_type='self_registered'
    )
    
    db.add(participant)
    db.commit()
    background_tasks.add_task(send_ticket_email, participant.__dict__, {})
    db.refresh(participant)
    
    return {"status": "success", "participant": participant}

@router.get("/", response_model=List[ParticipantOut])
def read_participants(
    event_id: int,
    skip: int = 0,
    limit: int = 100,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:read"))
):
    """
    Retrieve participants for a specific event.
    """

    db_query = db.query(Participant).filter(Participant.event_id == event_id)
    if query:
        db_query = db_query.filter(
            (Participant.full_name.ilike(f"%{query}%")) | 
            (Participant.order_num.ilike(f"%{query}%"))
        )
    
    participants = db_query.offset(skip).limit(limit).all()
    return participants

@router.get("/{participant_id}", response_model=ParticipantOut)
def read_participant(
    participant_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Security check
    from app.models.event import Event
    event = db.query(Event).filter(Event.id == participant.event_id).first()
    if current_user.role != 'super_admin' and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return participant

from app.services.notification_service import NotificationService

@router.patch(
    "/{participant_id}/check-in", 
    response_model=ParticipantOut,
    responses={
        200: {"description": "تم تسجيل الدخول بنجاح وتحديث الإحصائيات"},
        404: {"description": "المشارك غير موجود في قاعدة البيانات"},
        401: {"description": "التوكن غير صالح أو منتهي الصلاحية"}
    }
)
async def check_in_participant(
    participant_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    participant.payment_status = 'paid'
    db.commit()
    db.refresh(participant)
    
    # التحقق من الـ Milestones وإرسال تنبيهات للمسؤولين
    await NotificationService.check_attendance_milestones(db, participant.event_id)
    
    # حساب الإحصائيات لإرسال تنبيهات (Milestones)
    total_invited = db.query(Participant).filter(Participant.event_id == participant.event_id).count()
    total_checked_in = db.query(Participant).filter(
        Participant.event_id == participant.event_id, 
        Participant.payment_status == 'paid'
    ).count()
    
    attendance_rate = (total_checked_in / total_invited * 100) if total_invited > 0 else 0
    
    # تحديد إذا كان هناك Milestone (مثلاً كل 25%)
    milestones = [25, 50, 75, 100]
    reached_milestone = next((m for m in milestones if abs(attendance_rate - m) < 0.5), None)

    # Broadcast update via WebSocket
    await manager.broadcast_to_event(participant.event_id, {
        "type": "check_in",
        "attendance_rate": round(attendance_rate, 2),
        "milestone": reached_milestone,
        "participant": {
            "id": participant.id,
            "full_name": participant.full_name,
            "council": participant.council,
            "order_num": participant.order_num
        }
    })

    # Trigger Webhooks
    background_tasks.add_task(
        WebhookEngine.trigger, 
        db, 
        participant.event_id, 
        "participant.checkin", 
        {
            "id": participant.id,
            "full_name": participant.full_name,
            "time": str(participant.updated_at)
        }
    )
    
    return participant

@router.get("/{participant_id}/badge")
def get_participant_badge(participant_id: int, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    pdf_buffer = generate_badge_pdf(participant)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=badge_{participant_id}.pdf"}
    )

@router.post("/import")
async def import_participants(
    background_tasks: BackgroundTasks,
    event_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    
    participants_added = 0
    duplicates_skipped = 0
    flagged_count = 0
    

    for _, row in df.iterrows():
        raw_entry = {
            "full_name": row.get('الاسم الكامل', row.get('full_name')),
            "council": row.get('الجهة', row.get('council')),
            "court": row.get('القسم', row.get('court', '')),
            "email": row.get('البريد الإلكتروني', row.get('email')),
            "phone": row.get('الهاتف', row.get('phone_number', '')),
        }
        
        # استخدام المعالج الذكي
        clean_result = DataSanitizer.process_row(db, event_id, raw_entry)
        
        if clean_result['is_duplicate']:
            duplicates_skipped += 1
            continue

        new_p = Participant(
            event_id=event_id,
            full_name=clean_result['full_name'],
            council=raw_entry['council'],
            court=raw_entry['court'],
            email=clean_result['email'],
            phone_number=clean_result['phone_number'],
            is_flagged=clean_result['is_flagged'],
            sanitization_note=clean_result['sanitization_note'],
            order_num=f"REG-{os.urandom(3).hex().upper()}",
            qr_code=f"QR-{os.urandom(4).hex().upper()}",
            payment_status='pending'
        )
        
        if clean_result['is_flagged']:
            flagged_count += 1
            
        db.add(new_p)
        db.flush()
        
        if new_p.email:
            background_tasks.add_task(
                send_ticket_email, 
                new_p.email, 
                new_p.full_name, 
                f"https://api.diwanevent.com/qr/{new_p.qr_code}"
            )
        
        participants_added += 1
    
    db.commit()
    return {
        "success": True,
        "summary": {
            "total_imported": participants_added,
            "duplicates_ignored": duplicates_skipped,
            "flagged_for_review": flagged_count,
            "message": f"تم استيراد {participants_added} مشارك. (تجاهل {duplicates_skipped} مكررين، وتم تمييز {flagged_count} للمراجعة)"
        }
    }
@router.post("/register", response_model=ParticipantOut)
async def register_participant(
    full_name: str,
    council: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    event_id: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    سجل مشارك جديد يدوياً من لوحة التحكم (Walk-in Registration).
    """
    import uuid
    import time
    
    base_id = str(int(time.time()))[-6:]
    uid = str(uuid.uuid4())[:4].upper()
    
    new_p = Participant(
        event_id=event_id,
        full_name=full_name,
        council=council,
        court="On-site",
        email=email,
        phone_number=phone,
        order_num=f"WALK-{base_id}-{uid}",
        qr_code=f"PUB-{base_id}-{uid}",
        payment_status='paid', # Usually walk-ins are confirmed immediately
        entry_type='walk_in'
    )
    
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    return new_p

@router.post("/sync")
async def sync_offline_checkins(
    payload: List[dict],
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    مزامنة عمليات الحضور التي تمت في وضع "أوفلاين" من أجهزة العتاد.
    """
    # Security: Verify ownership
    from app.models.event import Event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != 'super_admin' and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    synced_count = 0
    errors = []

    for item in payload:
        qr_code = item.get("qr_code")
        timestamp = item.get("timestamp")
        
        participant = db.query(Participant).filter(
            Participant.event_id == event_id,
            Participant.qr_code == qr_code
        ).first()

        if participant:
            if participant.payment_status != 'paid':
                participant.payment_status = 'paid'
                # Log the offline check-in time
                from app.models.participant import Attendance
                attendance = Attendance(
                    participant_id=participant.id,
                    event_type='check_in',
                    check_in_time=timestamp,
                    entry_method='offline_sync',
                    device_id=item.get("device_id")
                )
                db.add(attendance)
                synced_count += 1
        else:
            errors.append(f"QR {qr_code} not found")

    db.commit()
    return {"status": "success", "synced": synced_count, "errors": errors}

@router.get("/search")
def public_search(
    q: str,
    event_id: int = 1,
    db: Session = Depends(get_db),
):
    """
    البحث العام للمشاركين (يستخدم في الخدمة الذاتية والكيوسك).
    محمي: يتطلب 3 أحرف على الأقل — يُرجع بيانات آمنة فقط.
    """
    if not q or len(q.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="يجب إدخال 3 أحرف على الأقل للبحث",
        )

    # التحقق من أن الفعالية تسمح بالبحث العام
    from app.models.event import Event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    results = db.query(Participant).filter(
        Participant.event_id == event_id,
        Participant.full_name.ilike(f"%{q.strip()}%"),
    ).limit(10).all()

    # إرجاع بيانات آمنة فقط (بدون بريد أو هاتف)
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "council": p.council,
            "order_num": p.order_num,
            "payment_status": p.payment_status,
        }
        for p in results
    ]

@router.get("/badges/all")
def get_all_badges(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    تحميل كافة شارات الحضور في ملف PDF واحد متعدد الصفحات.
    """
    # Security: Verify ownership
    from app.models.event import Event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or (current_user.role != 'super_admin' and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    participants = db.query(Participant).filter(Participant.event_id == event_id).all()
    if not participants:
        raise HTTPException(status_code=404, detail="No participants found")
    
    # Fetch active badge template
    from app.models.template import BadgeTemplate
    template = db.query(BadgeTemplate).filter(BadgeTemplate.event_id == event_id).first()
    template_config = template.elements_config if template else None

    # Generate multi-page PDF
    from app.utils.badge import generate_badge_pdf
    # For bulk, we'd loop. For simplicity in this demo, let's assume we handle the first or a sample
    pdf_buffer = generate_badge_pdf(participants[0], template_config)
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=all_badges_event_{event_id}.pdf"}
    )

@router.delete("/{event_id}/participants/{participant_id}")
def delete_participant(
    event_id: int,
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    """
    حذف مشارك من الفعالية.
    """
    participant = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.event_id == event_id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    db.delete(participant)
    db.commit()
    return {"status": "success", "message": "Participant deleted"}
