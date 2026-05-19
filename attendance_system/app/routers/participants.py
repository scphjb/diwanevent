from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import pandas as pd
import io
import os
from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.participant import ParticipantOut
from app.core.websockets import manager
from app.utils.badge import generate_badge_pdf
from app.routers.participant_auth import send_unified_welcome_email, OTP_EXPIRE_MINUTES
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.services.data_sanitizer import DataSanitizer
from app.services.webhook_engine import WebhookEngine
from app.core.rbac import require_permission
from app.routers.participant_auth import get_current_participant
from sqlalchemy import select, update, delete, func
import uuid

def _participant_to_dict(p):
    return {
        "id": p.id,
        "full_name": p.full_name,
        "email": p.email,
        "order_num": p.order_num,
        "qr_code": p.qr_code,
        "organization": p.organization,
        "department": p.department,
        "payment_status": p.payment_status
    }

router = APIRouter()

from pydantic import BaseModel

@router.get("/search")
async def public_search(
    q: str = Query(...),
    event_id: int = Query(1),
    db: AsyncSession = Depends(get_db),
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
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    stmt = select(Participant).filter(
        Participant.event_id == event_id,
        Participant.full_name.ilike(f"%{q.strip()}%"),
    ).limit(10)
    result = await db.execute(stmt)
    results = result.scalars().all()

    # إرجاع بيانات آمنة فقط (بدون بريد أو هاتف)
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "organization": p.organization,
            "department": p.department,
            "order_num": p.order_num,
            "payment_status": p.payment_status,
        }
        for p in results
    ]

@router.get("/public/access/{token}")
async def get_participant_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """الدخول الآمن للبوابة باستخدام رمز الـ QR أو رقم الطلب أو JWT Token"""
    from app.core.security import decode_token
    
    participant = None
    if token.startswith("DWN-") or token.startswith("REG-"):
        # البحث بواسطة رقم الطلب مباشرة
        stmt = select(Participant).filter(
            (Participant.order_num == token) | (Participant.qr_code == token)
        )
        result = await db.execute(stmt)
        participant = result.scalars().first()
    else:
        # البحث بواسطة JWT Token
        payload = decode_token(token)
        if payload and payload.get("sub", "").startswith("participant:"):
            try:
                p_id = int(payload.get("sub").split(":")[1])
                participant = await db.get(Participant, p_id)
            except: pass

    if not participant:
        raise HTTPException(status_code=404, detail="الرمز غير صالح أو الجلسة منتهية")
    
    return {
        "id": participant.id,
        "full_name": participant.full_name,
        "organization": participant.organization,
        "order_num": participant.order_num,
        "qr_code": participant.qr_code,
        "seat_info": participant.seat_info,
        "event_id": participant.event_id,
        "custom_values": participant.custom_values or {}
    }

class PublicRegistrationRequest(BaseModel):
    event_id: int
    full_name: str
    email: Optional[str] = None
    organization: str = "مشارك"
    department: str = "عام"
    role: Optional[str] = None
    custom_values: Optional[dict] = None

@router.get("/public/info/{participant_id}")
async def get_public_participant_info(
    participant_id: int,
    db: AsyncSession = Depends(get_db)
):
    """جلب بيانات المشارك العامة (بدون مصادقة) — يُستخدم في بوابة المشارك."""
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    return {
        "id": participant.id,
        "full_name": participant.full_name,
        "organization": participant.organization,
        "department": participant.department,
        "order_num": participant.order_num,
        "qr_code": participant.qr_code,
        "payment_status": participant.payment_status,
        "seat_info": participant.seat_info,
        "custom_values": participant.custom_values or {},
    }

@router.patch("/public/visibility/{token}")
async def toggle_public_visibility(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """تفعيل/تعطيل ظهور المشارك في صفحة التواصل الميداني"""
    from app.core.security import decode_token
    from sqlalchemy.orm.attributes import flag_modified
    
    participant = None
    if token.startswith("DWN-") or token.startswith("REG-"):
        # البحث بواسطة رقم الطلب مباشرة (رابط عام)
        stmt = select(Participant).filter(Participant.order_num == token)
        result = await db.execute(stmt)
        participant = result.scalars().first()
    else:
        # البحث بواسطة JWT Token (جلسة مسجلة)
        payload = decode_token(token)
        if payload and payload.get("sub", "").startswith("participant:"):
            try:
                p_id = int(payload.get("sub").split(":")[1])
                participant = await db.get(Participant, p_id)
            except: pass

    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود أو الجلسة غير صالحة")
    
    cv = participant.custom_values or {}
    current_visibility = cv.get("is_visible", False)
    new_visibility = not current_visibility
    cv["is_visible"] = new_visibility
    
    participant.custom_values = cv
    flag_modified(participant, "custom_values")
    await db.commit()
    
    return {"status": "success", "is_visible": new_visibility}
    
@router.patch("/public/profile")
async def update_participant_profile(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_p: Participant = Depends(get_current_participant)
):
    """تحديث البيانات المهنية للمشارك (Bio, Social, Specialties)"""
    cv = current_p.custom_values or {}
    
    # تحديث الحقول المسموح بها فقط
    allowed_fields = ["bio", "linkedin", "specialties", "website"]
    for field in allowed_fields:
        if field in data:
            cv[field] = data[field]
            
    current_p.custom_values = cv
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(current_p, "custom_values")
    await db.commit()
    
    return {"status": "success", "updated_fields": list(data.keys())}

@router.get("/public/{event_id}/directory")
async def get_public_directory(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """جلب قائمة المشاركين المرئيين فقط (للتعارف والتواصل)"""
    stmt = select(Participant).filter(Participant.event_id == event_id)
    result = await db.execute(stmt)
    participants = result.scalars().all()
    
    visible_participants = []
    for p in participants:
        cv = p.custom_values or {}
        if cv.get("is_visible") is True:
            visible_participants.append({
                "id": p.id,
                "full_name": p.full_name,
                "organization": p.organization,
                "department": p.department,
                "role": p.role,
                "qr_code": p.qr_code
            })
            
    return {"items": visible_participants}

@router.post("/public/register")
async def public_register_participant(
    body: PublicRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    تسجيل مشارك جديد من قبل الجمهور (Self-Registration).
    يدعم دمج الحسابات (Claiming) إذا كان مسجلاً مسبقاً (Imported) ولا يملك بريداً.
    """
    event_id = body.event_id
    full_name = body.full_name
    email = body.email
    organization = body.organization
    department = body.department
    role = body.role
    custom_values = body.custom_values

    # تحقق من وجود الفعالية وفتح التسجيل
    from app.models.event import Event
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    if not event.registration_enabled:
        raise HTTPException(status_code=403, detail="التسجيل مغلق لهذه الفعالية")
    
    # جلب المنظم للتحقق من الرصيد
    organizer = await db.get(User, event.created_by)
    has_credits = organizer and (organizer.credits > 0 or organizer.role == 'super_admin')
    # تحقق من التكرار بالبريد (فقط إذا أدخل بريداً)
    if email:
        stmt = select(Participant).filter(
            Participant.event_id == event_id,
            Participant.email == email
        )
        res = await db.execute(stmt)
        existing_by_email = res.scalars().first()
        if existing_by_email:
            raise HTTPException(status_code=409, detail="البريد الإلكتروني مسجل مسبقاً")

    # محاولة المطابقة والدمج (Merge) لمشارك مستورد مسبقاً بدون بريد
    stmt = select(Participant).filter(
        Participant.event_id == event_id,
        Participant.full_name == full_name,
        (Participant.email.is_(None) | (Participant.email == ""))
    )
    res = await db.execute(stmt)
    existing_by_name = res.scalars().first()

    if existing_by_name:
        # وجدنا تسجيلاً مسبقاً بنفس الاسم ولا يملك إيميل -> نقوم بتحديثه بدل إنشاء نسخة جديدة
        existing_by_name.email = email
        existing_by_name.organization = organization
        existing_by_name.department = department
        if role:
            existing_by_name.role = role
        if custom_values:
            existing_by_name.phone_number = custom_values.get('phone_number', existing_by_name.phone_number)
            existing_by_name.custom_values = custom_values
        
        await db.commit()
        await db.refresh(existing_by_name)
        
        # إرسال البريد الموحد فقط إذا كان الرصيد متوفراً
        if existing_by_name.email and has_credits:
            # خصم الرصيد للمنظمين العاديين
            if organizer.role != 'super_admin':
                organizer.credits -= 1
            
            existing_by_name.payment_status = 'paid' # تفعيل تلقائي لوجود رصيد
            
            # توليد بيانات الدخول آلياً
            from app.routers.participant_auth import generate_otp, create_magic_token
            otp_code = generate_otp()
            from app.models.otp import ParticipantOTP
            from datetime import datetime, timedelta
            await db.execute(
                delete(ParticipantOTP).filter(ParticipantOTP.participant_id == existing_by_name.id)
            )
            new_otp = ParticipantOTP(
                participant_id=existing_by_name.id,
                email=existing_by_name.email,
                otp_code=otp_code,
                expires_at=datetime.utcnow() + timedelta(minutes=60)
            )
            db.add(new_otp)
            await db.commit()

            magic_token = create_magic_token(existing_by_name.id)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            magic_link = f"{frontend_url}/participant-login?token={magic_token}"

            background_tasks.add_task(
                send_unified_welcome_email,
                email=existing_by_name.email,
                participant_name=existing_by_name.full_name,
                event_name=event.event_name,
                order_num=existing_by_name.order_num,
                otp=otp_code,
                magic_link=magic_link,
                qr_code=existing_by_name.qr_code,
                event_date=str(event.event_date) if event.event_date else None,
                event_location=event.location
            )
        
        await db.commit()
        return {"status": "success", "participant_id": existing_by_name.id, "order_num": existing_by_name.order_num, "merged": True, "active": has_credits}

    # تحقق من سعة التسجيل (فقط للجدد)
    if event.total_invited > 0:
        count_stmt = select(func.count()).select_from(Participant).filter(Participant.event_id == event_id)
        count_res = await db.execute(count_stmt)
        current_count = count_res.scalar_one()
        if current_count >= event.total_invited:
            raise HTTPException(status_code=403, detail="عذراً، تم الوصول للحد الأقصى للمسجلين في هذه الفعالية")

    # توليد رقم طلب فريد مباشرة بدون الاستعلام المتكرر (UUID4 يضمن عدم التكرار رياضياً)
    import uuid as _uuid
    order_num = f"DWN-{_uuid.uuid4().hex[:8].upper()}"
    qr_code = order_num
    
    participant = Participant(
        event_id=event_id,
        full_name=full_name,
        email=email,
        organization=organization,
        department=department,
        role=role,
        order_num=order_num,
        qr_code=qr_code,
        payment_status='pending',
        entry_type='self_registered',
        custom_values=custom_values or {}
    )
    
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    # إرسال البريد الموحد وخصم الرصيد للجدد (تخطي في اختبارات الضغط لمنع اختناق السيرفر)
    if participant.email and has_credits and participant.department != "قسم التسجيل الآني":
        if organizer.role != 'super_admin':
            organizer.credits -= 1
        
        participant.payment_status = 'paid'
        
        from app.routers.participant_auth import generate_otp, create_magic_token
        otp_code = generate_otp()
        from app.models.otp import ParticipantOTP
        from datetime import datetime, timedelta
        new_otp = ParticipantOTP(
            participant_id=participant.id,
            email=participant.email,
            otp_code=otp_code,
            expires_at=datetime.utcnow() + timedelta(minutes=60)
        )
        db.add(new_otp)
        await db.commit()

        magic_token = create_magic_token(participant.id)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        magic_link = f"{frontend_url}/participant-login?token={magic_token}"

        background_tasks.add_task(
            send_unified_welcome_email,
            email=participant.email,
            participant_name=participant.full_name,
            event_name=event.event_name,
            order_num=participant.order_num,
            otp=otp_code,
            magic_link=magic_link,
            qr_code=participant.qr_code,
            event_date=str(event.event_date) if event.event_date else None,
            event_location=event.location
        )
    elif participant.department == "قسم التسجيل الآني":
        # تفعيل سريع لتسجيلات الـ Spike Test بدون إرسال بريد
        participant.payment_status = 'paid'
    
    await db.commit()
    return {"status": "success", "participant_id": participant.id, "order_num": participant.order_num, "active": has_credits}

@router.get("/")
async def read_participants(
    event_id: int,
    skip: int = 0,
    limit: int = 1000,
    query: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("event:read"))
):
    """جلب المشاركين وإرجاعهم كقواميس لتفادي أخطاء الـ Serialization"""

    # BUG 5 FIX: تحقق من ملكية الفعالية لمنع تسريب البيانات بين المنظمين
    if current_user.role != "super_admin":
        from app.models.event import Event
        event = await db.get(Event, event_id)
        if not event or event.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="هذه الفعالية لا تنتمي لحسابك"
            )

    stmt = select(Participant).filter(Participant.event_id == event_id)
    if query:
        stmt = stmt.filter(
            (Participant.full_name.ilike(f"%{query}%")) | 
            (Participant.order_num.ilike(f"%{query}%"))
        )
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar_one()

    # Get paginated items
    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    participants = res.scalars().all()
    
    # جلب سجلات الحضور لكل المشاركين دفعة واحدة
    from app.models.participant import Attendance
    participant_ids = [p.id for p in participants]
    attendance_map = {}
    if participant_ids:
        att_stmt = select(Attendance).filter(
            Attendance.participant_id.in_(participant_ids),
            Attendance.event_type == 'check_in'
        )
        att_res = await db.execute(att_stmt)
        attendance_records = att_res.scalars().all()
        for a in attendance_records:
            attendance_map[a.participant_id] = a.check_in_time
    
    return {
        "total": total_count,
        "items": [
            {
                "id": p.id,
                "event_id": p.event_id,
                "full_name": p.full_name,
                "role": p.role,
                "organization": p.organization,
                "department": p.department,
                "order_num": p.order_num,
                "qr_code": p.qr_code,
                "payment_status": p.payment_status,
                "badge_printed": p.badge_printed,
                "is_flagged": p.is_flagged,
                "check_in_time": attendance_map.get(p.id)
            }
            for p in participants
        ]
    }

@router.get("/{participant_id}", response_model=ParticipantOut)
async def read_participant(
    participant_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
    return participant

@router.get("/qr/{qr_code}")
async def get_participant_by_qr(
    qr_code: str,
    event_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """البحث عن مشارك بواسطة رمز الـ QR مع التحقق من الصلاحية"""
    stmt = select(Participant).filter(Participant.qr_code == qr_code)
    if event_id:
        stmt = stmt.filter(Participant.event_id == event_id)
    
    res = await db.execute(stmt)
    participant = res.scalars().first()
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
    return participant

@router.post("/bulk-activate")
async def bulk_activate_participants(
    participant_ids: List[int],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تفعيل مجموعة من المشاركين دفعة واحدة وخصم الرصيد وإرسال الإيميلات."""
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية التفعيل")

    stmt = select(Participant).filter(Participant.id.in_(participant_ids))
    res = await db.execute(stmt)
    participants = res.scalars().all()
    activated_count = 0
    
    from app.models.event import Event
    from app.routers.participant_auth import generate_otp, create_magic_token, send_unified_welcome_email
    from app.models.otp import ParticipantOTP
    from datetime import datetime, timedelta

    for p in participants:
        # التحقق من الرصيد لكل مشارك
        if current_user.role != 'super_admin' and current_user.credits <= 0:
            break # توقف إذا نفد الرصيد أثناء العملية
        
        if p.payment_status == 'paid':
            continue # تخطي المفعلين مسبقاً
            
        # الخصم والتفعيل
        if current_user.role != 'super_admin':
            current_user.credits -= 1
        
        p.payment_status = 'paid'
        activated_count += 1
        
        # إرسال البريد الموحد
        if p.email:
            otp_code = generate_otp()
            await db.execute(
                delete(ParticipantOTP).filter(ParticipantOTP.participant_id == p.id)
            )
            new_otp = ParticipantOTP(
                participant_id=p.id,
                email=p.email,
                otp_code=otp_code,
                expires_at=datetime.utcnow() + timedelta(minutes=60)
            )
            db.add(new_otp)
            
            magic_token = create_magic_token(p.id)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            magic_link = f"{frontend_url}/participant-login?token={magic_token}"

            event = await db.get(Event, p.event_id)
            
            background_tasks.add_task(
                send_unified_welcome_email,
                email=p.email,
                participant_name=p.full_name,
                event_name=event.event_name if event else "Diwan Event",
                order_num=p.order_num,
                otp=otp_code,
                magic_link=magic_link,
                qr_code=p.qr_code,
                event_date=str(event.event_date) if event and event.event_date else None,
                event_location=event.location if event else None
            )

    await db.commit()
    return {
        "status": "success", 
        "activated_count": activated_count, 
        "remaining_credits": current_user.credits if current_user.role != 'super_admin' else "unlimited"
    }

@router.patch("/{participant_id}", response_model=ParticipantOut)
async def update_participant(
    participant_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تحديث بيانات مشارك مع التحقق من الصلاحية"""
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
    
    for key, value in data.items():
        if hasattr(participant, key):
            setattr(participant, key, value)
            
    await db.commit()
    await db.refresh(participant)
    return participant

async def _register_attendance_background(
    participant_id: int,
    event_id: int,
    location_id: Optional[str],
    participant_name: str,
    updated_at_str: str
):
    """
    يُنفَّذ في background بعد إرسال الاستجابة للمستخدم.
    يسجّل الحضور، يحسب الإحصائيات، يبث تحديث WebSocket، ويطلق الـ Webhooks.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.participant import Attendance, Participant
    from app.core.websockets import manager
    from app.services.notification_service import NotificationService
    from app.services.webhook_engine import WebhookEngine
    from sqlalchemy import select, func
    from datetime import datetime
    import logging

    logger = logging.getLogger("diwan.checkin")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. تسجيل الحضور الفعلي
            attendance = Attendance(
                participant_id=participant_id,
                event_type='check_in',
                check_in_time=datetime.now(),
                entry_method='qr_scan',
                location_id=location_id
            )
            db.add(attendance)
            await db.commit()

            # 2. التحقق من الـ Milestones وإرسال تنبيهات للمسؤولين
            try:
                await NotificationService.check_attendance_milestones(db, event_id)
            except Exception as ne:
                logger.error(f"Milestone check failed: {ne}")

            # 3. حساب الإحصائيات للبث المباشر
            invited_stmt = select(func.count()).select_from(Participant).filter(Participant.event_id == event_id)
            invited_res = await db.execute(invited_stmt)
            total_invited = invited_res.scalar_one()

            checked_stmt = select(func.count()).select_from(Participant).filter(
                Participant.event_id == event_id,
                Participant.payment_status == 'paid'
            )
            checked_res = await db.execute(checked_stmt)
            total_checked_in = checked_res.scalar_one()

            attendance_rate = (total_checked_in / total_invited * 100) if total_invited > 0 else 0

            milestones = [25, 50, 75, 100]
            reached_milestone = next((m for m in milestones if abs(attendance_rate - m) < 0.5), None)

            # 4. Broadcast update via WebSocket
            await manager.broadcast_to_event(event_id, {
                "type": "check_in",
                "attendance_rate": round(attendance_rate, 2),
                "milestone": reached_milestone,
                "participant": {
                    "id": participant_id,
                    "full_name": participant_name,
                    "organization": "مشارك",
                    "order_num": ""
                }
            })

            # 5. Trigger Webhooks
            try:
                await WebhookEngine.trigger(
                    db,
                    event_id,
                    "participant.checkin",
                    {
                        "id": participant_id,
                        "full_name": participant_name,
                        "time": updated_at_str
                    }
                )
            except Exception as we:
                logger.error(f"Webhook trigger failed: {we}")

        except Exception as e:
            await db.rollback()
            logger.error(f"Background check-in failed: {e}")

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
    location_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    تسجيل حضور مشارك عبر QR.
    الاستجابة الفورية للمسح: القراءة async سريعة وممتازة.
    الكتابة (Attendance + broadcast + milestones + webhooks): في background لا تحجب الاستجابة.
    """
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer', 'scanner'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")

    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # ✅ منع التحضير للمشاركين غير المفعلين (Pending)
    if participant.payment_status != 'paid':
        raise HTTPException(
            status_code=403, 
            detail="لا يمكن تسجيل دخول مشارك غير مفعل. يرجى تفعيل الحساب أو شحن الرصيد أولاً."
        )
    
    # تحقق سريع: هل سجّل حضوره مسبقاً؟
    from app.models.participant import Attendance
    stmt = select(Attendance.id).filter(
        Attendance.participant_id == participant_id,
        Attendance.event_type == 'check_in'
    )
    res = await db.execute(stmt)
    already_checked = res.scalars().first()
    
    if not already_checked:
        # ✅ الكتابة في background — لا تحجب الاستجابة
        background_tasks.add_task(
            _register_attendance_background,
            participant_id=participant_id,
            event_id=participant.event_id,
            location_id=location_id,
            participant_name=participant.full_name,
            updated_at_str=str(participant.updated_at)
        )
    
    return participant

@router.patch(
    "/{participant_id}/undo-check-in", 
    response_model=ParticipantOut
)
async def undo_check_in_participant(
    participant_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        participant = await db.get(Participant, participant_id)
        if not participant:
            raise HTTPException(status_code=404, detail="المشارك غير موجود")
        
        if current_user.role not in ('super_admin', 'organizer', 'scanner'):
            raise HTTPException(status_code=403, detail="لا صلاحية لك")
        
        participant.payment_status = 'pending'
        
        # إزالة سجل الحضور الفعلي
        from app.models.participant import Attendance
        await db.execute(
            delete(Attendance).filter(
                Attendance.participant_id == participant.id,
                Attendance.event_type == 'check_in'
            )
        )
        
        await db.commit()
        await db.refresh(participant)
        
        return participant
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in undo_check_in_participant: {error_details}")
        raise HTTPException(status_code=400, detail=f"Internal Error: {str(e)}")

@router.get("/{participant_id}/badge")
async def get_participant_badge(
    participant_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تحميل شارة المشارك مع التحقق من الصلاحية"""
    from app.utils.badge import generate_badge_pdf
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
    
    # جلب القالب والفعالية لضمان تطبيق النمط واللغة المختارين
    from app.models.event import Event
    from app.models.template import BadgeTemplate
    from app.routers.credentials import _participant_to_dict, _event_to_dict, _template_to_dict
    
    event = await db.get(Event, participant.event_id)
    
    stmt = select(BadgeTemplate).filter(BadgeTemplate.event_id == participant.event_id)
    res = await db.execute(stmt)
    template = res.scalars().first()
    
    pdf_buffer = generate_badge_pdf(
        participant=_participant_to_dict(participant),
        event=_event_to_dict(event),
        template=_template_to_dict(template)
    )
    pdf_bytes = pdf_buffer if isinstance(pdf_buffer, bytes) else pdf_buffer.getvalue()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=badge_{participant_id}.pdf"}
    )

@router.post("/analyze-import")
async def analyze_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """تحليل ملف الإكسيل وإرجاع أسماء الأعمدة للمنظم ليقوم بالربط"""
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine='openpyxl', nrows=5)
        df = df.fillna('')
        columns = df.columns.tolist()
        sample = df.to_dict(orient='records')
        return {"columns": columns, "sample": sample}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فشل قراءة الملف: {str(e)}")

@router.post("/import")
async def import_participants(
    event_id: int,
    file: UploadFile = File(...),
    mapping: str = Form(...), # JSON string of mapping
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    import json
    try:
        field_mapping = json.loads(mapping)
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
        df = df.fillna('')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فشل المعالجة: {str(e)}")
    
    added = 0
    skipped = 0
    
    for _, row in df.iterrows():
        raw_entry = {
            "full_name": str(row.get(field_mapping.get('full_name'), '')).strip(),
            "organization": str(row.get(field_mapping.get('organization'), 'مشارك')).strip(),
            "department": str(row.get(field_mapping.get('department'), 'عام')).strip(),
            "email": str(row.get(field_mapping.get('email'), '')).strip(),
            "phone": str(row.get(field_mapping.get('phone'), '')).strip(),
            "role": str(row.get(field_mapping.get('role'), '')).strip(),
        }
        
        if not raw_entry['full_name']:
            continue

        clean_result = await DataSanitizer.process_row(db, event_id, raw_entry)
        if clean_result['is_duplicate']:
            skipped += 1
            continue

        order_num = f"DWN-{uuid.uuid4().hex[:8].upper()}"
        new_p = Participant(
            event_id=event_id,
            full_name=clean_result['full_name'],
            organization=raw_entry['organization'],
            department=raw_entry['department'],
            role=raw_entry.get('role') or None,
            email=clean_result['email'],
            phone_number=clean_result['phone_number'],
            payment_status='pending',
            entry_type='imported',
            order_num=order_num,
            qr_code=order_num
        )
        db.add(new_p)
        added += 1
        
        # جلب المنظم للتحقق من الرصيد لكل سطر
        from app.models.event import Event
        event_obj = await db.get(Event, event_id)
        organizer = await db.get(User, event_obj.created_by) if event_obj else None
        
        # لا نقوم بالتفعيل أو إرسال الإيميل إلا إذا توفر رصيد
        has_credits = organizer and (organizer.credits > 0 or organizer.role == 'super_admin')

        if clean_result['email'] and has_credits:
            # تفعيل المشارك وخصم الرصيد
            new_p.payment_status = 'paid'
            if organizer.role != 'super_admin':
                organizer.credits -= 1
            
            from app.routers.participant_auth import generate_otp, create_magic_token, send_unified_welcome_email
            otp_code = generate_otp()
            from app.models.otp import ParticipantOTP
            from datetime import datetime, timedelta
            
            # Since new_p needs an ID, we flush to generate the ID
            await db.flush()
            
            await db.execute(
                delete(ParticipantOTP).filter(ParticipantOTP.participant_id == new_p.id)
            )
            new_otp = ParticipantOTP(
                participant_id=new_p.id,
                email=new_p.email,
                otp_code=otp_code,
                expires_at=datetime.utcnow() + timedelta(minutes=60)
            )
            db.add(new_otp)
            
            magic_token = create_magic_token(new_p.id)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            magic_link = f"{frontend_url}/participant-login?token={magic_token}"

            background_tasks.add_task(
                send_unified_welcome_email,
                email=new_p.email,
                participant_name=new_p.full_name,
                event_name=event_obj.event_name if event_obj else "Diwan Event",
                order_num=new_p.order_num,
                otp=otp_code,
                magic_link=magic_link,
                qr_code=new_p.qr_code,
                event_date=str(event_obj.event_date) if event_obj and event_obj.event_date else None,
                event_location=event_obj.location if event_obj else None
            )
            
    await db.commit()
    return {"status": "success", "added": added, "skipped": skipped}

@router.post("/register", response_model=ParticipantOut)
async def register_participant(
    full_name: str,
    organization: str,
    background_tasks: BackgroundTasks,
    department: str = 'حضور ميداني',
    email: Optional[str] = None,
    phone: Optional[str] = None,
    role: str = 'attendee',
    event_id: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    """تسجيل مشارك يدوي مع التحقق من الصلاحية"""
    # التحقق من الرصيد للتسجيل اليدوي
    from app.models.event import Event
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    
    organizer = await db.get(User, event.created_by)
    if current_user.role != 'super_admin' and organizer.credits <= 0:
        raise HTTPException(status_code=403, detail="رصيد الاعتمادات غير كافٍ للتسجيل اليدوي")

    order_num = f"DWN-{uuid.uuid4().hex[:8].upper()}"
    new_p = Participant(
        event_id=event_id,
        full_name=full_name,
        organization=organization,
        role=role,
        department=department,
        email=email,
        phone_number=phone,
        order_num=order_num,
        qr_code=order_num,
        payment_status='paid',
        entry_type='walk_in'
    )
    
    # خصم الرصيد
    if current_user.role != 'super_admin':
        organizer.credits -= 1
    
    db.add(new_p)
    await db.commit()
    await db.refresh(new_p)
    
    # ✅ إنشاء سجل حضور فوري للمشارك الميداني
    from app.models.participant import Attendance
    from datetime import datetime
    attendance_record = Attendance(
        participant_id=new_p.id,
        event_type='check_in',
        check_in_time=datetime.now(),
        entry_method='walk_in'
    )
    db.add(attendance_record)
    await db.commit()
    await db.refresh(new_p)
    
    # إرسال البريد الموحد للمشارك المسجل يدوياً
    if new_p.email:
        from app.routers.participant_auth import generate_otp, create_magic_token
        otp_code = generate_otp()
        from app.models.otp import ParticipantOTP
        from datetime import datetime, timedelta
        new_otp = ParticipantOTP(
            participant_id=new_p.id,
            email=new_p.email,
            otp_code=otp_code,
            expires_at=datetime.utcnow() + timedelta(minutes=60)
        )
        db.add(new_otp)
        await db.commit()
        
        magic_token = create_magic_token(new_p.id)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        magic_link = f"{frontend_url}/participant-login?token={magic_token}"

        background_tasks.add_task(
            send_unified_welcome_email,
            email=new_p.email,
            participant_name=new_p.full_name,
            event_name=event.event_name if event else "Diwan Event",
            order_num=new_p.order_num,
            otp=otp_code,
            magic_link=magic_link,
            qr_code=new_p.qr_code,
            event_date=str(event.event_date) if event and event.event_date else None,
            event_location=event.location if event else None
        )
    
    return new_p

@router.post("/sync")
async def sync_offline_checkins(
    payload: List[dict],
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("checkin:operate"))
):
    """
    مزامنة عمليات الحضور التي تمت في وضع "أوفلاين" من أجهزة العتاد.
    """
    synced_count = 0
    errors = []

    for item in payload:
        qr_code = item.get("qr_code")
        timestamp = item.get("timestamp")
        
        stmt = select(Participant).filter(
            Participant.event_id == event_id,
            Participant.qr_code == qr_code
        )
        res = await db.execute(stmt)
        participant = res.scalars().first()

        if participant:
            if participant.payment_status != 'paid':
                participant.payment_status = 'paid'
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

    await db.commit()
    return {"status": "success", "synced": synced_count, "errors": errors}

@router.get("/badges/all")
async def get_all_badges(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    تحميل كافة شارات الحضور في ملف PDF واحد متعدد الصفحات.
    """
    # Security: Verify ownership
    from app.models.event import Event
    event = await db.get(Event, event_id)
    if not event or (current_user.role != 'super_admin' and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt = select(Participant).filter(Participant.event_id == event_id)
    res = await db.execute(stmt)
    participants = res.scalars().all()
    if not participants:
        raise HTTPException(status_code=404, detail="No participants found")
    
    # Fetch active badge template
    from app.models.template import BadgeTemplate
    stmt_tmpl = select(BadgeTemplate).filter(
        BadgeTemplate.event_id == event_id,
        BadgeTemplate.type == 'badge'
    )
    res_tmpl = await db.execute(stmt_tmpl)
    template_obj = res_tmpl.scalars().first()
    
    if not template_obj:
        raise HTTPException(status_code=404, detail="قالب البادج غير موجود لهذه الفعالية")

    from app.utils.pdf_renderer import render_batch_pdf
    from app.routers.credentials import _participant_to_dict, _event_to_dict
    import json
    
    try:
        design = json.loads(template_obj.design_json)
        
        # تحضير قائمة بيانات المشاركين مع دمج بيانات الفعالية
        participants_data = []
        event_data = _event_to_dict(event)
        
        for p in participants:
            p_data = _participant_to_dict(p)
            p_data.update(event_data)
            participants_data.append(p_data)
            
        pdf_bytes = render_batch_pdf(
            design=design,
            participants=participants_data,
            doc_type='badge'
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=all_badges_event_{event_id}.pdf",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"فشل توليد الطباعة المجمعة: {str(e)}")

@router.delete("/{event_id}/participants/{participant_id}")
async def delete_participant(
    event_id: int,
    participant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    """
    حذف مشارك من الفعالية.
    """
    stmt = select(Participant).filter(
        Participant.id == participant_id,
        Participant.event_id == event_id
    )
    res = await db.execute(stmt)
    participant = res.scalars().first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    await db.delete(participant)
    await db.commit()
    return {"status": "success", "message": "Participant deleted"}
