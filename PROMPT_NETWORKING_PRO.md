# برومبت تطوير نظام التواصل المهني الاحترافي
## Diwan Event Platform — Professional Networking 2.0
### مستوى: Senior Full-Stack + UX Expert

---

## السياق الإلزامي

**المشروع:** Diwan Event Platform — FastAPI + PostgreSQL + React + WebSocket

**ما يوجد حالياً (النظام البدائي):**
```python
# networking.py الحالي — 206 سطر — محدود جداً:
✓ opt-in للظهور في الدليل (عبر custom_values JSON — هش)
✓ طلب اتصال بسيط (request → accept/decline)
✓ vCard تحميل بعد القبول
✗ لا محادثة مباشرة
✗ لا جدولة اجتماعات
✗ لا ملف شخصي احترافي
✗ لا توصيات ذكية
✗ لا مسح QR للتواصل الفوري
✗ لا Real-time notifications
✗ لا تحليلات للمنظم
```

**النماذج الموجودة:**
```python
# networking.py Models:
NetworkingConnection: id, event_id, requester_qr, requested_qr, status, message
NetworkingOptIn: id, event_id, participant_qr, is_visible

# engagement.py Models:
GamificationEvent: participant_id, event_type, points, metadata_json

# participant.py يحتوي:
Participant: id, full_name, email, phone_number, council, court,
             role, qr_code, order_num, custom_values (JSONB)
```

**WebSocket موجود:**
```python
# app/core/websockets.py:
manager.broadcast_to_event(event_id, payload)
# الاتصال: ws://{host}/api/v1/ws/{event_id}?token={jwt}
```

**Auth للمشارك:**
```python
# participant_auth.py:
get_current_participant(token) → Participant
# Token يُولَّد عند مسح QR أو دخول البوابة
```

---

## الهدف

بناء **نظام تواصل مهني متكامل** بمستوى LinkedIn داخلي للفعالية، يشمل:
- ملف شخصي احترافي غني
- محادثة مباشرة فورية
- جدولة اجتماعات
- توصيات ذكية
- QR للتواصل الفوري
- تحليلات للمنظم

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## الجزء الأول: Backend — FastAPI + SQLAlchemy
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. النماذج الجديدة — `app/models/networking.py`

**أعد كتابة الملف كاملاً بهذه النماذج:**

```python
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey,
    Text, UniqueConstraint, DateTime, JSON, Float, Enum
)
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin
from datetime import datetime
import enum

# ── 1. الملف الشخصي المهني ────────────────────────────────────────
class ParticipantProfile(Base, TimestampMixin):
    """
    امتداد غني لبيانات المشارك المهنية.
    منفصل عن جدول participants للحفاظ على المرونة.
    """
    __tablename__ = "participant_profiles"
    
    id                = Column(Integer, primary_key=True)
    participant_id    = Column(Integer, ForeignKey("participants.id"), unique=True)
    event_id          = Column(Integer, ForeignKey("event_settings.id"))
    
    # الظهور والاكتشاف
    is_visible        = Column(Boolean, default=True)
    is_open_to_meet   = Column(Boolean, default=True)  # "متاح للاجتماعات"
    
    # البيانات المهنية الغنية
    bio               = Column(Text, default="")
    specialties       = Column(JSON, default=list)    # ["قانون مدني", "تنفيذ"]
    years_experience  = Column(Integer, nullable=True)
    jurisdiction      = Column(String, default="")    # منطقة العمل
    
    # روابط التواصل الاجتماعي
    linkedin_url      = Column(String, default="")
    website_url       = Column(String, default="")
    
    # ما يبحث عنه في الفعالية
    looking_for       = Column(JSON, default=list)    # ["تعاون", "معلومات", "زملاء"]
    
    # صورة شخصية (base64 أو URL)
    avatar_url        = Column(String, nullable=True)
    
    # نقاط التواصل (Gamification)
    networking_score  = Column(Integer, default=0)
    
    participant       = relationship("Participant", back_populates="profile", lazy="joined")

# ── 2. طلبات الاتصال المحسّنة ─────────────────────────────────────
class ConnectionStatus(str, enum.Enum):
    PENDING  = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    BLOCKED  = "blocked"

class NetworkingConnection(Base, TimestampMixin):
    __tablename__ = "networking_connections"
    
    id              = Column(Integer, primary_key=True)
    event_id        = Column(Integer, ForeignKey("event_settings.id"))
    requester_id    = Column(Integer, ForeignKey("participants.id"))  # FK حقيقي بدلاً من QR string
    requested_id    = Column(Integer, ForeignKey("participants.id"))
    status          = Column(String, default="pending")
    message         = Column(Text, default="")
    via_qr_scan     = Column(Boolean, default=False)  # هل تمّ عبر مسح QR؟
    accepted_at     = Column(DateTime, nullable=True)
    
    requester  = relationship("Participant", foreign_keys=[requester_id], lazy="joined")
    requested  = relationship("Participant", foreign_keys=[requested_id], lazy="joined")
    
    __table_args__ = (
        UniqueConstraint('event_id', 'requester_id', 'requested_id', name='_conn_uc'),
    )

# ── 3. المحادثات المباشرة ──────────────────────────────────────────
class DirectMessage(Base, TimestampMixin):
    __tablename__ = "direct_messages"
    
    id              = Column(Integer, primary_key=True)
    connection_id   = Column(Integer, ForeignKey("networking_connections.id"))
    sender_id       = Column(Integer, ForeignKey("participants.id"))
    content         = Column(Text, nullable=False)
    message_type    = Column(String, default="text")  # text | meeting_request | file
    is_read         = Column(Boolean, default=False)
    read_at         = Column(DateTime, nullable=True)
    
    sender      = relationship("Participant", foreign_keys=[sender_id])
    connection  = relationship("NetworkingConnection")

# ── 4. جدولة الاجتماعات ───────────────────────────────────────────
class MeetingStatus(str, enum.Enum):
    PROPOSED  = "proposed"
    CONFIRMED = "confirmed"
    DECLINED  = "declined"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MeetingRequest(Base, TimestampMixin):
    __tablename__ = "meeting_requests"
    
    id               = Column(Integer, primary_key=True)
    connection_id    = Column(Integer, ForeignKey("networking_connections.id"))
    event_id         = Column(Integer, ForeignKey("event_settings.id"))
    proposer_id      = Column(Integer, ForeignKey("participants.id"))
    recipient_id     = Column(Integer, ForeignKey("participants.id"))
    
    # وقت الاجتماع المقترح
    proposed_time    = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=15)
    location_note    = Column(String, default="")  # "عند الاستقبال", "طاولة B", "أونلاين"
    agenda           = Column(Text, default="")
    
    status           = Column(String, default="proposed")
    confirmed_time   = Column(DateTime, nullable=True)
    
    proposer    = relationship("Participant", foreign_keys=[proposer_id])
    recipient   = relationship("Participant", foreign_keys=[recipient_id])
    connection  = relationship("NetworkingConnection")

# ── 5. سجل مسح QR للتواصل ────────────────────────────────────────
class QRConnectScan(Base, TimestampMixin):
    __tablename__ = "qr_connect_scans"
    
    id           = Column(Integer, primary_key=True)
    event_id     = Column(Integer, ForeignKey("event_settings.id"))
    scanner_id   = Column(Integer, ForeignKey("participants.id"))
    scanned_id   = Column(Integer, ForeignKey("participants.id"))
    location     = Column(String, nullable=True)  # "قاعة B", "ردهة الفندق"
    auto_connect = Column(Boolean, default=False)  # هل أرسل طلباً تلقائياً؟

# ── 6. تقييمات الاجتماعات ─────────────────────────────────────────
class MeetingRating(Base, TimestampMixin):
    __tablename__ = "meeting_ratings"
    
    id          = Column(Integer, primary_key=True)
    meeting_id  = Column(Integer, ForeignKey("meeting_requests.id"))
    rater_id    = Column(Integer, ForeignKey("participants.id"))
    score       = Column(Integer)   # 1-5
    feedback    = Column(Text, default="")
```

---

### 2. الـ Router الجديد — `app/routers/networking.py`

**أعد كتابة الملف كاملاً بهذه الـ endpoints:**

```python
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.models.networking import (
    ParticipantProfile, NetworkingConnection,
    DirectMessage, MeetingRequest, QRConnectScan
)
from app.models.participant import Participant, Attendance
from app.models.engagement import GamificationEvent
from app.routers.participant_auth import get_current_participant
from app.core.websockets import manager

router = APIRouter()

# ════════════════════════════════════════════════════
# 📋 SECTION 1: الملف الشخصي المهني
# ════════════════════════════════════════════════════

@router.get("/profile/me")
def get_my_profile(
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جلب ملفي الشخصي المهني"""
    profile = db.query(ParticipantProfile).filter(
        ParticipantProfile.participant_id == me.id
    ).first()
    
    if not profile:
        # إنشاء ملف تلقائي عند أول طلب
        profile = ParticipantProfile(
            participant_id=me.id,
            event_id=me.event_id,
            is_visible=True
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return _serialize_profile(me, profile)

@router.patch("/profile/me")
async def update_my_profile(
    data: dict,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    تحديث الملف الشخصي المهني.
    الحقول المقبولة: bio, specialties, years_experience,
    jurisdiction, linkedin_url, website_url, looking_for,
    is_visible, is_open_to_meet, avatar_url
    """
    ALLOWED = {
        'bio', 'specialties', 'years_experience', 'jurisdiction',
        'linkedin_url', 'website_url', 'looking_for',
        'is_visible', 'is_open_to_meet', 'avatar_url'
    }
    
    profile = _get_or_create_profile(me, db)
    
    for key, value in data.items():
        if key in ALLOWED:
            setattr(profile, key, value)
    
    db.commit()
    
    # Broadcast لتحديث الدليل في الوقت الفعلي
    await manager.broadcast_to_event(me.event_id, {
        "type": "profile_updated",
        "participant_id": me.id
    })
    
    return {"status": "success", "profile": _serialize_profile(me, profile)}

@router.get("/profile/{participant_id}")
def get_participant_profile(
    participant_id: int,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جلب ملف شخصي مشارك آخر مع إظهار المعلومات حسب حالة الاتصال"""
    target = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.event_id == me.event_id
    ).first()
    if not target:
        raise HTTPException(404, "المشارك غير موجود")
    
    profile = _get_or_create_profile(target, db)
    
    # تحديد مستوى الظهور
    conn = _get_connection(me.id, target.id, db)
    is_connected = conn and conn.status == "accepted"
    
    result = {
        "id": target.id,
        "full_name": target.full_name,
        "council": target.council,
        "role": target.role,
        "court": target.court,
        "bio": profile.bio,
        "specialties": profile.specialties,
        "jurisdiction": profile.jurisdiction,
        "looking_for": profile.looking_for,
        "is_open_to_meet": profile.is_open_to_meet,
        "networking_score": profile.networking_score,
        "years_experience": profile.years_experience,
        "avatar_url": profile.avatar_url,
        "connection_status": conn.status if conn else "none",
        "connection_id": conn.id if conn else None,
    }
    
    # معلومات التواصل تظهر فقط بعد القبول
    if is_connected:
        result.update({
            "email": target.email,
            "phone": target.phone_number,
            "linkedin_url": profile.linkedin_url,
            "website_url": profile.website_url,
        })
    
    return result

# ════════════════════════════════════════════════════
# 🔍 SECTION 2: الدليل والبحث والتوصيات
# ════════════════════════════════════════════════════

@router.get("/directory")
def get_directory(
    event_id: int,
    search: Optional[str] = None,
    specialty: Optional[str] = None,
    looking_for: Optional[str] = None,
    open_to_meet: Optional[bool] = None,
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    دليل المشاركين مع بحث وفلترة متقدمة.
    يُظهر فقط من وافق على الظهور (is_visible = True).
    """
    query = db.query(Participant, ParticipantProfile).join(
        ParticipantProfile,
        ParticipantProfile.participant_id == Participant.id
    ).filter(
        Participant.event_id == event_id,
        Participant.id != me.id,
        ParticipantProfile.is_visible == True
    )
    
    if search:
        query = query.filter(
            or_(
                Participant.full_name.ilike(f"%{search}%"),
                Participant.council.ilike(f"%{search}%"),
                Participant.role.ilike(f"%{search}%"),
                ParticipantProfile.bio.ilike(f"%{search}%")
            )
        )
    
    if specialty:
        query = query.filter(
            ParticipantProfile.specialties.contains([specialty])
        )
    
    if open_to_meet is not None:
        query = query.filter(ParticipantProfile.is_open_to_meet == open_to_meet)
    
    # ترتيب: المتصلون أولاً، ثم الأعلى networking_score
    results = query.order_by(
        ParticipantProfile.networking_score.desc()
    ).offset(skip).limit(limit).all()
    
    directory = []
    for participant, profile in results:
        conn = _get_connection(me.id, participant.id, db)
        directory.append({
            "id": participant.id,
            "full_name": participant.full_name,
            "council": participant.council,
            "role": participant.role,
            "jurisdiction": profile.jurisdiction,
            "specialties": profile.specialties,
            "looking_for": profile.looking_for,
            "is_open_to_meet": profile.is_open_to_meet,
            "networking_score": profile.networking_score,
            "avatar_url": profile.avatar_url,
            "bio_preview": (profile.bio or "")[:120],
            "connection_status": conn.status if conn else "none",
            "connection_id": conn.id if conn else None,
        })
    
    return {
        "total": query.count(),
        "results": directory
    }

@router.get("/recommendations")
def get_smart_recommendations(
    event_id: int,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    توصيات ذكية بناءً على:
    1. نفس الجهة (council matching)
    2. التخصصات المشتركة
    3. "ما يبحث عنه" vs "ما يقدمه" الآخرون
    4. لم يُتواصل معهم بعد
    """
    my_profile = _get_or_create_profile(me, db)
    
    # جلب IDs المتصلين حالياً لاستبعادهم
    connected_ids = _get_connected_ids(me.id, event_id, db)
    connected_ids.add(me.id)
    
    # البحث عن مرشحين
    candidates = db.query(Participant, ParticipantProfile).join(
        ParticipantProfile,
        ParticipantProfile.participant_id == Participant.id
    ).filter(
        Participant.event_id == event_id,
        Participant.id.not_in(connected_ids),
        ParticipantProfile.is_visible == True
    ).all()
    
    scored = []
    for p, prof in candidates:
        score = 0
        reasons = []
        
        # نفس الجهة
        if p.council == me.council:
            score += 30
            reasons.append("نفس الجهة")
        
        # تخصصات مشتركة
        my_specs = set(my_profile.specialties or [])
        their_specs = set(prof.specialties or [])
        common = my_specs & their_specs
        if common:
            score += len(common) * 15
            reasons.append(f"تخصص مشترك: {', '.join(list(common)[:2])}")
        
        # ما أبحث عنه موجود عنده
        my_looking = set(my_profile.looking_for or [])
        their_looking = set(prof.looking_for or [])
        mutual = my_looking & their_looking
        if mutual:
            score += 20
            reasons.append("أهداف مشتركة")
        
        # المتاح للاجتماعات
        if prof.is_open_to_meet:
            score += 10
            reasons.append("متاح للاجتماع")
        
        if score > 0:
            scored.append({
                "id": p.id,
                "full_name": p.full_name,
                "council": p.council,
                "role": p.role,
                "specialties": prof.specialties,
                "bio_preview": (prof.bio or "")[:100],
                "avatar_url": prof.avatar_url,
                "match_score": min(score, 100),
                "match_reasons": reasons[:3],
                "is_open_to_meet": prof.is_open_to_meet,
            })
    
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:10]

# ════════════════════════════════════════════════════
# 🤝 SECTION 3: طلبات الاتصال
# ════════════════════════════════════════════════════

@router.post("/connect/{target_id}")
async def send_connection_request(
    target_id: int,
    message: str = "",
    via_qr: bool = False,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    إرسال طلب اتصال مع رسالة اختيارية.
    via_qr=True عند مسح بادج الشخص.
    """
    target = db.query(Participant).filter(
        Participant.id == target_id,
        Participant.event_id == me.event_id
    ).first()
    if not target:
        raise HTTPException(404, "المشارك غير موجود")
    
    # تحقق من عدم وجود طلب مسبق
    existing = db.query(NetworkingConnection).filter(
        NetworkingConnection.event_id == me.event_id,
        or_(
            and_(NetworkingConnection.requester_id == me.id,
                 NetworkingConnection.requested_id == target_id),
            and_(NetworkingConnection.requester_id == target_id,
                 NetworkingConnection.requested_id == me.id)
        )
    ).first()
    
    if existing:
        return {"status": "already_exists", "connection": _serialize_connection(existing)}
    
    conn = NetworkingConnection(
        event_id=me.event_id,
        requester_id=me.id,
        requested_id=target_id,
        message=message,
        via_qr_scan=via_qr
    )
    db.add(conn)
    
    # نقاط Gamification
    _award_points(me.id, "networking_request_sent", 3, db)
    
    db.commit()
    db.refresh(conn)
    
    # إشعار فوري للمستلم عبر WebSocket
    await manager.broadcast_to_event(me.event_id, {
        "type": "networking_request",
        "connection_id": conn.id,
        "from": {"id": me.id, "full_name": me.full_name, "council": me.council},
        "message": message,
        "via_qr": via_qr,
        "target_participant_id": target_id
    })
    
    return {"status": "sent", "connection_id": conn.id}

@router.post("/connect/qr-scan")
async def quick_connect_via_qr(
    scanned_qr: str,
    location: Optional[str] = None,
    auto_connect: bool = True,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    تواصل فوري عبر مسح QR بادج مشارك آخر.
    auto_connect=True → يرسل طلب اتصال فورياً
    auto_connect=False → يعرض الملف الشخصي فقط
    """
    target = db.query(Participant).filter(
        Participant.qr_code == scanned_qr,
        Participant.event_id == me.event_id
    ).first()
    if not target:
        raise HTTPException(404, "لم يتم التعرف على الرمز")
    
    if target.id == me.id:
        raise HTTPException(400, "لا يمكن مسح رمزك الخاص")
    
    # تسجيل المسح
    scan_log = QRConnectScan(
        event_id=me.event_id,
        scanner_id=me.id,
        scanned_id=target.id,
        location=location,
        auto_connect=auto_connect
    )
    db.add(scan_log)
    
    result = {
        "scanned_participant": {
            "id": target.id,
            "full_name": target.full_name,
            "council": target.council,
            "role": target.role,
        }
    }
    
    if auto_connect:
        # إرسال طلب اتصال تلقائي
        existing = _get_connection(me.id, target.id, db)
        if not existing:
            conn = NetworkingConnection(
                event_id=me.event_id,
                requester_id=me.id,
                requested_id=target.id,
                message=f"تواصلنا في {location or 'الفعالية'} 👋",
                via_qr_scan=True
            )
            db.add(conn)
            _award_points(me.id, "qr_connect", 5, db)
            db.commit()
            result["connection_status"] = "request_sent"
            result["connection_id"] = conn.id
        else:
            result["connection_status"] = existing.status
    
    db.commit()
    return result

@router.patch("/connect/{connection_id}/respond")
async def respond_to_request(
    connection_id: int,
    action: str,  # "accept" | "decline" | "block"
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """قبول أو رفض أو حجب طلب اتصال"""
    conn = db.query(NetworkingConnection).filter(
        NetworkingConnection.id == connection_id,
        NetworkingConnection.requested_id == me.id
    ).first()
    if not conn:
        raise HTTPException(404, "الطلب غير موجود")
    
    if action not in ("accept", "decline", "block"):
        raise HTTPException(400, "إجراء غير صالح")
    
    status_map = {"accept": "accepted", "decline": "declined", "block": "blocked"}
    conn.status = status_map[action]
    
    if action == "accept":
        conn.accepted_at = datetime.now()
        _award_points(me.id, "networking_accepted", 10, db)
        _award_points(conn.requester_id, "networking_accepted", 10, db)
    
    db.commit()
    
    # إشعار للطالب
    await manager.broadcast_to_event(me.event_id, {
        "type": "networking_response",
        "connection_id": conn.id,
        "status": conn.status,
        "responder": {"id": me.id, "full_name": me.full_name},
        "target_participant_id": conn.requester_id
    })
    
    return {"status": "success", "connection_status": conn.status}

@router.get("/connections")
def get_my_connections(
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """قائمة اتصالاتي المقبولة + الطلبات المعلقة"""
    # الطلبات الواردة
    incoming = db.query(NetworkingConnection).filter(
        NetworkingConnection.requested_id == me.id,
        NetworkingConnection.status == "pending"
    ).all()
    
    # الاتصالات المقبولة
    accepted = db.query(NetworkingConnection).filter(
        or_(
            NetworkingConnection.requester_id == me.id,
            NetworkingConnection.requested_id == me.id
        ),
        NetworkingConnection.status == "accepted"
    ).all()
    
    def _format_conn(conn, is_incoming=False):
        other_id = conn.requester_id if conn.requested_id == me.id else conn.requested_id
        other = conn.requester if conn.requested_id == me.id else conn.requested
        profile = _get_or_create_profile(other, db)
        
        # عدد الرسائل غير المقروءة
        unread = db.query(func.count(DirectMessage.id)).filter(
            DirectMessage.connection_id == conn.id,
            DirectMessage.sender_id != me.id,
            DirectMessage.is_read == False
        ).scalar()
        
        return {
            "connection_id": conn.id,
            "participant_id": other_id,
            "full_name": other.full_name,
            "council": other.council,
            "role": other.role,
            "avatar_url": profile.avatar_url,
            "status": conn.status,
            "via_qr": conn.via_qr_scan,
            "message": conn.message if is_incoming else None,
            "unread_messages": unread,
            "connected_at": str(conn.accepted_at) if conn.accepted_at else None,
        }
    
    return {
        "pending_incoming": [_format_conn(c, True) for c in incoming],
        "connected": [_format_conn(c) for c in accepted],
        "total_connections": len(accepted)
    }

# ════════════════════════════════════════════════════
# 💬 SECTION 4: المحادثة المباشرة
# ════════════════════════════════════════════════════

@router.get("/chat/{connection_id}")
def get_chat_history(
    connection_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جلب تاريخ المحادثة مع علامة "مقروء" تلقائية"""
    conn = _verify_connection_access(connection_id, me.id, db)
    
    messages = db.query(DirectMessage).filter(
        DirectMessage.connection_id == connection_id
    ).order_by(DirectMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    # تحديد الرسائل كمقروءة
    db.query(DirectMessage).filter(
        DirectMessage.connection_id == connection_id,
        DirectMessage.sender_id != me.id,
        DirectMessage.is_read == False
    ).update({"is_read": True, "read_at": datetime.now()})
    db.commit()
    
    return [_serialize_message(m, me.id) for m in reversed(messages)]

@router.post("/chat/{connection_id}")
async def send_message(
    connection_id: int,
    content: str,
    message_type: str = "text",
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """إرسال رسالة مباشرة"""
    conn = _verify_connection_access(connection_id, me.id, db)
    
    if not content.strip():
        raise HTTPException(400, "الرسالة فارغة")
    if len(content) > 2000:
        raise HTTPException(400, "الرسالة طويلة جداً (2000 حرف كحد أقصى)")
    
    msg = DirectMessage(
        connection_id=connection_id,
        sender_id=me.id,
        content=content.strip(),
        message_type=message_type
    )
    db.add(msg)
    _award_points(me.id, "message_sent", 1, db)
    db.commit()
    db.refresh(msg)
    
    # الطرف الآخر
    other_id = conn.requested_id if conn.requester_id == me.id else conn.requester_id
    
    # إشعار فوري
    await manager.broadcast_to_event(me.event_id, {
        "type": "direct_message",
        "connection_id": connection_id,
        "message": _serialize_message(msg, me.id),
        "target_participant_id": other_id
    })
    
    return _serialize_message(msg, me.id)

@router.get("/chat/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """عدد الرسائل غير المقروءة الإجمالي"""
    count = db.query(func.count(DirectMessage.id)).join(
        NetworkingConnection,
        DirectMessage.connection_id == NetworkingConnection.id
    ).filter(
        or_(
            NetworkingConnection.requester_id == me.id,
            NetworkingConnection.requested_id == me.id
        ),
        DirectMessage.sender_id != me.id,
        DirectMessage.is_read == False
    ).scalar()
    return {"unread_count": count}

# ════════════════════════════════════════════════════
# 📅 SECTION 5: جدولة الاجتماعات
# ════════════════════════════════════════════════════

@router.post("/meetings/propose")
async def propose_meeting(
    connection_id: int,
    proposed_time: str,  # ISO format: "2026-04-23T14:30:00"
    duration_minutes: int = 15,
    location_note: str = "",
    agenda: str = "",
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """اقتراح موعد اجتماع مع مشارك متصل"""
    conn = _verify_connection_access(connection_id, me.id, db)
    
    other_id = conn.requested_id if conn.requester_id == me.id else conn.requester_id
    
    try:
        meeting_time = datetime.fromisoformat(proposed_time)
    except ValueError:
        raise HTTPException(400, "صيغة الوقت غير صحيحة — استخدم: YYYY-MM-DDTHH:MM:SS")
    
    meeting = MeetingRequest(
        connection_id=connection_id,
        event_id=me.event_id,
        proposer_id=me.id,
        recipient_id=other_id,
        proposed_time=meeting_time,
        duration_minutes=max(5, min(duration_minutes, 120)),
        location_note=location_note,
        agenda=agenda
    )
    db.add(meeting)
    
    # إرسال رسالة تلقائية في المحادثة
    msg_content = (
        f"📅 **طلب اجتماع**\n"
        f"الموعد: {meeting_time.strftime('%Y-%m-%d %H:%M')}\n"
        f"المدة: {duration_minutes} دقيقة\n"
        f"المكان: {location_note or 'غير محدد'}\n"
        f"الموضوع: {agenda or 'للنقاش'}"
    )
    system_msg = DirectMessage(
        connection_id=connection_id,
        sender_id=me.id,
        content=msg_content,
        message_type="meeting_request"
    )
    db.add(system_msg)
    db.commit()
    
    # إشعار فوري
    await manager.broadcast_to_event(me.event_id, {
        "type": "meeting_request",
        "meeting_id": meeting.id,
        "proposer": {"id": me.id, "full_name": me.full_name},
        "proposed_time": proposed_time,
        "target_participant_id": other_id
    })
    
    return {"status": "proposed", "meeting_id": meeting.id}

@router.patch("/meetings/{meeting_id}/respond")
async def respond_to_meeting(
    meeting_id: int,
    action: str,  # "confirm" | "decline" | "reschedule"
    counter_time: Optional[str] = None,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """قبول أو رفض أو إعادة جدولة اجتماع"""
    meeting = db.query(MeetingRequest).filter(
        MeetingRequest.id == meeting_id,
        MeetingRequest.recipient_id == me.id
    ).first()
    if not meeting:
        raise HTTPException(404, "الاجتماع غير موجود")
    
    if action == "confirm":
        meeting.status = "confirmed"
        meeting.confirmed_time = meeting.proposed_time
        _award_points(me.id, "meeting_confirmed", 15, db)
    elif action == "decline":
        meeting.status = "declined"
    elif action == "reschedule" and counter_time:
        try:
            new_time = datetime.fromisoformat(counter_time)
            meeting.proposed_time = new_time
            meeting.status = "proposed"
            meeting.proposer_id, meeting.recipient_id = meeting.recipient_id, meeting.proposer_id
        except ValueError:
            raise HTTPException(400, "صيغة الوقت غير صحيحة")
    
    db.commit()
    
    # إشعار للطرف الآخر
    await manager.broadcast_to_event(me.event_id, {
        "type": "meeting_response",
        "meeting_id": meeting_id,
        "status": meeting.status,
        "responder": {"id": me.id, "full_name": me.full_name},
        "target_participant_id": meeting.proposer_id
    })
    
    return {"status": "success", "meeting_status": meeting.status}

@router.get("/meetings/my-schedule")
def get_my_meeting_schedule(
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جدول اجتماعاتي المؤكدة والمقترحة"""
    meetings = db.query(MeetingRequest).filter(
        or_(
            MeetingRequest.proposer_id == me.id,
            MeetingRequest.recipient_id == me.id
        ),
        MeetingRequest.status.in_(["proposed", "confirmed"])
    ).order_by(MeetingRequest.proposed_time.asc()).all()
    
    result = []
    for m in meetings:
        other_id = m.recipient_id if m.proposer_id == me.id else m.proposer_id
        other = db.query(Participant).get(other_id)
        result.append({
            "meeting_id": m.id,
            "with": {"id": other.id, "full_name": other.full_name, "council": other.council},
            "proposed_time": str(m.proposed_time),
            "duration_minutes": m.duration_minutes,
            "location_note": m.location_note,
            "agenda": m.agenda,
            "status": m.status,
            "i_proposed": m.proposer_id == me.id
        })
    return result

# ════════════════════════════════════════════════════
# 📊 SECTION 6: vCard وتصدير البيانات
# ════════════════════════════════════════════════════

@router.get("/vcard/{participant_id}")
def download_vcard(
    participant_id: int,
    db: Session = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """تحميل vCard (.vcf) — متاح فقط للاتصالات المقبولة"""
    conn = _get_connection(me.id, participant_id, db)
    if not conn or conn.status != "accepted":
        raise HTTPException(403, "يجب قبول طلب الاتصال أولاً")
    
    p = db.query(Participant).get(participant_id)
    profile = _get_or_create_profile(p, db)
    
    vcard = "\n".join([
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{p.full_name}",
        f"N:;{p.full_name};;;",
        f"ORG:{p.council}",
        f"TITLE:{p.role or 'مشارك'}",
        f"EMAIL;TYPE=INTERNET:{p.email or ''}",
        f"TEL;TYPE=CELL:{p.phone_number or ''}",
        f"URL:{profile.linkedin_url or ''}",
        f"NOTE:تم الاتصال عبر منصة ديوان للفعاليات | {p.court or ''}",
        f"X-EXPERTISE:{', '.join(profile.specialties or [])}",
        "END:VCARD"
    ])
    
    from fastapi.responses import Response
    return Response(
        content=vcard,
        media_type="text/vcard",
        headers={"Content-Disposition": f"attachment; filename=contact_{p.id}.vcf"}
    )

# ════════════════════════════════════════════════════
# 📈 SECTION 7: تحليلات المنظم
# ════════════════════════════════════════════════════

@router.get("/admin/analytics/{event_id}")
def get_networking_analytics(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    تحليلات التواصل للمنظم:
    - إجمالي الطلبات
    - نسبة القبول
    - الأكثر تواصلاً
    - نشاط القنوات (QR vs Manual)
    - الاجتماعات المؤكدة
    """
    total_requests = db.query(func.count(NetworkingConnection.id)).filter(
        NetworkingConnection.event_id == event_id
    ).scalar()
    
    accepted = db.query(func.count(NetworkingConnection.id)).filter(
        NetworkingConnection.event_id == event_id,
        NetworkingConnection.status == "accepted"
    ).scalar()
    
    via_qr = db.query(func.count(NetworkingConnection.id)).filter(
        NetworkingConnection.event_id == event_id,
        NetworkingConnection.via_qr_scan == True
    ).scalar()
    
    total_messages = db.query(func.count(DirectMessage.id)).join(
        NetworkingConnection
    ).filter(NetworkingConnection.event_id == event_id).scalar()
    
    confirmed_meetings = db.query(func.count(MeetingRequest.id)).filter(
        MeetingRequest.event_id == event_id,
        MeetingRequest.status == "confirmed"
    ).scalar()
    
    # أكثر 5 مشاركين تواصلاً
    top_networkers = db.query(
        Participant.id, Participant.full_name, Participant.council,
        func.count(NetworkingConnection.id).label("connections")
    ).join(
        NetworkingConnection,
        or_(
            NetworkingConnection.requester_id == Participant.id,
            NetworkingConnection.requested_id == Participant.id
        )
    ).filter(
        Participant.event_id == event_id,
        NetworkingConnection.status == "accepted"
    ).group_by(Participant.id).order_by(func.count(NetworkingConnection.id).desc()).limit(5).all()
    
    return {
        "overview": {
            "total_requests": total_requests,
            "accepted_connections": accepted,
            "acceptance_rate": round(accepted / total_requests * 100, 1) if total_requests else 0,
            "via_qr_scan": via_qr,
            "via_manual": total_requests - via_qr,
            "total_messages": total_messages,
            "confirmed_meetings": confirmed_meetings,
        },
        "top_networkers": [
            {"id": r.id, "name": r.full_name, "council": r.council, "connections": r.connections}
            for r in top_networkers
        ]
    }

# ════════════════════════════════════════════════════
# 🔧 HELPERS
# ════════════════════════════════════════════════════

def _get_or_create_profile(participant: Participant, db: Session) -> ParticipantProfile:
    profile = db.query(ParticipantProfile).filter(
        ParticipantProfile.participant_id == participant.id
    ).first()
    if not profile:
        profile = ParticipantProfile(
            participant_id=participant.id,
            event_id=participant.event_id
        )
        db.add(profile)
        db.flush()
    return profile

def _get_connection(id_a: int, id_b: int, db: Session) -> Optional[NetworkingConnection]:
    return db.query(NetworkingConnection).filter(
        or_(
            and_(NetworkingConnection.requester_id == id_a,
                 NetworkingConnection.requested_id == id_b),
            and_(NetworkingConnection.requester_id == id_b,
                 NetworkingConnection.requested_id == id_a)
        )
    ).first()

def _verify_connection_access(connection_id: int, participant_id: int, db: Session) -> NetworkingConnection:
    conn = db.query(NetworkingConnection).filter(
        NetworkingConnection.id == connection_id,
        or_(
            NetworkingConnection.requester_id == participant_id,
            NetworkingConnection.requested_id == participant_id
        ),
        NetworkingConnection.status == "accepted"
    ).first()
    if not conn:
        raise HTTPException(403, "لا يمكن الوصول لهذه المحادثة")
    return conn

def _get_connected_ids(participant_id: int, event_id: int, db: Session) -> set:
    conns = db.query(NetworkingConnection).filter(
        NetworkingConnection.event_id == event_id,
        or_(
            NetworkingConnection.requester_id == participant_id,
            NetworkingConnection.requested_id == participant_id
        )
    ).all()
    ids = set()
    for c in conns:
        ids.add(c.requester_id)
        ids.add(c.requested_id)
    return ids

def _award_points(participant_id: int, event_type: str, points: int, db: Session):
    from app.models.engagement import GamificationEvent
    ge = GamificationEvent(participant_id=participant_id, event_type=event_type, points=points)
    db.add(ge)
    # تحديث networking_score في الملف الشخصي
    profile = db.query(ParticipantProfile).filter(
        ParticipantProfile.participant_id == participant_id
    ).first()
    if profile:
        profile.networking_score = (profile.networking_score or 0) + points

def _serialize_message(msg: DirectMessage, my_id: int) -> dict:
    return {
        "id": msg.id,
        "content": msg.content,
        "type": msg.message_type,
        "is_mine": msg.sender_id == my_id,
        "is_read": msg.is_read,
        "sent_at": str(msg.created_at),
    }

def _serialize_connection(conn: NetworkingConnection) -> dict:
    return {
        "id": conn.id,
        "status": conn.status,
        "via_qr": conn.via_qr_scan,
        "message": conn.message,
    }

def _serialize_profile(p: Participant, profile: ParticipantProfile) -> dict:
    return {
        "participant_id": p.id,
        "full_name": p.full_name,
        "council": p.council,
        "role": p.role,
        "court": p.court,
        "bio": profile.bio,
        "specialties": profile.specialties,
        "jurisdiction": profile.jurisdiction,
        "looking_for": profile.looking_for,
        "years_experience": profile.years_experience,
        "is_visible": profile.is_visible,
        "is_open_to_meet": profile.is_open_to_meet,
        "avatar_url": profile.avatar_url,
        "linkedin_url": profile.linkedin_url,
        "website_url": profile.website_url,
        "networking_score": profile.networking_score,
    }
```

---

### 3. Alembic Migration

```bash
# نفّذ في Terminal:
cd attendance_system
alembic revision --autogenerate -m "professional_networking_v2"
alembic upgrade head
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## الجزء الثاني: Frontend — React
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 4. `dashboard/src/pages/portal/NetworkingHub.jsx`

**صفحة التواصل الرئيسية للمشارك — 4 تبويبات:**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, Calendar, Search,
         UserPlus, Check, X, Star, QrCode, ChevronRight,
         Phone, Mail, Linkedin, Globe, Award } from 'lucide-react';
import { useParticipantAuth } from '../../context/ParticipantAuthContext';
import networkingService from '../../services/networkingService';

// ── ثوابت ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'directory',       icon: Users,         label: 'الدليل',         badge: null },
  { id: 'connections',     icon: UserPlus,      label: 'اتصالاتي',       badge: 'pending_count' },
  { id: 'messages',        icon: MessageCircle, label: 'المحادثات',       badge: 'unread_count' },
  { id: 'meetings',        icon: Calendar,      label: 'الاجتماعات',     badge: null },
];

const SPECIALTIES_OPTIONS = [
  'قانون مدني', 'قانون تجاري', 'تنفيذ الأحكام', 'الإجراءات المدنية',
  'التحكيم', 'الإفلاس', 'قانون الأسرة', 'القانون العقاري',
  'الملكية الفكرية', 'عقود', 'التوثيق', 'إدارة الأعمال'
];

const LOOKING_FOR_OPTIONS = [
  'تعاون مهني', 'تبادل خبرات', 'شراكات', 'معلومات قانونية',
  'زملاء في المهنة', 'الإرشاد المهني', 'عقود عمل'
];

// ── المكوّن الرئيسي ───────────────────────────────────────────────
const NetworkingHub = ({ eventId }) => {
  const { participant } = useParticipantAuth();
  const [activeTab, setActiveTab] = useState('directory');
  const [badges, setBadges] = useState({ pending_count: 0, unread_count: 0 });
  const wsRef = useRef(null);

  // WebSocket للإشعارات الفورية
  useEffect(() => {
    const token = localStorage.getItem('participant_token');
    if (!token || !eventId) return;
    
    const ws = new WebSocket(`${location.origin.replace('http','ws')}/api/v1/ws/${eventId}?token=${token}`);
    wsRef.current = ws;
    
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === 'networking_request' && data.target_participant_id === participant?.id) {
        setBadges(b => ({ ...b, pending_count: b.pending_count + 1 }));
        showToast(`📩 طلب اتصال جديد من ${data.from.full_name}`, 'info');
      }
      if (data.type === 'direct_message' && data.target_participant_id === participant?.id) {
        setBadges(b => ({ ...b, unread_count: b.unread_count + 1 }));
      }
      if (data.type === 'networking_response' && data.target_participant_id === participant?.id) {
        if (data.status === 'accepted') {
          showToast(`✅ قبل ${data.responder.full_name} طلب اتصالك!`, 'success');
        }
      }
      if (data.type === 'meeting_request' && data.target_participant_id === participant?.id) {
        showToast(`📅 دعوة اجتماع من ${data.proposer.full_name}`, 'info');
      }
    };
    
    return () => ws.close();
  }, [eventId, participant]);

  // جلب عدد الإشعارات
  useEffect(() => {
    const fetchBadges = async () => {
      const [conns, unread] = await Promise.all([
        networkingService.getConnections(),
        networkingService.getUnreadCount()
      ]);
      setBadges({
        pending_count: conns.pending_incoming?.length || 0,
        unread_count: unread.unread_count || 0
      });
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#022C22', fontFamily:'Cairo, sans-serif' }}>
      
      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(212,175,55,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ color:'#D4AF37', fontSize:20, fontWeight:900, margin:0 }}>🤝 التواصل المهني</h1>
        <ProfileCompletionBadge participant={participant} />
      </div>
      
      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'#0A3D2B' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const badgeCount = tab.badge ? badges[tab.badge] : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex:1, padding:'12px 8px', border:'none', cursor:'pointer', fontFamily:'Cairo',
                background: activeTab === tab.id ? '#022C22' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #D4AF37' : '2px solid transparent',
                color: activeTab === tab.id ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:4, position:'relative'
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize:11 }}>{tab.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  position:'absolute', top:6, right:'calc(50% - 20px)',
                  background:'#ef4444', color:'#fff', borderRadius:'50%',
                  width:16, height:16, fontSize:10, display:'flex',
                  alignItems:'center', justifyContent:'center', fontWeight:'bold'
                }}>{badgeCount > 9 ? '9+' : badgeCount}</span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      <div style={{ flex:1, overflow:'auto' }}>
        {activeTab === 'directory'   && <DirectoryTab eventId={eventId} myId={participant?.id} />}
        {activeTab === 'connections' && <ConnectionsTab onBadgeUpdate={setBadges} myId={participant?.id} />}
        {activeTab === 'messages'    && <MessagesTab myId={participant?.id} />}
        {activeTab === 'meetings'    && <MeetingsTab myId={participant?.id} />}
      </div>
    </div>
  );
};

// ── تبويب الدليل ──────────────────────────────────────────────────
const DirectoryTab = ({ eventId, myId }) => {
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [openToMeetOnly, setOpenToMeetOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    networkingService.getRecommendations(eventId)
      .then(setRecommendations);
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchDirectory(), 400);
    return () => clearTimeout(timer);
  }, [search, selectedSpecialty, openToMeetOnly]);

  const fetchDirectory = async () => {
    setLoading(true);
    const data = await networkingService.getDirectory(eventId, { search, specialty: selectedSpecialty, open_to_meet: openToMeetOnly || undefined });
    setResults(data.results || []);
    setLoading(false);
  };

  const handleConnect = async (participantId) => {
    await networkingService.sendConnectionRequest(participantId);
    setResults(prev => prev.map(p =>
      p.id === participantId ? { ...p, connection_status: 'pending' } : p
    ));
  };

  return (
    <div style={{ padding:16 }} dir="rtl">
      
      {/* بحث */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <Search size={16} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم، الجهة، التخصص..."
          style={{ width:'100%', padding:'10px 40px 10px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#F0F4F2', fontFamily:'Cairo', fontSize:13, outline:'none', boxSizing:'border-box' }}
        />
      </div>
      
      {/* فلاتر */}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
        <button
          onClick={() => setOpenToMeetOnly(!openToMeetOnly)}
          style={{ padding:'6px 14px', borderRadius:20, border:'1px solid', fontFamily:'Cairo', fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
            background: openToMeetOnly ? '#D4AF37' : 'transparent',
            color: openToMeetOnly ? '#022C22' : '#D4AF37',
            borderColor: '#D4AF37'
          }}
        >
          📅 متاح للاجتماع
        </button>
        {['قانون مدني', 'تنفيذ الأحكام', 'التحكيم', 'عقود'].map(spec => (
          <button key={spec}
            onClick={() => setSelectedSpecialty(selectedSpecialty === spec ? '' : spec)}
            style={{ padding:'6px 14px', borderRadius:20, border:'1px solid rgba(255,255,255,0.15)', fontFamily:'Cairo', fontSize:11, cursor:'pointer', whiteSpace:'nowrap',
              background: selectedSpecialty === spec ? 'rgba(212,175,55,0.2)' : 'transparent',
              color: selectedSpecialty === spec ? '#D4AF37' : 'rgba(255,255,255,0.5)',
            }}
          >{spec}</button>
        ))}
      </div>
      
      {/* التوصيات */}
      {!search && recommendations.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <h3 style={{ color:'#D4AF37', fontSize:13, margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}>
            <Star size={14} /> مقترح لك التواصل معهم
          </h3>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8 }}>
            {recommendations.map(rec => (
              <RecommendationCard key={rec.id} participant={rec} onConnect={handleConnect} />
            ))}
          </div>
        </div>
      )}
      
      {/* النتائج */}
      {loading
        ? <LoadingSkeleton count={5} />
        : results.map(p => (
          <ParticipantCard key={p.id} participant={p} onConnect={handleConnect} />
        ))
      }
    </div>
  );
};

// ── بطاقة المشارك ─────────────────────────────────────────────────
const ParticipantCard = ({ participant: p, onConnect }) => {
  const statusColors = {
    none: 'rgba(255,255,255,0.6)',
    pending: '#D4AF37',
    accepted: '#22c55e',
    declined: '#ef4444'
  };
  const statusLabels = {
    none: 'تواصل',
    pending: 'معلّق',
    accepted: 'متصل ✓',
    declined: 'مرفوض'
  };

  return (
    <div style={{
      background:'rgba(255,255,255,0.04)', borderRadius:12, padding:14,
      marginBottom:10, border:'1px solid rgba(255,255,255,0.06)',
      display:'flex', alignItems:'center', gap:12
    }} dir="rtl">
      
      {/* Avatar */}
      <div style={{
        width:48, height:48, borderRadius:'50%', flexShrink:0,
        background:'linear-gradient(135deg, #022C22, #1A8A6A)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, border:'2px solid rgba(212,175,55,0.3)'
      }}>
        {p.avatar_url
          ? <img src={p.avatar_url} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} alt="" />
          : p.full_name?.charAt(0)
        }
      </div>
      
      <div style={{ flex:1 }}>
        <div style={{ color:'#F0F4F2', fontWeight:'bold', fontSize:14, marginBottom:2 }}>{p.full_name}</div>
        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginBottom:4 }}>{p.council} · {p.role}</div>
        
        {/* التخصصات */}
        {p.specialties?.length > 0 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {p.specialties.slice(0,2).map(s => (
              <span key={s} style={{ background:'rgba(212,175,55,0.1)', color:'#D4AF37', padding:'2px 8px', borderRadius:10, fontSize:10 }}>{s}</span>
            ))}
          </div>
        )}
        
        {/* متاح للاجتماع */}
        {p.is_open_to_meet && (
          <span style={{ color:'#22c55e', fontSize:10, marginTop:4, display:'block' }}>📅 متاح للاجتماع</span>
        )}
      </div>
      
      {/* زر الاتصال */}
      {p.connection_status === 'none' && (
        <button
          onClick={() => onConnect(p.id)}
          style={{ background:'rgba(212,175,55,0.15)', color:'#D4AF37', border:'1px solid rgba(212,175,55,0.3)', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontFamily:'Cairo', fontSize:12, display:'flex', alignItems:'center', gap:4 }}
        >
          <UserPlus size={13} /> تواصل
        </button>
      )}
      {p.connection_status !== 'none' && (
        <span style={{ color: statusColors[p.connection_status], fontSize:12, fontWeight:'bold' }}>
          {statusLabels[p.connection_status]}
        </span>
      )}
    </div>
  );
};

// ── تبويب المحادثات ───────────────────────────────────────────────
const MessagesTab = ({ myId }) => {
  const [connections, setConnections] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    networkingService.getConnections()
      .then(d => setConnections(d.connected || []));
  }, []);

  const openChat = async (conn) => {
    setActiveChat(conn);
    const msgs = await networkingService.getChatHistory(conn.connection_id);
    setMessages(msgs);
    setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    // مسح Badge
    setConnections(prev => prev.map(c =>
      c.connection_id === conn.connection_id ? { ...c, unread_messages: 0 } : c
    ));
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeChat) return;
    const msg = await networkingService.sendMessage(activeChat.connection_id, newMsg.trim());
    setMessages(prev => [...prev, msg]);
    setNewMsg('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
  };

  if (activeChat) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }} dir="rtl">
      {/* Chat Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => setActiveChat(null)} style={{ background:'none', border:'none', color:'#D4AF37', cursor:'pointer' }}>← رجوع</button>
        <div style={{ color:'#F0F4F2', fontWeight:'bold', fontSize:14 }}>{activeChat.full_name}</div>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{activeChat.council}</div>
      </div>
      
      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', justifyContent: msg.is_mine ? 'flex-start' : 'flex-end' }}>
            <div style={{
              maxWidth:'75%', padding:'10px 14px', borderRadius:12,
              background: msg.is_mine ? '#1A8A6A' : 'rgba(255,255,255,0.08)',
              color:'#F0F4F2', fontSize:13, lineHeight:1.5
            }}>
              {msg.content}
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:4, textAlign: msg.is_mine ? 'left' : 'right' }}>
                {msg.is_mine && (msg.is_read ? '✓✓' : '✓')} {new Date(msg.sent_at).toLocaleTimeString('ar', { hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div style={{ padding:12, borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:8 }}>
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="اكتب رسالتك..."
          style={{ flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, color:'#F0F4F2', fontFamily:'Cairo', fontSize:13, outline:'none' }}
        />
        <button onClick={sendMessage}
          style={{ width:40, height:40, borderRadius:'50%', background:'#D4AF37', border:'none', cursor:'pointer', color:'#022C22', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ←
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding:16 }} dir="rtl">
      <h3 style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginBottom:12 }}>محادثاتك</h3>
      {connections.length === 0
        ? <EmptyState icon="💬" text="لا محادثات بعد — تواصل مع أحد المشاركين" />
        : connections.map(conn => (
          <div key={conn.connection_id}
            onClick={() => openChat(conn)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:14, borderRadius:12, marginBottom:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', cursor:'pointer' }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg, #022C22, #1A8A6A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, position:'relative' }}>
              {conn.full_name?.charAt(0)}
              {conn.unread_messages > 0 && (
                <span style={{ position:'absolute', top:-2, right:-2, background:'#ef4444', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>
                  {conn.unread_messages}
                </span>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#F0F4F2', fontWeight: conn.unread_messages > 0 ? 'bold' : 'normal', fontSize:14 }}>{conn.full_name}</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{conn.council}</div>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
          </div>
        ))
      }
    </div>
  );
};

// مكوّنات مساعدة
const LoadingSkeleton = ({ count }) => Array(count).fill(0).map((_, i) => (
  <div key={i} style={{ height:80, background:'rgba(255,255,255,0.04)', borderRadius:12, marginBottom:10, animation:'pulse 1.5s infinite' }} />
));

const EmptyState = ({ icon, text }) => (
  <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.3)' }}>
    <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
    <div style={{ fontSize:13, fontFamily:'Cairo' }}>{text}</div>
  </div>
);

const ProfileCompletionBadge = ({ participant }) => (
  <div style={{ background:'rgba(212,175,55,0.1)', border:'1px solid rgba(212,175,55,0.2)', borderRadius:20, padding:'4px 12px', color:'#D4AF37', fontSize:11 }}>
    <Award size={12} style={{ display:'inline', marginLeft:4 }} />
    {participant?.full_name}
  </div>
);

const RecommendationCard = ({ participant: p, onConnect }) => (
  <div style={{ minWidth:150, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:12, border:'1px solid rgba(212,175,55,0.15)', textAlign:'center' }}>
    <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg, #022C22, #1A8A6A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, margin:'0 auto 8px' }}>
      {p.full_name?.charAt(0)}
    </div>
    <div style={{ color:'#F0F4F2', fontSize:12, fontWeight:'bold', marginBottom:2 }}>{p.full_name?.split(' ')[0]}</div>
    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:6 }}>{p.match_score}% توافق</div>
    <div style={{ color:'rgba(212,175,55,0.7)', fontSize:10, marginBottom:8 }}>{p.match_reasons?.[0]}</div>
    <button onClick={() => onConnect(p.id)}
      style={{ background:'rgba(212,175,55,0.15)', color:'#D4AF37', border:'1px solid rgba(212,175,55,0.3)', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontFamily:'Cairo', fontSize:11 }}>
      تواصل
    </button>
  </div>
);

export default NetworkingHub;
```

---

### 5. `dashboard/src/services/networkingService.js`

```js
import api from './api';

const networkingService = {
  // Profile
  getMyProfile:           ()           => api.get('networking/profile/me').then(r => r.data),
  updateMyProfile:        (data)       => api.patch('networking/profile/me', data).then(r => r.data),
  getParticipantProfile:  (id)         => api.get(`networking/profile/${id}`).then(r => r.data),

  // Directory
  getDirectory: (eventId, params = {}) =>
    api.get('networking/directory', { params: { event_id: eventId, ...params } }).then(r => r.data),

  // Recommendations
  getRecommendations: (eventId) =>
    api.get('networking/recommendations', { params: { event_id: eventId } }).then(r => r.data),

  // Connections
  sendConnectionRequest: (targetId, message = '', viaQr = false) =>
    api.post(`networking/connect/${targetId}`, null, { params: { message, via_qr: viaQr } }).then(r => r.data),

  quickConnectViaQR: (scannedQr, location = null) =>
    api.post('networking/connect/qr-scan', null, { params: { scanned_qr: scannedQr, location } }).then(r => r.data),

  respondToRequest: (connectionId, action) =>
    api.patch(`networking/connect/${connectionId}/respond`, null, { params: { action } }).then(r => r.data),

  getConnections: () => api.get('networking/connections').then(r => r.data),

  // Messages
  getChatHistory: (connectionId, skip = 0) =>
    api.get(`networking/chat/${connectionId}`, { params: { skip } }).then(r => r.data),

  sendMessage: (connectionId, content) =>
    api.post(`networking/chat/${connectionId}`, null, { params: { content } }).then(r => r.data),

  getUnreadCount: () => api.get('networking/chat/unread-count').then(r => r.data),

  // Meetings
  proposeMeeting: (connectionId, data) =>
    api.post('networking/meetings/propose', null, { params: { connection_id: connectionId, ...data } }).then(r => r.data),

  respondToMeeting: (meetingId, action, counterTime = null) =>
    api.patch(`networking/meetings/${meetingId}/respond`, null, { params: { action, counter_time: counterTime } }).then(r => r.data),

  getMySchedule: () => api.get('networking/meetings/my-schedule').then(r => r.data),

  // vCard
  downloadVCard: (participantId) =>
    api.get(`networking/vcard/${participantId}`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contact_${participantId}.vcf`;
      a.click();
    }),

  // Admin Analytics
  getNetworkingAnalytics: (eventId) =>
    api.get(`networking/admin/analytics/${eventId}`).then(r => r.data),
};

export default networkingService;
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## تسجيل الـ Router في main.py
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

في `app/main.py`، تأكد من وجود:

```python
app.include_router(
    networking.router,
    prefix=f"{settings.API_V1_STR}/networking",
    tags=["🤝 التواصل المهني"]
)
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## الناتج المطلوب
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أعطني هذه الملفات كاملة قابلة للتشغيل:

**Backend:**
1. `app/models/networking.py` — النماذج الجديدة كاملة
2. `app/routers/networking.py` — الـ router كاملاً
3. Alembic migration جديدة

**Frontend:**
4. `dashboard/src/pages/portal/NetworkingHub.jsx`
5. `dashboard/src/pages/portal/ConnectionsTab.jsx` — تبويب الاتصالات (قبول/رفض)
6. `dashboard/src/pages/portal/MeetingsTab.jsx` — تبويب الاجتماعات
7. `dashboard/src/services/networkingService.js`

**القواعد:**
- الكود الجديد يستبدل `networking.py` القديم بالكامل
- استخدم `participant.id` (Integer FK) وليس `participant.qr_code` (String) للمراجع
- كل SQL queries تستخدم SQLAlchemy ORM — لا raw SQL
- كل WebSocket broadcasts تستخدم `manager.broadcast_to_event(event_id, payload)`
```

---

*برومبت احترافي مبني على تحليل مباشر للكود وخبرة في منصات التواصل المهني*
