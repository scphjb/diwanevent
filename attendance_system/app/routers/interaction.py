from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
import shutil
import uuid
import os
import logging

logger = logging.getLogger("diwan.interaction")

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, update, delete
from typing import List, Optional
from app.core.database import get_db
from app.models.others import SocialPost, PostLike, Question, Document, LogisticsRegistry, EventActivity, ActivityRegistration, CateringProfile, EventMeal, MealAttendance, CommitteeTask
from app.models.engagement import GamificationEvent
from app.models.participant import Participant
from app.core.websockets import manager
from pydantic import BaseModel
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.event import Event
from app.routers.notifications import get_current_user_or_participant

router = APIRouter()

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    file_url: str
    file_type: Optional[str] = "pdf"
    file_size: Optional[str] = ""
    sort_order: Optional[int] = 0

# --- Common Helper for Security ---
async def verify_event_access(event_id: int, db: AsyncSession, user: User):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.role != 'super_admin' and event.created_by != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return event

# --- Social Wall (Legacy Wall Adoption) ---
class PostCreate(BaseModel):
    event_id: int
    author_name: str
    content: str
    image_url: Optional[str] = None
    emoji: Optional[str] = '👏'

@router.post("/posts")
async def create_post(post_data: PostCreate, db: AsyncSession = Depends(get_db)):
    post = SocialPost(**post_data.dict(), is_approved=False)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    await manager.broadcast_to_event(post.event_id, {"type": "new_post_moderation", "post_id": post.id})
    return post

@router.get("/posts/{event_id}/approved")
async def get_approved_posts(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(SocialPost).filter(SocialPost.event_id == event_id, SocialPost.is_approved == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/posts/{post_id}/moderate")
async def moderate_post(post_id: int, approved: bool, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    post = await db.get(SocialPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await verify_event_access(post.event_id, db, user)
    post.is_approved = approved
    await db.commit()
    return {"status": "success"}

# --- Gamification (Leaderboards) ---
@router.get("/leaderboard/{event_id}")
async def get_leaderboard(event_id: int, limit: int = 10, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            Participant.id, Participant.full_name, Participant.organization,
            func.sum(GamificationEvent.points).label("total_points")
        )
        .join(GamificationEvent)
        .filter(Participant.event_id == event_id)
        .group_by(Participant.id)
        .order_by(func.sum(GamificationEvent.points).desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    results = res.all()
    return [{"id": r.id, "name": r.full_name, "points": r.total_points} for r in results]

# --- Q&A Session ---
class QuestionCreate(BaseModel):
    event_id: int
    name: str
    text: str
    session_id: Optional[int] = None

@router.post("/questions/")
async def submit_question(data: QuestionCreate, db: AsyncSession = Depends(get_db)):
    question = Question(
        event_id=data.event_id,
        name=data.name,
        text=data.text,
        session_id=data.session_id,
        is_approved=False # تحتاج مراجعة المنظم أولاً
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    
    # إبلاغ المنظم بوجود سؤال جديد للمراجعة
    await manager.broadcast_to_event(data.event_id, {
        "type": "new_question_moderation",
        "question": {
            "id": question.id,
            "name": question.name,
            "text": question.text,
            "session_id": question.session_id,
            "timestamp": question.timestamp.isoformat() if question.timestamp else None
        }
    })
    
    return question

@router.get("/questions/{event_id}")
async def list_questions(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Question).filter(Question.event_id == event_id).order_by(
        Question.pinned.desc(),
        Question.votes_count.desc(),
        Question.timestamp.desc()
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/questions/{q_id}/upvote")
async def upvote_question(q_id: int, db: AsyncSession = Depends(get_db)):
    question = await db.get(Question, q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.votes_count is None:
        question.votes_count = 0
    question.votes_count += 1
    
    await db.commit()
    await db.refresh(question)
    
    # بث مباشر للحدث لجميع المتصلين
    await manager.broadcast_to_event(question.event_id, {
        "type": "question_upvoted",
        "question": {
            "id": question.id,
            "votes_count": question.votes_count
        }
    })
    
    return {"status": "success", "votes_count": question.votes_count}

@router.patch("/questions/{q_id}/pin")
async def toggle_pin_question(
    q_id: int, 
    pinned: bool, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = await db.get(Question, q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await verify_event_access(question.event_id, db, user)
    
    # إلغاء تثبيت البقية في نفس الفعالية
    if pinned:
        stmt_unpin = update(Question).filter(Question.event_id == question.event_id).values(pinned=False)
        await db.execute(stmt_unpin)
    
    question.pinned = pinned
    await db.commit()
    
    if pinned:
        # بث للسكرينة الكبيرة
        await manager.broadcast_to_event(question.event_id, {
            "type": "question_pinned",
            "question": {
                "id": question.id,
                "author_name": question.name,
                "content": question.text
            }
        })
    else:
        # إخفاء السؤال من السكرينة الكبيرة
        await manager.broadcast_to_event(question.event_id, {
            "type": "scene_change",
            "scene": "main",
            "channel": "all"
        })
        
    return {"status": "success", "pinned": pinned}

@router.patch("/questions/{q_id}/status")
async def update_question_status(
    q_id: int, 
    data: dict, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = await db.get(Question, q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await verify_event_access(question.event_id, db, user)
    
    if "answered" in data:
        question.answered = data["answered"]
        if data["answered"]:
            question.pinned = False # بمجرد الإجابة نلغي التثبيت
    
    await db.commit()
    return {"status": "success"}

@router.get("/questions/{event_id}/pinned")
async def get_pinned_question(event_id: int, db: AsyncSession = Depends(get_db)):
    # جلب السؤال المثبت حالياً لهذه الفعالية
    stmt = select(Question).filter(Question.event_id == event_id, Question.pinned == True)
    res = await db.execute(stmt)
    q = res.scalars().first()
    if q:
        return {
            "id": q.id,
            "author_name": q.name,
            "content": q.text
        }
    return None

@router.delete("/questions/{q_id}")
async def delete_question(
    q_id: int, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    question = await db.get(Question, q_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await verify_event_access(question.event_id, db, user)
    await db.delete(question)
    await db.commit()
    return {"status": "success"}

@router.get("/events/{event_id}/documents")
async def get_event_documents(event_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Document).filter(Document.event_id == event_id, Document.is_active == True).order_by(Document.sort_order)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/events/{event_id}/documents")
async def create_document(
    event_id: int,
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    await verify_event_access(event_id, db, user)
    doc = Document(
        event_id=event_id,
        **data.dict()
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    stmt = select(Document).filter(Document.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await verify_event_access(doc.event_id, db, user)
    await db.delete(doc)
    await db.commit()
    return {"status": "success"}
# امتدادات مسموحة — whitelist صارم
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
}
MAX_FILE_SIZE_MB = 10

@router.post("/upload-document")
async def upload_document_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_user)
):
    # 1. التحقق من الامتداد
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"نوع الملف غير مسموح. الأنواع المقبولة: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 2. قراءة المحتوى مع حد الحجم
    content = await file.read(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"حجم الملف يتجاوز {MAX_FILE_SIZE_MB}MB")
    
    # 3. التحقق من MIME type الفعلي (ليس الامتداد)
    try:
        import magic as _magic
        mime = _magic.from_buffer(content[:2048], mime=True)
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"محتوى الملف غير مسموح: {mime}")
    except HTTPException:
        raise
    except Exception as e:
        # python-magic اختياري أو قد يفشل بسبب نقص ملفات النظام (libmagic)
        # الامتداد كافٍ كحد أدنى لحفظ الملف بأمان
        pass
    
    # 4. حفظ الملف
    from app.services.cloud_storage import StorageService
    storage = StorageService()
    file_url = storage.upload_image_or_file(
        file_content=content,
        filename=file.filename,
        folder="documents",
        content_type=file.content_type or "application/octet-stream"
    )
    
    return {
        "url": file_url,
        "type": ext.replace(".", "").lower(),
        "size": f"{len(content) / 1024 / 1024:.1f} MB"
    }

def make_naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is not None and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt

# --- Logistics & Accommodations Management ---
class LogisticsRegistryCreate(BaseModel):
    event_id: int
    participant_id: int
    transport_type: str # plane, train, private_car, none
    flight_number: Optional[str] = None
    arrival_time: Optional[datetime] = None
    departure_time: Optional[datetime] = None
    arrival_location: Optional[str] = None
    hotel_name: Optional[str] = None
    room_number: Optional[str] = None
    check_in_date: Optional[datetime] = None
    check_out_date: Optional[datetime] = None

class LogisticsDispatchUpdate(BaseModel):
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_details: Optional[str] = None
    shuttle_time: Optional[datetime] = None
    status: Optional[str] = 'pending' # pending, dispatched, arrived, completed

@router.get("/logistics/{participant_id}")
async def get_logistics(participant_id: int, db: AsyncSession = Depends(get_db)):
    host_name = ""
    host_phone = ""
    try:
        from app.models.others import CommitteeTask
        from app.models.participant import Participant
        task_stmt = select(CommitteeTask).filter(
            CommitteeTask.participant_id == participant_id,
            CommitteeTask.status != 'cancelled'
        ).order_by(CommitteeTask.created_at.desc())
        task_res = await db.execute(task_stmt)
        task = task_res.scalars().first()
        if task and task.assigned_to_id:
            host_stmt = select(Participant).filter(Participant.id == task.assigned_to_id)
            host_res = await db.execute(host_stmt)
            host = host_res.scalars().first()
            if host:
                host_name = host.full_name
                host_phone = host.phone_number or ""
    except Exception as e:
        logger.error(f"Error fetching host details for logistics: {e}")

    stmt = select(LogisticsRegistry).filter(LogisticsRegistry.participant_id == participant_id)
    res = await db.execute(stmt)
    registry = res.scalar_one_or_none()
    
    if not registry:
        return {
            "participant_id": participant_id,
            "transport_type": "none",
            "flight_number": "",
            "arrival_time": None,
            "departure_time": None,
            "arrival_location": "",
            "hotel_name": "",
            "room_number": "",
            "check_in_date": None,
            "check_out_date": None,
            "driver_name": "",
            "driver_phone": "",
            "vehicle_details": "",
            "shuttle_time": None,
            "status": "pending",
            "host_name": host_name,
            "host_phone": host_phone
        }
        
    return {
        "id": registry.id,
        "participant_id": registry.participant_id,
        "transport_type": registry.transport_type,
        "flight_number": registry.flight_number,
        "arrival_time": registry.arrival_time.isoformat() if registry.arrival_time else None,
        "departure_time": registry.departure_time.isoformat() if registry.departure_time else None,
        "arrival_location": registry.arrival_location,
        "hotel_name": registry.hotel_name,
        "room_number": registry.room_number,
        "check_in_date": registry.check_in_date.isoformat() if registry.check_in_date else None,
        "check_out_date": registry.check_out_date.isoformat() if registry.check_out_date else None,
        "driver_name": registry.driver_name,
        "driver_phone": registry.driver_phone,
        "vehicle_details": registry.vehicle_details,
        "shuttle_time": registry.shuttle_time.isoformat() if registry.shuttle_time else None,
        "status": registry.status,
        "host_name": host_name,
        "host_phone": host_phone
    }

@router.post("/logistics")
async def save_logistics(data: LogisticsRegistryCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(LogisticsRegistry).filter(LogisticsRegistry.participant_id == data.participant_id)
    res = await db.execute(stmt)
    registry = res.scalar_one_or_none()
    
    arrival_time = make_naive(data.arrival_time)
    departure_time = make_naive(data.departure_time)
    check_in_date = make_naive(data.check_in_date)
    check_out_date = make_naive(data.check_out_date)
    
    if not registry:
        registry = LogisticsRegistry(
            participant_id=data.participant_id,
            event_id=data.event_id,
            transport_type=data.transport_type,
            flight_number=data.flight_number,
            arrival_time=arrival_time,
            departure_time=departure_time,
            arrival_location=data.arrival_location,
            hotel_name=data.hotel_name,
            room_number=data.room_number,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            status="pending"
        )
        db.add(registry)
    else:
        registry.transport_type = data.transport_type
        registry.flight_number = data.flight_number
        registry.arrival_time = arrival_time
        registry.departure_time = departure_time
        registry.arrival_location = data.arrival_location
        registry.hotel_name = data.hotel_name
        registry.room_number = data.room_number
        registry.check_in_date = check_in_date
        registry.check_out_date = check_out_date
        
    await db.commit()
    await db.refresh(registry)
    
    # Broadcast live updates to organizers
    try:
        await manager.broadcast_to_event(registry.event_id, {
            "type": "logistics_updated",
            "participant_id": registry.participant_id,
            "logistics_id": registry.id
        })
    except Exception as ws_err:
        logger.warning(f"WebSocket broadcast failed for logistics save: {ws_err}")

    # Notify event creator (organizer)
    try:
        participant = await db.get(Participant, data.participant_id)
        p_name = participant.full_name if participant else "مشارك"
        
        event = await db.get(Event, data.event_id)
        if event and event.created_by:
            from app.routers.notifications import send_web_push_notification_to_target
            await send_web_push_notification_to_target(
                db=db,
                title="طلب نقل وإيواء جديد 🚗",
                body=f"قام المشترك {p_name} بتحديث تفاصيل وصوله أو مكان إقامته.",
                url="/dashboard/operations",
                user_ids=[event.created_by],
                event_id=data.event_id
            )
    except Exception as notif_err:
        logger.error(f"Failed to notify organizer about logistics request: {notif_err}")
        
    return registry

@router.patch("/logistics/dispatch/{participant_id}")
async def dispatch_logistics(
    participant_id: int, 
    data: LogisticsDispatchUpdate, 
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    stmt = select(LogisticsRegistry).filter(LogisticsRegistry.participant_id == participant_id)
    res = await db.execute(stmt)
    registry = res.scalar_one_or_none()
    if not registry:
        raise HTTPException(status_code=404, detail="Logistics registry not found for participant")
        
    if identity["type"] == "user":
        user = identity["obj"]
        await verify_event_access(registry.event_id, db, user)
    else:
        participant = identity["obj"]
        if participant.event_id != registry.event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        role = (participant.role or "").lower()
        keywords = ["نقل", "لوجست", "سائق", "transport", "logistics", "driver", "organizer", "منظم"]
        if not any(kw in role for kw in keywords) and "عام" not in role:
            raise HTTPException(status_code=403, detail="Not authorized for logistics")
    
    if data.driver_name is not None:
        registry.driver_name = data.driver_name
    if data.driver_phone is not None:
        registry.driver_phone = data.driver_phone
    if data.vehicle_details is not None:
        registry.vehicle_details = data.vehicle_details
    if data.shuttle_time is not None:
        registry.shuttle_time = make_naive(data.shuttle_time)
    if data.status is not None:
        registry.status = data.status

    # مزامنة البيانات عكسياً إلى المهمة الميدانية النشطة إن وجدت
    try:
        from app.models.others import CommitteeTask
        task_stmt = select(CommitteeTask).filter(
            CommitteeTask.event_id == registry.event_id,
            CommitteeTask.participant_id == participant_id,
            CommitteeTask.committee.in_(('transport', 'logistics'))
        )
        task_res = await db.execute(task_stmt)
        task = task_res.scalars().first()
        if task:
            if data.driver_name is not None:
                task.driver_name = data.driver_name
            if data.driver_phone is not None:
                task.driver_phone = data.driver_phone
            if data.vehicle_details is not None:
                task.driver_vehicle = data.vehicle_details
    except Exception as sync_err:
        logger.error(f"Failed to sync dispatch driver details back to CommitteeTask: {sync_err}")
        
    await db.commit()
    await db.refresh(registry)
    
    # Broadcast live updates to participants
    await manager.broadcast_to_event(registry.event_id, {
        "type": "logistics_dispatched",
        "participant_id": participant_id,
        "logistics": {
            "driver_name": registry.driver_name,
            "driver_phone": registry.driver_phone,
            "vehicle_details": registry.vehicle_details,
            "shuttle_time": registry.shuttle_time.isoformat() if registry.shuttle_time else None,
            "status": registry.status
        }
    })
    
    # Send push/db notification to the participant and presidents
    try:
        from app.routers.notifications import send_web_push_notification_to_target
        from app.models.participant import Participant
        # Get participant (guest) name
        p_stmt = select(Participant).filter(Participant.id == participant_id)
        p_res = await db.execute(p_stmt)
        part = p_res.scalars().first()
        p_name = part.full_name if part else "مشارك"

        msg = f"تم تحديث حالة النقل الخاصة بك إلى: {registry.status}."
        if registry.driver_name:
            msg = f"تم تعيين المرافق {registry.driver_name} ({registry.driver_phone or ''}). السيارة: {registry.vehicle_details or ''}."
        await send_web_push_notification_to_target(
            db=db,
            title="تحديث في تفاصيل النقل والوصول 🚗",
            body=msg,
            url="/dashboard/logistics",
            participant_ids=[participant_id],
            event_id=registry.event_id
        )

        # Notify committee presidents of logistics (transport)
        president_stmt = select(Participant).filter(
            Participant.event_id == registry.event_id,
            (Participant.role.like("%رئيس%") | Participant.role.like("%president%") | Participant.role.like("%organizer%") | Participant.role.like("%منظم%"))
        )
        pres_res = await db.execute(president_stmt)
        presidents = pres_res.scalars().all()
        pres_ids = [p.id for p in presidents if p.id != participant_id]

        if pres_ids:
            pres_msg = f"تم تأمين نقل الضيف {p_name} مع السائق {registry.driver_name or '---'}. الحالة: {registry.status}"
            await send_web_push_notification_to_target(
                db=db,
                title="تحديث ميداني في حالة النقل 🚗",
                body=pres_msg,
                url="/dashboard/logistics",
                participant_ids=pres_ids,
                event_id=registry.event_id
            )
    except Exception as e:
        logger.error(f"Failed to send push notifications for logistics dispatch: {e}")
        
    return registry

@router.get("/logistics/event/{event_id}")
async def list_event_logistics(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    if identity["type"] == "user":
        user = identity["obj"]
        await verify_event_access(event_id, db, user)
    else:
        participant = identity["obj"]
        if participant.event_id != event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        role = (participant.role or "").lower()
        keywords = ["نقل", "لوجست", "سائق", "transport", "logistics", "driver", "organizer", "منظم"]
        if not any(kw in role for kw in keywords) and "عام" not in role:
            raise HTTPException(status_code=403, detail="Not authorized for logistics")
    
    # Fetch all active CommitteeTask to resolve hosts/committee members
    from app.models.others import CommitteeTask
    from app.models.participant import Participant as HostParticipant
    
    tasks_stmt = select(CommitteeTask, HostParticipant).outerjoin(
        HostParticipant, CommitteeTask.assigned_to_id == HostParticipant.id
    ).filter(
        CommitteeTask.event_id == event_id,
        CommitteeTask.status != 'cancelled'
    )
    tasks_res = await db.execute(tasks_stmt)
    tasks_results = tasks_res.all()
    
    host_map = {}
    for task, host in tasks_results:
        if task.participant_id and host:
            host_map[task.participant_id] = {
                "name": host.full_name,
                "phone": host.phone_number or ""
            }

    stmt = select(LogisticsRegistry, Participant).join(
        Participant, LogisticsRegistry.participant_id == Participant.id
    ).filter(LogisticsRegistry.event_id == event_id)
    
    res = await db.execute(stmt)
    results = res.all()
    
    output = []
    for reg, part in results:
        host_info = host_map.get(reg.participant_id, {"name": "", "phone": ""})
        output.append({
            "id": reg.id,
            "participant_id": reg.participant_id,
            "participant_name": part.full_name,
            "participant_phone": part.phone_number,
            "participant_email": part.email,
            "transport_type": reg.transport_type,
            "flight_number": reg.flight_number,
            "arrival_time": reg.arrival_time.isoformat() if reg.arrival_time else None,
            "departure_time": reg.departure_time.isoformat() if reg.departure_time else None,
            "arrival_location": reg.arrival_location,
            "hotel_name": reg.hotel_name,
            "room_number": reg.room_number,
            "check_in_date": reg.check_in_date.isoformat() if reg.check_in_date else None,
            "check_out_date": reg.check_out_date.isoformat() if reg.check_out_date else None,
            "driver_name": reg.driver_name,
            "driver_phone": reg.driver_phone,
            "vehicle_details": reg.vehicle_details,
            "shuttle_time": reg.shuttle_time.isoformat() if reg.shuttle_time else None,
            "status": reg.status,
            "host_name": host_info["name"],
            "host_phone": host_info["phone"]
        })
    return output

# --- Pydantic Schemas for Activities ---
class ActivityCreate(BaseModel):
    event_id: int
    title: str
    description: Optional[str] = ""
    date_time: str # ISO String
    duration: Optional[str] = ""
    price: Optional[float] = 0.0
    currency: Optional[str] = "DZD"
    max_capacity: Optional[int] = None
    location: Optional[str] = ""
    gathering_point: Optional[str] = ""
    gathering_point_map_url: Optional[str] = ""

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date_time: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    max_capacity: Optional[int] = None
    location: Optional[str] = None
    gathering_point: Optional[str] = None
    gathering_point_map_url: Optional[str] = None

class RegisterActivityRequest(BaseModel):
    activity_id: int
    participant_id: int
    pickup_requested: Optional[bool] = False
    pickup_notes: Optional[str] = ""

# --- API Endpoints ---

@router.get("/activities/{event_id}")
async def list_activities(
    event_id: int, 
    participant_id: Optional[int] = None, 
    db: AsyncSession = Depends(get_db)
):
    # Fetch all active activities for this event
    stmt = select(EventActivity).filter(
        EventActivity.event_id == event_id,
        EventActivity.is_active == True
    ).order_by(EventActivity.date_time.asc())
    
    res = await db.execute(stmt)
    activities = res.scalars().all()
    
    # If participant_id is provided, check their registrations
    registered_ids = set()
    registration_map = {}
    if participant_id:
        reg_stmt = select(ActivityRegistration).filter(
            ActivityRegistration.participant_id == participant_id
        )
        reg_res = await db.execute(reg_stmt)
        regs = reg_res.scalars().all()
        for r in regs:
            registered_ids.add(r.activity_id)
            registration_map[r.activity_id] = {
                "pickup_requested": r.pickup_requested,
                "pickup_status": r.pickup_status,
                "pickup_notes": r.pickup_notes
            }
        
    output = []
    for act in activities:
        # Count current registrations
        count_stmt = select(func.count(ActivityRegistration.id)).filter(
            ActivityRegistration.activity_id == act.id
        )
        count_res = await db.execute(count_stmt)
        current_count = count_res.scalar() or 0
        
        reg_details = registration_map.get(act.id, {"pickup_requested": False, "pickup_status": "none", "pickup_notes": ""})
        
        output.append({
            "id": act.id,
            "event_id": act.event_id,
            "title": act.title,
            "description": act.description,
            "date_time": act.date_time.isoformat() + "Z" if act.date_time else None,
            "duration": act.duration,
            "price": act.price,
            "currency": act.currency,
            "max_capacity": act.max_capacity,
            "location": act.location,
            "gathering_point": act.gathering_point,
            "gathering_point_map_url": act.gathering_point_map_url,
            "is_registered": act.id in registered_ids,
            "current_count": current_count,
            "pickup_requested": reg_details["pickup_requested"],
            "pickup_status": reg_details["pickup_status"],
            "pickup_notes": reg_details["pickup_notes"]
        })
        
    return output

@router.get("/activities/registrations/{activity_id}")
async def list_activity_registrations(
    activity_id: int,
    db: AsyncSession = Depends(get_db)
):
    from app.models.participant import Participant
    stmt = select(Participant, ActivityRegistration).join(
        ActivityRegistration,
        ActivityRegistration.participant_id == Participant.id
    ).filter(
        ActivityRegistration.activity_id == activity_id
    )
    res = await db.execute(stmt)
    results = res.all()
    
    return [{
        "id": p.id,
        "full_name": p.full_name,
        "organization": p.organization,
        "phone_number": p.phone_number,
        "email": p.email,
        "qr_code": p.qr_code,
        "pickup_requested": reg.pickup_requested,
        "pickup_status": reg.pickup_status,
        "pickup_notes": reg.pickup_notes,
        "driver_name": reg.driver_name,
        "driver_phone": reg.driver_phone,
        "vehicle_details": reg.vehicle_details
    } for p, reg in results]

@router.post("/activities/register")
async def register_activity(
    req: RegisterActivityRequest,
    db: AsyncSession = Depends(get_db)
):
    # Verify activity exists and has capacity
    activity = await db.get(EventActivity, req.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
        
    # Check if already registered
    check_stmt = select(ActivityRegistration).filter(
        ActivityRegistration.activity_id == req.activity_id,
        ActivityRegistration.participant_id == req.participant_id
    )
    check_res = await db.execute(check_stmt)
    existing = check_res.scalar()
    if existing:
        return {"status": "already_registered", "registration_id": existing.id}
        
    # Check capacity
    if activity.max_capacity:
        count_stmt = select(func.count(ActivityRegistration.id)).filter(
            ActivityRegistration.activity_id == req.activity_id
        )
        count_res = await db.execute(count_stmt)
        current_count = count_res.scalar() or 0
        if current_count >= activity.max_capacity:
            raise HTTPException(status_code=400, detail="Activity capacity is full")
            
    # Create registration
    payment_status = "free" if activity.price == 0 else "pending"
    new_reg = ActivityRegistration(
        activity_id=req.activity_id,
        participant_id=req.participant_id,
        payment_status=payment_status,
        pickup_requested=req.pickup_requested,
        pickup_notes=req.pickup_notes
    )
    db.add(new_reg)
    await db.commit()
    await db.refresh(new_reg)
    
    # Notify event creator (organizer) if pickup is requested
    if req.pickup_requested:
        try:
            participant = await db.get(Participant, req.participant_id)
            p_name = participant.full_name if participant else "مشارك"
            event = await db.get(Event, activity.event_id)
            if event and event.created_by:
                from app.routers.notifications import send_web_push_notification_to_target
                await send_web_push_notification_to_target(
                    db=db,
                    title="طلب نقل لنشاط ترفيهي 🏕️",
                    body=f"طلب المشترك {p_name} النقل لنشاط: {activity.title}.",
                    url="/dashboard/operations",
                    user_ids=[event.created_by],
                    event_id=activity.event_id
                )
        except Exception as notif_err:
            logger.error(f"Failed to notify organizer about activity pickup request: {notif_err}")

    # Broadcast dynamic real-time event updates to all subscribers
    await manager.broadcast_to_event(activity.event_id, {
        "type": "activity_registered",
        "activity_id": req.activity_id,
        "participant_id": req.participant_id,
        "payment_status": payment_status
    })
    
    return {"status": "success", "registration_id": new_reg.id}

@router.delete("/activities/unregister/{activity_id}/{participant_id}")
async def unregister_activity(
    activity_id: int,
    participant_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ActivityRegistration).filter(
        ActivityRegistration.activity_id == activity_id,
        ActivityRegistration.participant_id == participant_id
    )
    res = await db.execute(stmt)
    reg = res.scalar()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    # Fetch activity for event_id
    activity = await db.get(EventActivity, activity_id)
    event_id = activity.event_id if activity else 0
    
    await db.delete(reg)
    await db.commit()
    
    if event_id:
        await manager.broadcast_to_event(event_id, {
            "type": "activity_unregistered",
            "activity_id": activity_id,
            "participant_id": participant_id
        })
        
class RegistrationUpdateRequest(BaseModel):
    activity_id: int
    participant_id: int
    pickup_requested: bool
    pickup_notes: Optional[str] = ""

@router.patch("/activities/update-registration")
async def update_activity_registration(
    req: RegistrationUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ActivityRegistration).filter(
        ActivityRegistration.activity_id == req.activity_id,
        ActivityRegistration.participant_id == req.participant_id
    )
    res = await db.execute(stmt)
    reg = res.scalar()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    # Fetch activity for event_id
    activity = await db.get(EventActivity, req.activity_id)
    event_id = activity.event_id if activity else 0

    was_pickup_requested = reg.pickup_requested
        
    reg.pickup_requested = req.pickup_requested
    if req.pickup_notes is not None:
        reg.pickup_notes = req.pickup_notes
        
    await db.commit()
    await db.refresh(reg)

    if req.pickup_requested and not was_pickup_requested:
        # Notify organizer
        try:
            participant = await db.get(Participant, req.participant_id)
            p_name = participant.full_name if participant else "مشارك"
            event = await db.get(Event, event_id)
            if event and event.created_by:
                from app.routers.notifications import send_web_push_notification_to_target
                await send_web_push_notification_to_target(
                    db=db,
                    title="طلب نقل لنشاط ترفيهي 🏕️",
                    body=f"طلب المشترك {p_name} النقل لنشاط: {activity.title if activity else ''}.",
                    url="/dashboard/operations",
                    user_ids=[event.created_by],
                    event_id=event_id
                )
        except Exception as notif_err:
            logger.error(f"Failed to notify organizer about activity pickup update: {notif_err}")

    if event_id:
        try:
            await manager.broadcast_to_event(event_id, {
                "type": "activity_registration_updated",
                "activity_id": req.activity_id,
                "participant_id": req.participant_id,
                "pickup_requested": reg.pickup_requested,
                "pickup_notes": reg.pickup_notes
            })
        except Exception as ws_err:
            logger.warning(f"WebSocket broadcast failed for activity registration update: {ws_err}")

    return {"status": "success", "pickup_requested": reg.pickup_requested, "pickup_notes": reg.pickup_notes}

class ActivityShuttleAssignRequest(BaseModel):
    activity_id: int
    participant_id: int
    driver_name: str
    driver_phone: str
    vehicle_details: Optional[str] = ""
    pickup_status: str  # pending, assigned, arrived, completed

@router.patch("/activities/assign-shuttle")
async def assign_activity_shuttle(
    req: ActivityShuttleAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ActivityRegistration).filter(
        ActivityRegistration.activity_id == req.activity_id,
        ActivityRegistration.participant_id == req.participant_id
    )
    res = await db.execute(stmt)
    reg = res.scalar()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    # Update fields
    reg.driver_name = req.driver_name
    reg.driver_phone = req.driver_phone
    reg.vehicle_details = req.vehicle_details
    reg.pickup_status = req.pickup_status
    
    await db.commit()
    await db.refresh(reg)
    
    # Send Web Push notification to the participant
    try:
        activity = await db.get(EventActivity, req.activity_id)
        act_title = activity.title if activity else "النشاط الترفيهي"
        from app.routers.notifications import send_web_push_notification_to_target
        await send_web_push_notification_to_target(
            db=db,
            title="تم تعيين المرافق وتأكيد النقل 🚍",
            body=f"تم تعيين المرافق {req.driver_name} لنقلكم لنشاط: {act_title}. رقم الهاتف: {req.driver_phone}.",
            url="/portal/activities",
            user_ids=[],
            event_id=activity.event_id if activity else 0,
            participant_id=req.participant_id
        )
    except Exception as notif_err:
        logger.error(f"Failed to notify participant about activity companion assignment: {notif_err}")

    # Broadcast websocket update
    activity = await db.get(EventActivity, req.activity_id)
    event_id = activity.event_id if activity else 0
    if event_id:
        try:
            await manager.broadcast_to_event(event_id, {
                "type": "activity_shuttle_assigned",
                "activity_id": req.activity_id,
                "participant_id": req.participant_id,
                "pickup_status": reg.pickup_status,
                "driver_name": reg.driver_name,
                "driver_phone": reg.driver_phone,
                "vehicle_details": reg.vehicle_details
            })
        except Exception as ws_err:
            logger.warning(f"WebSocket broadcast failed for activity shuttle assignment: {ws_err}")

    return {"status": "success", "pickup_status": reg.pickup_status}

@router.post("/activities/create")
async def create_activity(
    req: ActivityCreate,
    db: AsyncSession = Depends(get_db)
):
    dt = datetime.fromisoformat(req.date_time.replace("Z", "+00:00")).replace(tzinfo=None)
    new_act = EventActivity(
        event_id=req.event_id,
        title=req.title,
        description=req.description,
        date_time=dt,
        duration=req.duration,
        price=req.price,
        currency=req.currency,
        max_capacity=req.max_capacity,
        location=req.location,
        gathering_point=req.gathering_point,
        gathering_point_map_url=req.gathering_point_map_url,
        is_active=True
    )
    db.add(new_act)
    await db.commit()
    await db.refresh(new_act)
    
    try:
        from app.routers.notifications import send_web_push_notification_to_target
        await send_web_push_notification_to_target(
            db=db,
            title="نشاط ترفيهي جديد! 🏕️",
            body=f"تمت إضافة نشاط ترفيهي جديد: {new_act.title} في {new_act.location or ''}.",
            url="/dashboard/activities",
            event_id=new_act.event_id
        )
    except Exception as e:
        logger.error(f"Failed to send push notifications for new activity: {e}")

    return {
        "id": new_act.id,
        "event_id": new_act.event_id,
        "title": new_act.title,
        "description": new_act.description,
        "date_time": new_act.date_time.isoformat() + "Z" if new_act.date_time else None,
        "duration": new_act.duration,
        "price": new_act.price,
        "currency": new_act.currency,
        "max_capacity": new_act.max_capacity,
        "location": new_act.location,
        "gathering_point": new_act.gathering_point,
        "gathering_point_map_url": new_act.gathering_point_map_url,
    }

@router.patch("/activities/{activity_id}")
async def update_activity(
    activity_id: int,
    req: ActivityUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EventActivity).filter(EventActivity.id == activity_id)
    res = await db.execute(stmt)
    act = res.scalar()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    if req.title is not None:
        act.title = req.title
    if req.description is not None:
        act.description = req.description
    if req.date_time is not None:
        act.date_time = datetime.fromisoformat(req.date_time.replace("Z", "+00:00")).replace(tzinfo=None)
    if req.duration is not None:
        act.duration = req.duration
    if req.price is not None:
        act.price = req.price
    if req.currency is not None:
        act.currency = req.currency
    if req.max_capacity is not None:
        act.max_capacity = req.max_capacity
    if req.location is not None:
        act.location = req.location
    if req.gathering_point is not None:
        act.gathering_point = req.gathering_point
    if req.gathering_point_map_url is not None:
        act.gathering_point_map_url = req.gathering_point_map_url
        
    await db.commit()
    await db.refresh(act)

    try:
        from app.routers.notifications import send_web_push_notification_to_target
        # 1. جلب المشتركين المسجلين في هذا النشاط
        reg_stmt = select(ActivityRegistration.participant_id).filter(ActivityRegistration.activity_id == act.id)
        reg_res = await db.execute(reg_stmt)
        registered_pids = list(reg_res.scalars().all())

        if registered_pids:
            # أرسل إشعاراً مخصصاً للمشتركين المسجلين فقط (لا إشعار عام مكرر)
            await send_web_push_notification_to_target(
                db=db,
                title=f"تحديث في نشاطك الترفيهي: {act.title} 🏕️",
                body=f"تم تعديل تفاصيل النشاط الترفيهي: {act.title}. تفقد البوابة للمزيد.",
                url=f"/dashboard/activities",
                participant_ids=registered_pids,
                event_id=act.event_id
            )
        else:
            # لا يوجد مشتركون مسجلون — أرسل لجميع مشتركي الفعالية
            await send_web_push_notification_to_target(
                db=db,
                title=f"تحديث في النشاط الترفيهي: {act.title} 🏕️",
                body=f"تم تعديل تفاصيل النشاط الترفيهي: {act.title}. تفقد البوابة للمزيد.",
                url=f"/dashboard/activities",
                event_id=act.event_id
            )
    except Exception as e:
        logger.error(f"Failed to send push notifications for updated activity: {e}")

    return {
        "id": act.id,
        "event_id": act.event_id,
        "title": act.title,
        "description": act.description,
        "date_time": act.date_time.isoformat() + "Z" if act.date_time else None,
        "duration": act.duration,
        "price": act.price,
        "currency": act.currency,
        "max_capacity": act.max_capacity,
        "location": act.location,
        "gathering_point": act.gathering_point,
        "gathering_point_map_url": act.gathering_point_map_url,
    }

@router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EventActivity).filter(EventActivity.id == activity_id)
    res = await db.execute(stmt)
    act = res.scalar()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    await db.delete(act)
    await db.commit()
    return {"status": "success", "message": "Activity deleted"}

# --- Pydantic Schemas for Catering & Meals ---
class CateringProfileSave(BaseModel):
    participant_id: int
    event_id: int
    dietary_type: str
    allergies: Optional[str] = ""
    notes: Optional[str] = ""

class MealAttendanceToggle(BaseModel):
    meal_id: int
    participant_id: int
    attending: bool
    dietary_preference: Optional[str] = None

class MealCreate(BaseModel):
    event_id: int
    title: str
    description: Optional[str] = ""
    date_time: str # ISO string
    meal_type: str # breakfast, lunch, dinner, coffee_break

class MealUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date_time: Optional[str] = None
    meal_type: Optional[str] = None

# --- Catering & Sustainable Meals Endpoints ---

@router.get("/catering/{participant_id}")
async def get_catering_profile(
    participant_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(CateringProfile).filter(CateringProfile.participant_id == participant_id)
    res = await db.execute(stmt)
    profile = res.scalar()
    if not profile:
        return {
            "participant_id": participant_id,
            "dietary_type": "none",
            "allergies": "",
            "notes": ""
        }
    return {
        "id": profile.id,
        "participant_id": profile.participant_id,
        "event_id": profile.event_id,
        "dietary_type": profile.dietary_type,
        "allergies": profile.allergies,
        "notes": profile.notes
    }

@router.post("/catering")
async def save_catering_profile(
    req: CateringProfileSave,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(CateringProfile).filter(CateringProfile.participant_id == req.participant_id)
    res = await db.execute(stmt)
    profile = res.scalar()
    
    if profile:
        profile.dietary_type = req.dietary_type
        profile.allergies = req.allergies
        profile.notes = req.notes
        profile.event_id = req.event_id
    else:
        profile = CateringProfile(
            participant_id=req.participant_id,
            event_id=req.event_id,
            dietary_type=req.dietary_type,
            allergies=req.allergies,
            notes=req.notes
        )
        db.add(profile)
        
    await db.commit()
    await db.refresh(profile)
    return profile

@router.get("/catering/event/{event_id}")
async def list_event_catering_profiles(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """List all participants' dietary profiles for a given event."""
    stmt = (
        select(Participant, CateringProfile)
        .outerjoin(CateringProfile, Participant.id == CateringProfile.participant_id)
        .filter(Participant.event_id == event_id)
    )
    res = await db.execute(stmt)
    rows = res.all()
    output = []
    for participant, profile in rows:
        output.append({
            "id": profile.id if profile else f"none_{participant.id}",
            "participant_id": participant.id,
            "participant_name": participant.full_name,
            "participant_phone": participant.phone_number,
            "dietary_type": profile.dietary_type if profile else "none",
            "allergies": (profile.allergies or "") if profile else "",
            "notes": (profile.notes or "") if profile else ""
        })
    return output

@router.get("/meals/{event_id}")
async def list_event_meals(
    event_id: int,
    participant_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EventMeal).filter(
        EventMeal.event_id == event_id,
        EventMeal.is_active == True
    ).order_by(EventMeal.date_time.asc())
    res = await db.execute(stmt)
    meals = res.scalars().all()
    
    # If participant is provided, get RSVP status for each meal
    rsvp_dict = {}
    if participant_id:
        rsvp_stmt = select(MealAttendance).filter(MealAttendance.participant_id == participant_id)
        rsvp_res = await db.execute(rsvp_stmt)
        for att in rsvp_res.scalars().all():
            rsvp_dict[att.meal_id] = {
                "attending": att.attending,
                "dietary_preference": att.dietary_preference
            }
            
    output = []
    for meal in meals:
        has_rsvp = meal.id in rsvp_dict
        attending = rsvp_dict[meal.id]["attending"] if has_rsvp else True # Default to True (opt-in) until changed
        pref = rsvp_dict[meal.id]["dietary_preference"] if has_rsvp else None
        
        output.append({
            "id": meal.id,
            "event_id": meal.event_id,
            "title": meal.title,
            "description": meal.description,
            "date_time": meal.date_time.isoformat() + "Z" if meal.date_time else None,
            "meal_type": meal.meal_type,
            "has_rsvp": has_rsvp,
            "attending": attending,
            "dietary_preference": pref
        })
    return output

@router.post("/meals/rsvp")
async def toggle_meal_rsvp(
    req: MealAttendanceToggle,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(MealAttendance).filter(
        MealAttendance.meal_id == req.meal_id,
        MealAttendance.participant_id == req.participant_id
    )
    res = await db.execute(stmt)
    attendance = res.scalar()
    
    if attendance:
        attendance.attending = req.attending
        attendance.dietary_preference = req.dietary_preference
    else:
        attendance = MealAttendance(
            meal_id=req.meal_id,
            participant_id=req.participant_id,
            attending=req.attending,
            dietary_preference=req.dietary_preference
        )
        db.add(attendance)
        
    await db.commit()
    await db.refresh(attendance)
    
    # Optional: Broadcast real-time stats updates to organizers for kitchen forecasting
    return {"status": "success", "attending": attendance.attending}

@router.post("/meals/create")
async def create_event_meal(
    req: MealCreate,
    db: AsyncSession = Depends(get_db)
):
    dt = datetime.fromisoformat(req.date_time.replace("Z", "+00:00")).replace(tzinfo=None)
    new_meal = EventMeal(
        event_id=req.event_id,
        title=req.title,
        description=req.description,
        date_time=dt,
        meal_type=req.meal_type,
        is_active=True
    )
    db.add(new_meal)
    await db.commit()
    await db.refresh(new_meal)
    return {
        "id": new_meal.id,
        "event_id": new_meal.event_id,
        "title": new_meal.title,
        "description": new_meal.description,
        "date_time": new_meal.date_time.isoformat() + "Z" if new_meal.date_time else None,
        "meal_type": new_meal.meal_type,
    }

@router.patch("/meals/{meal_id}")
async def update_event_meal(
    meal_id: int,
    req: MealUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EventMeal).filter(EventMeal.id == meal_id)
    res = await db.execute(stmt)
    meal = res.scalar()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    if req.title is not None:
        meal.title = req.title
    if req.description is not None:
        meal.description = req.description
    if req.date_time is not None:
        meal.date_time = datetime.fromisoformat(req.date_time.replace("Z", "+00:00")).replace(tzinfo=None)
    if req.meal_type is not None:
        meal.meal_type = req.meal_type
        
    await db.commit()
    await db.refresh(meal)
    return {
        "id": meal.id,
        "event_id": meal.event_id,
        "title": meal.title,
        "description": meal.description,
        "date_time": meal.date_time.isoformat() + "Z" if meal.date_time else None,
        "meal_type": meal.meal_type,
    }

@router.delete("/meals/{meal_id}")
async def delete_event_meal(
    meal_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EventMeal).filter(EventMeal.id == meal_id)
    res = await db.execute(stmt)
    meal = res.scalar()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    await db.delete(meal)
    await db.commit()
    return {"status": "success", "message": "Meal deleted"}

# --- Committee Task Delegation Schemas & Routes ---
class TaskCreate(BaseModel):
    event_id: int
    committee: str
    title: str
    description: Optional[str] = ""
    participant_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = ""
    due_time: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_vehicle: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str
    apology_reason: Optional[str] = None

class TaskReassign(BaseModel):
    assigned_to_id: int
    assigned_to_name: Optional[str] = ""

class TaskAssignDriver(BaseModel):
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_vehicle: Optional[str] = None

@router.get("/tasks/{event_id}")
async def list_committee_tasks(
    event_id: int,
    committee: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    # Verify access
    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        role_lower = (participant.role or "").lower()
        is_staff = any(x in role_lower for x in ("منظم", "رئيس", "عضو", "organizer", "helper", "driver", "companion", "staff", "president", "member"))
        if not is_staff:
            raise HTTPException(status_code=403, detail="Not authorized as staff")

    stmt = select(CommitteeTask).filter(CommitteeTask.event_id == event_id)
    if committee:
        stmt = stmt.filter(CommitteeTask.committee == committee)
    
    res = await db.execute(stmt)
    tasks = res.scalars().all()
    
    output = []
    for task in tasks:
        output.append({
            "id": task.id,
            "event_id": task.event_id,
            "committee": task.committee,
            "title": task.title,
            "description": task.description,
            "participant_id": task.participant_id,
            "assigned_to_id": task.assigned_to_id,
            "assigned_to_name": task.assigned_to_name,
            "status": task.status,
            "due_time": task.due_time.isoformat() if task.due_time else None,
            "driver_name": task.driver_name,
            "driver_phone": task.driver_phone,
            "driver_vehicle": task.driver_vehicle,
            "whatsapp_sent": task.whatsapp_sent
        })
    return output

@router.post("/tasks/create")
async def create_committee_task(
    req: TaskCreate,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    # Verify access
    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != req.event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        role_lower = (participant.role or "").lower()
        is_allowed = any(x in role_lower for x in ("منظم", "رئيس", "organizer", "president"))
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Only committee presidents or general organizers can delegate tasks")

    dt = None
    if req.due_time:
        try:
            dt = datetime.fromisoformat(req.due_time.replace("Z", "+00:00")).replace(tzinfo=None)
        except:
            dt = None
        
    new_task = CommitteeTask(
        event_id=req.event_id,
        committee=req.committee,
        title=req.title,
        description=req.description,
        participant_id=req.participant_id,
        assigned_to_id=req.assigned_to_id,
        assigned_to_name=req.assigned_to_name,
        status="pending",
        due_time=dt,
        driver_name=req.driver_name,
        driver_phone=req.driver_phone,
        driver_vehicle=req.driver_vehicle,
        whatsapp_sent=False
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    # ── مزامنة تفاصيل النقل الموحدة إلى سجل اللوجستيات (LogisticsRegistry) ──
    if new_task.participant_id and new_task.committee in ('transport', 'logistics'):
        try:
            from app.models.others import LogisticsRegistry
            from app.models.participant import Participant
            
            # جلب هاتف المستقبل الميداني (العضو المكلف)
            host_phone = None
            host_name = new_task.assigned_to_name
            if new_task.assigned_to_id:
                host_stmt = select(Participant).filter(Participant.id == new_task.assigned_to_id)
                host_res = await db.execute(host_stmt)
                host_p = host_res.scalar_one_or_none()
                if host_p:
                    host_phone = host_p.phone or host_p.phone_number
                    if not host_name:
                        host_name = host_p.full_name
            
            # تحديث سجل الضيف
            log_stmt = select(LogisticsRegistry).filter(
                LogisticsRegistry.event_id == new_task.event_id,
                LogisticsRegistry.participant_id == new_task.participant_id
            )
            log_res = await db.execute(log_stmt)
            registry = log_res.scalar_one_or_none()
            if registry:
                registry.driver_name = host_name
                registry.driver_phone = host_phone
                registry.vehicle_details = new_task.driver_vehicle
                registry.status = "dispatched"
                
                # بث تحديثات الويب سوكت
                try:
                    await manager.broadcast_to_event(new_task.event_id, {
                        "type": "logistics_dispatched",
                        "participant_id": new_task.participant_id,
                        "logistics": {
                            "driver_name": host_name,
                            "driver_phone": host_phone,
                            "vehicle_details": new_task.driver_vehicle,
                            "status": "dispatched"
                        }
                    })
                    await manager.broadcast_to_event(new_task.event_id, {
                        "type": "logistics_updated",
                        "participant_id": new_task.participant_id,
                        "logistics_id": registry.id
                    })
                except Exception as ws_err:
                    logger.warning(f"WebSocket broadcast failed on task creation sync: {ws_err}")
        except Exception as e:
            logger.error(f"Failed to sync logistics upon task creation: {e}")

    # ── إشعار العضو المسندة إليه المهمة ──
    if new_task.assigned_to_id:
        try:
            from app.routers.notifications import send_web_push_notification_to_target
            committee_names = {
                'reception': 'الاستقبال والتوجيه',
                'catering': 'الاطعام',
                'accommodation': 'الايواء',
                'logistics': 'النقل',
                'transport': 'النقل',
                'entertainment': 'الترفيه'
            }
            c_name = committee_names.get(new_task.committee, new_task.committee)
            await send_web_push_notification_to_target(
                db=db,
                title="📋 مهمة جديدة مسندة إليك",
                body=f"تم إسناد مهمة في لجنة {c_name}: {new_task.title}",
                url=f"/portal?section=organizer&task_id={new_task.id}",
                participant_ids=[new_task.assigned_to_id],
                event_id=new_task.event_id
            )
        except Exception as e:
            logger.error(f"Failed to notify task assignee: {e}")

    return new_task

@router.patch("/tasks/{task_id}/status")
async def update_committee_task_status(
    task_id: int,
    req: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    task = await db.get(CommitteeTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Verify access
    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != task.event_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        role_lower = (participant.role or "").lower()
        is_president_or_gen = any(x in role_lower for x in ("رئيس", "president", "منظم", "organizer"))
        # Members can only update their own assigned tasks
        if not is_president_or_gen and task.assigned_to_id != participant.id:
            raise HTTPException(status_code=403, detail="You can only update tasks assigned to you")

    old_status = task.status
    
    if req.status == "apologized":
        old_assignee = task.assigned_to_name or f"عضو (ID: {task.assigned_to_id})"
        reason_str = req.apology_reason or "لم يذكر سبب"
        apology_text = f"\n\n⚠️ اعتذر {old_assignee} عن المهمة لسبب: {reason_str}"
        task.description = (task.description or "") + apology_text
        task.status = "pending"
        task.assigned_to_id = None
        task.assigned_to_name = None
        await db.commit()
        await db.refresh(task)
        
        # Send notification to committee presidents
        try:
            from app.routers.notifications import send_web_push_notification_to_target
            committee_keywords = {
                'reception': ['استقبال', 'تسجيل', 'reception'],
                'catering': ['اطعام', 'ضيافه', 'catering', 'food'],
                'accommodation': ['ايواء', 'تسكين', 'accommodation', 'hotel', 'lodging'],
                'logistics': ['نقل', 'لوجست', 'transport', 'logistics'],
                'entertainment': ['ترفيه', 'نشاط', 'انشطه', 'excursion', 'activity']
            }
            keywords = committee_keywords.get(task.committee, [])
            p_stmt = select(Participant).filter(Participant.event_id == task.event_id)
            p_res = await db.execute(p_stmt)
            participants = p_res.scalars().all()
            
            presidents = []
            for p in participants:
                role_p = (p.role or "").lower()
                is_pres = ('رئيس' in role_p or 'president' in role_p) and any(kw in role_p for kw in keywords)
                if is_pres:
                    presidents.append(p.id)
            
            if presidents:
                await send_web_push_notification_to_target(
                    db=db,
                    title="⚠️ اعتذار عن مهمة ميدانية",
                    body=f"اعتذر {old_assignee} عن مهمة '{task.title}': {reason_str}",
                    url=f"/portal?section=organizer&task_id={task.id}",
                    participant_ids=presidents,
                    event_id=task.event_id
                )
        except Exception as e:
            logger.error(f"Failed to notify presidents of apology: {e}")
            
        await db.refresh(task)
        return task

    task.status = req.status
    if task.participant_id and task.committee == 'transport':
        try:
            from app.models.others import LogisticsRegistry
            log_stmt = select(LogisticsRegistry).filter(
                LogisticsRegistry.event_id == task.event_id,
                LogisticsRegistry.participant_id == task.participant_id
            )
            log_res = await db.execute(log_stmt)
            registry = log_res.scalar_one_or_none()
            if registry:
                registry.status = req.status
        except Exception as e:
            logger.error(f"Failed to sync task status to logistics: {e}")

    await db.commit()
    await db.refresh(task)

    # ── إشعار عند بدء أو تحديث المهمة ──
    if req.status != old_status:
        try:
            from app.routers.notifications import send_web_push_notification_to_target
            assignee_name = task.assigned_to_name or "أحد الأعضاء"
            status_texts = {
                "confirmed": "تأكيد استلام المهمة",
                "on_the_way_to_task": "في الطريق إلى المهمة",
                "awaiting_guest": "في انتظار وصول الضيف",
                "guest_delayed": "تسجيل تأخر وصول الضيف",
                "returning_from_task": "في طريق العودة من المهمة",
                "in_progress": "بدء تنفيذ المهمة",
            }
            if req.status in status_texts and req.status != "completed":
                status_text = status_texts[req.status]
                committee_keywords = {
                    'reception': ['استقبال'],
                    'catering': ['إطعام', 'اطعام', 'ضيافة', 'ضيافه'],
                    'accommodation': ['إيواء', 'ايواء', 'تسكين'],
                    'logistics': ['نقل', 'سائق'],
                    'entertainment': ['ترفيه', 'أنشطة', 'انشطه'],
                    'transport': ['نقل', 'سائق']
                }
                keywords = committee_keywords.get(task.committee, [])
                p_stmt = select(Participant).filter(Participant.event_id == task.event_id)
                p_res = await db.execute(p_stmt)
                participants = p_res.scalars().all()
                president_ids = []
                for p in participants:
                    p_role = (p.role or "").lower()
                    if "رئيس" in p_role or "president" in p_role:
                        if any(kw in p_role for kw in keywords) or "عام" in p_role or "organizer" in p_role:
                            president_ids.append(p.id)
                if president_ids:
                    await send_web_push_notification_to_target(
                        db=db,
                        title=f"⚙️ تحديث مهمة: {status_text}",
                        body=f"قام {assignee_name} بتحديث حالة المهمة '{task.title}' إلى: {status_text}",
                        url=f"/portal?section=organizer&task_id={task.id}",
                        participant_ids=president_ids,
                        event_id=task.event_id
                    )
        except Exception as e:
            logger.error(f"Failed to send task status update notification: {e}")

    # ── إشعار عند إتمام المهمة ──
    if req.status == "completed" and old_status != "completed":
        try:
            from app.routers.notifications import send_web_push_notification_to_target
            assignee_name = task.assigned_to_name or "أحد الأعضاء"
            
            # 1. إخطار المنظم العام للفعالية
            event = await db.get(Event, task.event_id)
            if event and event.created_by:
                try:
                    await send_web_push_notification_to_target(
                        db=db,
                        title="✅ تم إنجاز مهمة ميدانية",
                        body=f"قام {assignee_name} بإكمال المهمة: '{task.title}'",
                        url="/dashboard/operations",
                        user_ids=[event.created_by],
                        event_id=task.event_id
                    )
                except Exception as ex:
                    logger.error(f"Failed to notify main event creator: {ex}")

            # 2. إخطار رئيس اللجنة
            committee_keywords = {
                'reception': ['استقبال'],
                'catering': ['إطعام', 'اطعام', 'ضيافة', 'ضيافه'],
                'accommodation': ['إيواء', 'ايواء', 'تسكين'],
                'logistics': ['نقل', 'سائق'],
                'entertainment': ['ترفيه', 'أنشطة', 'انشطه']
            }
            keywords = committee_keywords.get(task.committee, [])
            
            p_stmt = select(Participant).filter(Participant.event_id == task.event_id)
            p_res = await db.execute(p_stmt)
            participants = p_res.scalars().all()
            
            president_ids = []
            for p in participants:
                p_role = (p.role or "").lower()
                if "رئيس" in p_role or "president" in p_role:
                    if any(kw in p_role for kw in keywords) or "عام" in p_role or "organizer" in p_role:
                        president_ids.append(p.id)
            
            if president_ids:
                try:
                    await send_web_push_notification_to_target(
                        db=db,
                        title="✅ تم إنجاز مهمة في لجنتك",
                        body=f"قام {assignee_name} بإتمام المهمة: '{task.title}'",
                        url=f"/portal?section=organizer&task_id={task.id}",
                        participant_ids=president_ids,
                        event_id=task.event_id
                    )
                except Exception as ex:
                    logger.error(f"Failed to notify committee presidents: {ex}")
        except Exception as e:
            logger.error(f"Failed to send task completion notifications: {e}")

    await db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
async def delete_committee_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    task = await db.get(CommitteeTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Verify access
    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != task.event_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        role_lower = (participant.role or "").lower()
        is_allowed = any(x in role_lower for x in ("منظم", "رئيس", "organizer", "president"))
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Only committee presidents or general organizers can delete tasks")

    # If it is a transport task and has a participant associated, reset the LogisticsRegistry entry
    if task.participant_id and task.committee in ('transport', 'logistics'):
        try:
            from app.models.others import LogisticsRegistry
            log_stmt = select(LogisticsRegistry).filter(
                LogisticsRegistry.event_id == task.event_id,
                LogisticsRegistry.participant_id == task.participant_id
            )
            log_res = await db.execute(log_stmt)
            registry = log_res.scalar_one_or_none()
            if registry:
                registry.driver_name = None
                registry.driver_phone = None
                registry.vehicle_details = None
                registry.shuttle_time = None
                registry.status = "pending"
                
                # Broadcast updates via WebSocket
                try:
                    await manager.broadcast_to_event(task.event_id, {
                        "type": "logistics_dispatched",
                        "participant_id": task.participant_id,
                        "logistics": {
                            "driver_name": None,
                            "driver_phone": None,
                            "vehicle_details": None,
                            "shuttle_time": None,
                            "status": "pending"
                        }
                    })
                    await manager.broadcast_to_event(task.event_id, {
                        "type": "logistics_updated",
                        "participant_id": task.participant_id,
                        "logistics_id": registry.id
                    })
                except Exception as ws_err:
                    logger.warning(f"WebSocket broadcast failed on task deletion: {ws_err}")
                
                # Send push notification to the guest
                try:
                    from app.routers.notifications import send_web_push_notification_to_target
                    await send_web_push_notification_to_target(
                        db=db,
                        title="تحديث في تفاصيل النقل 🚗",
                        body="تم إلغاء مهمة النقل السابقة. أنت الآن في قائمة الانتظار لتخصيص استقبال جديد.",
                        url="/dashboard/logistics",
                        participant_ids=[task.participant_id],
                        event_id=task.event_id
                    )
                except Exception as notif_err:
                    logger.error(f"Failed to notify participant of task cancellation: {notif_err}")
        except Exception as e:
            logger.error(f"Failed to reset logistics status upon task deletion: {e}")

    await db.delete(task)
    await db.commit()
    return {"status": "success", "message": "Task deleted"}

@router.patch("/tasks/{task_id}/reassign")
async def reassign_committee_task(
    task_id: int,
    req: TaskReassign,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    task = await db.get(CommitteeTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != task.event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        role_lower = (participant.role or "").lower()
        is_allowed = any(x in role_lower for x in ("منظم", "رئيس", "organizer", "president"))
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Only committee presidents or general organizers can reassign tasks")

    new_assignee = await db.get(Participant, req.assigned_to_id)
    if not new_assignee:
        raise HTTPException(status_code=404, detail="Assignee participant not found")
    if new_assignee.event_id != task.event_id:
        raise HTTPException(status_code=400, detail="Assignee is not registered for this event")

    task.assigned_to_id = req.assigned_to_id
    task.assigned_to_name = req.assigned_to_name or new_assignee.full_name
    task.status = "pending"
    
    await db.commit()
    await db.refresh(task)

    try:
        from app.routers.notifications import send_web_push_notification_to_target
        committee_names = {
            'reception': 'الاستقبال والتوجيه',
            'catering': 'الاطعام',
            'accommodation': 'الايواء',
            'logistics': 'النقل',
            'transport': 'النقل',
            'entertainment': 'الترفيه'
        }
        c_name = committee_names.get(task.committee, task.committee)
        await send_web_push_notification_to_target(
            db=db,
            title="📋 مهمة جديدة مسندة إليك",
            body=f"تم إسناد مهمة في لجنة {c_name}: {task.title}",
            url=f"/portal?section=organizer&task_id={task.id}",
            participant_ids=[task.assigned_to_id],
            event_id=task.event_id
        )
    except Exception as e:
        logger.error(f"Failed to notify reassigned task assignee: {e}")

    return {
        "id": task.id,
        "event_id": task.event_id,
        "committee": task.committee,
        "title": task.title,
        "description": task.description,
        "participant_id": task.participant_id,
        "assigned_to_id": task.assigned_to_id,
        "assigned_to_name": task.assigned_to_name,
        "status": task.status,
        "due_time": task.due_time.isoformat() if task.due_time else None,
        "driver_name": task.driver_name,
        "driver_phone": task.driver_phone,
        "driver_vehicle": task.driver_vehicle,
        "whatsapp_sent": task.whatsapp_sent
    }

@router.patch("/tasks/{task_id}/assign-driver")
async def assign_driver_to_committee_task(
    task_id: int,
    req: TaskAssignDriver,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    task = await db.get(CommitteeTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != task.event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        role_lower = (participant.role or "").lower()
        is_allowed = any(x in role_lower for x in ("منظم", "رئيس", "organizer", "president")) or task.assigned_to_id == participant.id
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Only committee presidents, organizers or the assignee can assign drivers")

    # تحديث بيانات السائق/المركبة في جدول المهمة
    task.driver_name = req.driver_name
    task.driver_phone = req.driver_phone
    task.driver_vehicle = req.driver_vehicle
    task.whatsapp_sent = False
    
    await db.commit()
    await db.refresh(task)

    # مزامنة التغييرات تلقائياً إلى سجل اللوجستيات الخاص بالضيف
    if task.participant_id and task.committee in ('transport', 'logistics'):
        try:
            from app.models.others import LogisticsRegistry
            from app.models.participant import Participant
            
            # جلب هاتف العضو المكلف
            host_phone = None
            host_name = task.assigned_to_name
            if task.assigned_to_id:
                host_stmt = select(Participant).filter(Participant.id == task.assigned_to_id)
                host_res = await db.execute(host_stmt)
                host_p = host_res.scalar_one_or_none()
                if host_p:
                    host_phone = host_p.phone or host_p.phone_number
                    if not host_name:
                        host_name = host_p.full_name

            log_stmt = select(LogisticsRegistry).filter(
                LogisticsRegistry.event_id == task.event_id,
                LogisticsRegistry.participant_id == task.participant_id
            )
            log_res = await db.execute(log_stmt)
            registry = log_res.scalar_one_or_none()
            if registry:
                # المستقبل الميداني هو العضو المكلف، والسيارة هي المسجلة في المهمة
                registry.driver_name = host_name
                registry.driver_phone = host_phone
                registry.vehicle_details = task.driver_vehicle
                if registry.status == "pending":
                    registry.status = "dispatched"
                
                # بث الويب سوكت
                try:
                    await manager.broadcast_to_event(task.event_id, {
                        "type": "logistics_dispatched",
                        "participant_id": task.participant_id,
                        "logistics": {
                            "driver_name": host_name,
                            "driver_phone": host_phone,
                            "vehicle_details": task.driver_vehicle,
                            "status": registry.status
                        }
                    })
                    await manager.broadcast_to_event(task.event_id, {
                        "type": "logistics_updated",
                        "participant_id": task.participant_id,
                        "logistics_id": registry.id
                    })
                except Exception as ws_err:
                    logger.warning(f"WebSocket broadcast failed on task driver assignment sync: {ws_err}")
        except Exception as e:
            logger.error(f"Failed to sync logistics upon task driver assignment: {e}")

    return {"status": "success", "message": "Driver assigned successfully"}

@router.patch("/tasks/{task_id}/whatsapp-sent")
async def mark_task_whatsapp_sent(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    task = await db.get(CommitteeTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != task.event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        role_lower = (participant.role or "").lower()
        is_allowed = any(x in role_lower for x in ("منظم", "رئيس", "organizer", "president")) or task.assigned_to_id == participant.id
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Not authorized")

    task.whatsapp_sent = True
    await db.commit()
    return {"status": "success", "message": "WhatsApp status updated successfully"}

# ── DRIVERS REGISTRY ENDPOINTS ──

from pydantic import BaseModel
from typing import Optional, List

class EventDriverCreate(BaseModel):
    event_id: int
    name: str
    phone: str
    vehicle_details: Optional[str] = None

@router.get("/drivers/event/{event_id}")
async def list_event_drivers(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != event_id:
            raise HTTPException(status_code=403, detail="Not authorized for this event")
            
    from app.models.others import EventDriver
    stmt = select(EventDriver).filter(EventDriver.event_id == event_id, EventDriver.is_active == True)
    res = await db.execute(stmt)
    drivers = res.scalars().all()
    return drivers

@router.post("/drivers")
async def create_event_driver(
    req: EventDriverCreate,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != req.event_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        role_lower = (participant.role or "").lower()
        is_allowed = any(x in role_lower for x in ("منظم", "رئيس", "organizer", "president"))
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Only organizers can add drivers")
            
    from app.models.others import EventDriver
    driver = EventDriver(
        event_id=req.event_id,
        name=req.name,
        phone=req.phone,
        vehicle_details=req.vehicle_details,
        is_active=True
    )
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    return driver

@router.delete("/drivers/{driver_id}")
async def delete_event_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    from app.models.others import EventDriver
    driver = await db.get(EventDriver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
        
    if identity["type"] == "participant":
        participant = identity["obj"]
        if participant.event_id != driver.event_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        role_lower = (participant.role or "").lower()
        is_allowed = any(x in role_lower for x in ("منظم", "رئيس", "organizer", "president"))
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Only organizers can delete drivers")
            
    driver.is_active = False
    await db.commit()
    return {"status": "success", "message": "Driver removed"}
