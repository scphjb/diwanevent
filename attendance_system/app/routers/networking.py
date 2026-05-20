from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, and_, func, select
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
from app.utils.encryption import encrypt_message, decrypt_message

router = APIRouter()

# ════════════════════════════════════════════════════
# 📋 SECTION 1: الملف الشخصي المهني
# ════════════════════════════════════════════════════

@router.get("/profile/me")
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جلب ملفي الشخصي المهني"""
    stmt = select(ParticipantProfile).filter(
        ParticipantProfile.participant_id == me.id
    )
    res = await db.execute(stmt)
    profile = res.scalars().first()
    
    if not profile:
        # إنشاء ملف تلقائي عند أول طلب
        profile = ParticipantProfile(
            participant_id=me.id,
            event_id=me.event_id,
            is_visible=True
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    
    return _serialize_profile(me, profile)

@router.patch("/profile/me")
async def update_my_profile(
    data: dict,
    db: AsyncSession = Depends(get_db),
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
    
    profile = await _get_or_create_profile(me, db)
    
    for key, value in data.items():
        if key in ALLOWED:
            setattr(profile, key, value)
    
    await db.commit()
    
    # Broadcast لتحديث الدليل في الوقت الفعلي
    await manager.broadcast_to_event(me.event_id, {
        "type": "profile_updated",
        "participant_id": me.id
    })
    
    return {"status": "success", "profile": _serialize_profile(me, profile)}

@router.get("/profile/{participant_id}")
async def get_participant_profile(
    participant_id: int,
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جلب ملف شخصي مشارك آخر مع إظهار المعلومات حسب حالة الاتصال"""
    stmt = select(Participant).filter(
        Participant.id == participant_id,
        Participant.event_id == me.event_id
    )
    res = await db.execute(stmt)
    target = res.scalars().first()
    if not target:
        raise HTTPException(404, "المشارك غير موجود")
    
    profile = await _get_or_create_profile(target, db)
    
    # تحديد مستوى الظهور
    conn = await _get_connection(me.id, target.id, db)
    is_connected = conn and conn.status == "accepted"
    
    result = {
        "id": target.id,
        "full_name": target.full_name,
        "organization": target.organization,
        "role": target.role,
        "department": target.department,
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
async def get_directory(
    event_id: int,
    search: Optional[str] = None,
    specialty: Optional[str] = None,
    looking_for: Optional[str] = None,
    open_to_meet: Optional[bool] = None,
    skip: int = 0,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    دليل المشاركين مع بحث وفلترة متقدمة.
    يُظهر فقط من وافق على الظهور (is_visible = True).
    """
    query = select(Participant, ParticipantProfile).join(
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
                Participant.organization.ilike(f"%{search}%"),
                Participant.role.ilike(f"%{search}%"),
                ParticipantProfile.bio.ilike(f"%{search}%")
            )
        )
    
    if specialty:
        # PostgreSQL specific query for JSON array contains
        from sqlalchemy.dialects.postgresql import JSONB
        query = query.filter(
            func.cast(ParticipantProfile.specialties, JSONB).contains(func.cast([specialty], JSONB))
        )
    
    if open_to_meet is not None:
        query = query.filter(ParticipantProfile.is_open_to_meet == open_to_meet)
    
    # ترتيب: المتصلون أولاً، ثم الأعلى networking_score
    query_ordered = query.order_by(
        ParticipantProfile.networking_score.desc()
    ).offset(skip).limit(limit)
    
    res = await db.execute(query_ordered)
    results = res.all()
    
    directory = []
    for participant, profile in results:
        conn = await _get_connection(me.id, participant.id, db)
        directory.append({
            "id": participant.id,
            "full_name": participant.full_name,
            "organization": participant.organization,
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
    
    # Get total count
    count_stmt = select(func.count()).select_from(Participant).join(
        ParticipantProfile,
        ParticipantProfile.participant_id == Participant.id
    ).filter(
        Participant.event_id == event_id,
        Participant.id != me.id,
        ParticipantProfile.is_visible == True
    )
    if search:
        count_stmt = count_stmt.filter(
            or_(
                Participant.full_name.ilike(f"%{search}%"),
                Participant.organization.ilike(f"%{search}%"),
                Participant.role.ilike(f"%{search}%"),
                ParticipantProfile.bio.ilike(f"%{search}%")
            )
        )
    if specialty:
        from sqlalchemy.dialects.postgresql import JSONB
        count_stmt = count_stmt.filter(
            func.cast(ParticipantProfile.specialties, JSONB).contains(func.cast([specialty], JSONB))
        )
    if open_to_meet is not None:
        count_stmt = count_stmt.filter(ParticipantProfile.is_open_to_meet == open_to_meet)
        
    total_count = (await db.execute(count_stmt)).scalar_one()
    
    return {
        "total": total_count,
        "results": directory
    }

@router.get("/recommendations")
async def get_smart_recommendations(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    توصيات ذكية بناءً على:
    1. نفس الجهة (organization matching)
    2. التخصصات المشتركة
    3. "ما يبحث عنه" vs "ما يقدمه" الآخرون
    4. لم يُتواصل معهم بعد
    """
    my_profile = await _get_or_create_profile(me, db)
    
    # جلب IDs المتصلين حالياً لاستبعادهم
    connected_ids = await _get_connected_ids(me.id, event_id, db)
    connected_ids.add(me.id)
    
    # البحث عن مرشحين
    stmt = select(Participant, ParticipantProfile).join(
        ParticipantProfile,
        ParticipantProfile.participant_id == Participant.id
    ).filter(
        Participant.event_id == event_id,
        Participant.id.not_in(connected_ids),
        ParticipantProfile.is_visible == True
    )
    res = await db.execute(stmt)
    candidates = res.all()
    
    scored = []
    for p, prof in candidates:
        score = 0
        reasons = []
        
        # نفس الجهة
        if p.organization == me.organization:
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
                "organization": p.organization,
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
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    إرسال طلب اتصال مع رسالة اختيارية.
    via_qr=True عند مسح شارة الشخص.
    """
    target = await db.get(Participant, target_id)
    if not target or target.event_id != me.event_id:
        raise HTTPException(404, "المشارك غير موجود")
    
    # تحقق من عدم وجود طلب مسبق
    stmt = select(NetworkingConnection).filter(
        NetworkingConnection.event_id == me.event_id,
        or_(
            and_(NetworkingConnection.requester_id == me.id,
                 NetworkingConnection.requested_id == target_id),
            and_(NetworkingConnection.requester_id == target_id,
                 NetworkingConnection.requested_id == me.id)
        )
    )
    res = await db.execute(stmt)
    existing = res.scalars().first()
    
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
    await _award_points(me.id, "networking_request_sent", 3, db)
    
    await db.commit()
    await db.refresh(conn)
    
    # إشعار فوري للمستلم عبر WebSocket
    await manager.broadcast_to_event(me.event_id, {
        "type": "networking_request",
        "connection_id": conn.id,
        "from": {"id": me.id, "full_name": me.full_name, "organization": me.organization},
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
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """
    تواصل فوري عبر مسح QR شارة مشارك آخر.
    auto_connect=True → يرسل طلب اتصال فورياً
    auto_connect=False → يعرض الملف الشخصي فقط
    """
    stmt = select(Participant).filter(
        Participant.qr_code == scanned_qr,
        Participant.event_id == me.event_id
    )
    res = await db.execute(stmt)
    target = res.scalars().first()
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
            "organization": target.organization,
            "role": target.role,
        }
    }
    
    if auto_connect:
        # إرسال طلب اتصال تلقائي
        existing = await _get_connection(me.id, target.id, db)
        if not existing:
            conn = NetworkingConnection(
                event_id=me.event_id,
                requester_id=me.id,
                requested_id=target.id,
                message=f"تواصلنا في {location or 'الفعالية'} 👋",
                via_qr_scan=True
            )
            db.add(conn)
            await _award_points(me.id, "qr_connect", 5, db)
            await db.commit()
            result["connection_status"] = "request_sent"
            result["connection_id"] = conn.id
        else:
            result["connection_status"] = existing.status
    
    await db.commit()
    return result

@router.patch("/connect/{connection_id}/respond")
async def respond_to_request(
    connection_id: int,
    action: str,  # "accept" | "decline" | "block"
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """قبول أو رفض أو حجب طلب اتصال"""
    stmt = select(NetworkingConnection).filter(
        NetworkingConnection.id == connection_id,
        NetworkingConnection.requested_id == me.id
    )
    res = await db.execute(stmt)
    conn = res.scalars().first()
    if not conn:
        raise HTTPException(404, "الطلب غير موجود")
    
    if action not in ("accept", "decline", "block"):
        raise HTTPException(400, "إجراء غير صالح")
    
    status_map = {"accept": "accepted", "decline": "declined", "block": "blocked"}
    conn.status = status_map[action]
    
    if action == "accept":
        conn.accepted_at = datetime.now()
        await _award_points(me.id, "networking_accepted", 10, db)
        await _award_points(conn.requester_id, "networking_accepted", 10, db)
    
    await db.commit()
    
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
async def get_my_connections(
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """قائمة اتصالاتي المقبولة + الطلبات المعلقة"""
    # الطلبات الواردة
    stmt_incoming = select(NetworkingConnection).filter(
        NetworkingConnection.requested_id == me.id,
        NetworkingConnection.status == "pending"
    )
    res_incoming = await db.execute(stmt_incoming)
    incoming = res_incoming.scalars().all()
    
    # الاتصالات المقبولة
    stmt_accepted = select(NetworkingConnection).filter(
        or_(
            NetworkingConnection.requester_id == me.id,
            NetworkingConnection.requested_id == me.id
        ),
        NetworkingConnection.status == "accepted"
    )
    res_accepted = await db.execute(stmt_accepted)
    accepted = res_accepted.scalars().all()
    
    async def _format_conn(conn, is_incoming=False):
        other_id = conn.requester_id if conn.requested_id == me.id else conn.requested_id
        other = await db.get(Participant, other_id)
        profile = await _get_or_create_profile(other, db)
        
        # عدد الرسائل غير المقروءة
        stmt_unread = select(func.count(DirectMessage.id)).filter(
            DirectMessage.connection_id == conn.id,
            DirectMessage.sender_id != me.id,
            DirectMessage.is_read == False
        )
        unread = (await db.execute(stmt_unread)).scalar_one()
        
        return {
            "connection_id": conn.id,
            "participant_id": other_id,
            "full_name": other.full_name,
            "organization": other.organization,
            "role": other.role,
            "avatar_url": profile.avatar_url,
            "status": conn.status,
            "via_qr": conn.via_qr_scan,
            "message": conn.message if is_incoming else None,
            "unread_messages": unread,
            "connected_at": str(conn.accepted_at) if conn.accepted_at else None,
        }
    
    formatted_incoming = []
    for c in incoming:
        formatted_incoming.append(await _format_conn(c, True))
        
    formatted_accepted = []
    for c in accepted:
        formatted_accepted.append(await _format_conn(c))
        
    return {
        "pending_incoming": formatted_incoming,
        "connected": formatted_accepted,
        "total_connections": len(accepted)
    }

# ════════════════════════════════════════════════════
# 💬 SECTION 4: المحادثة المباشرة
# ════════════════════════════════════════════════════

@router.get("/chat/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """عدد الرسائل غير المقروءة الإجمالي"""
    stmt = select(func.count(DirectMessage.id)).join(
        NetworkingConnection,
        DirectMessage.connection_id == NetworkingConnection.id
    ).filter(
        or_(
            NetworkingConnection.requester_id == me.id,
            NetworkingConnection.requested_id == me.id
        ),
        DirectMessage.sender_id != me.id,
        DirectMessage.is_read == False
    )
    count = (await db.execute(stmt)).scalar_one()
    return {"unread_count": count}

@router.get("/chat/{connection_id}")
async def get_chat_history(
    connection_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جلب تاريخ المحادثة مع علامة "مقروء" تلقائية"""
    conn = await _verify_connection_access(connection_id, me.id, db)
    
    stmt = select(DirectMessage).filter(
        DirectMessage.connection_id == connection_id
    ).order_by(DirectMessage.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    messages = res.scalars().all()
    
    # تحديد الرسائل كمقروءة
    from sqlalchemy import update
    stmt_upd = update(DirectMessage).filter(
        DirectMessage.connection_id == connection_id,
        DirectMessage.sender_id != me.id,
        DirectMessage.is_read == False
    ).values(is_read=True, read_at=datetime.now())
    await db.execute(stmt_upd)
    await db.commit()
    
    return [_serialize_message(m, me.id) for m in reversed(messages)]

@router.post("/chat/{connection_id}")
async def send_message(
    connection_id: int,
    content: str,
    message_type: str = "text",
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """إرسال رسالة مباشرة"""
    conn = await _verify_connection_access(connection_id, me.id, db)
    
    if not content.strip():
        raise HTTPException(400, "الرسالة فارغة")
    if len(content) > 2000:
        raise HTTPException(400, "الرسالة طويلة جداً (2000 حرف كحد أقصى)")
    
    msg = DirectMessage(
        connection_id=connection_id,
        sender_id=me.id,
        content=encrypt_message(content.strip()),
        message_type=message_type
    )
    db.add(msg)
    await _award_points(me.id, "message_sent", 1, db)
    await db.commit()
    await db.refresh(msg)
    
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
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """اقتراح موعد اجتماع مع مشارك متصل"""
    conn = await _verify_connection_access(connection_id, me.id, db)
    
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
    await db.commit()
    
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
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """قبول أو رفض أو إعادة جدولة اجتماع"""
    stmt = select(MeetingRequest).filter(
        MeetingRequest.id == meeting_id,
        MeetingRequest.recipient_id == me.id
    )
    res = await db.execute(stmt)
    meeting = res.scalars().first()
    if not meeting:
        raise HTTPException(404, "الاجتماع غير موجود")
    
    if action == "confirm":
        meeting.status = "confirmed"
        meeting.confirmed_time = meeting.proposed_time
        await _award_points(me.id, "meeting_confirmed", 15, db)
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
    
    await db.commit()
    
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
async def get_my_meeting_schedule(
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """جدول اجتماعاتي المؤكدة والمقترحة"""
    stmt = select(MeetingRequest).filter(
        or_(
            MeetingRequest.proposer_id == me.id,
            MeetingRequest.recipient_id == me.id
        ),
        MeetingRequest.status.in_(["proposed", "confirmed"])
    ).order_by(MeetingRequest.proposed_time.asc())
    res = await db.execute(stmt)
    meetings = res.scalars().all()
    
    result = []
    for m in meetings:
        other_id = m.recipient_id if m.proposer_id == me.id else m.proposer_id
        other = await db.get(Participant, other_id)
        result.append({
            "meeting_id": m.id,
            "with": {"id": other.id, "full_name": other.full_name, "organization": other.organization},
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
async def download_vcard(
    participant_id: int,
    db: AsyncSession = Depends(get_db),
    me: Participant = Depends(get_current_participant)
):
    """تحميل vCard (.vcf) — متاح فقط للاتصالات المقبولة"""
    conn = await _get_connection(me.id, participant_id, db)
    if not conn or conn.status != "accepted":
        raise HTTPException(403, "يجب قبول طلب الاتصال أولاً")
    
    p = await db.get(Participant, participant_id)
    profile = await _get_or_create_profile(p, db)
    
    vcard = "\n".join([
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{p.full_name}",
        f"N:;{p.full_name};;;",
        f"ORG:{p.organization}",
        f"TITLE:{p.role or 'مشارك'}",
        f"EMAIL;TYPE=INTERNET:{p.email or ''}",
        f"TEL;TYPE=CELL:{p.phone_number or ''}",
        f"URL:{profile.linkedin_url or ''}",
        f"NOTE:تم الاتصال عبر منصة ديوان للفعاليات | {p.department or ''}",
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
async def get_networking_analytics(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    تحليلات التواصل للمنظم:
    - إجمالي الطلبات
    - نسبة القبول
    - الأكثر تواصلاً
    - نشاط القنوات (QR vs Manual)
    - الاجتماعات المؤكدة
    """
    stmt_requests = select(func.count(NetworkingConnection.id)).filter(
        NetworkingConnection.event_id == event_id
    )
    total_requests = (await db.execute(stmt_requests)).scalar_one()
    
    stmt_accepted = select(func.count(NetworkingConnection.id)).filter(
        NetworkingConnection.event_id == event_id,
        NetworkingConnection.status == "accepted"
    )
    accepted = (await db.execute(stmt_accepted)).scalar_one()
    
    stmt_qr = select(func.count(NetworkingConnection.id)).filter(
        NetworkingConnection.event_id == event_id,
        NetworkingConnection.via_qr_scan == True
    )
    via_qr = (await db.execute(stmt_qr)).scalar_one()
    
    stmt_messages = select(func.count(DirectMessage.id)).join(
        NetworkingConnection
    ).filter(NetworkingConnection.event_id == event_id)
    total_messages = (await db.execute(stmt_messages)).scalar_one()
    
    stmt_meetings = select(func.count(MeetingRequest.id)).filter(
        MeetingRequest.event_id == event_id,
        MeetingRequest.status == "confirmed"
    )
    confirmed_meetings = (await db.execute(stmt_meetings)).scalar_one()
    
    # أكثر 5 مشاركين تواصلاً
    stmt_networkers = select(
        Participant.id, Participant.full_name, Participant.organization,
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
    ).group_by(Participant.id, Participant.full_name, Participant.organization).order_by(func.count(NetworkingConnection.id).desc()).limit(5)
    
    res_networkers = await db.execute(stmt_networkers)
    top_networkers = res_networkers.all()
    
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
            {"id": r.id, "name": r.full_name, "organization": r.organization, "connections": r.connections}
            for r in top_networkers
        ]
    }

# ════════════════════════════════════════════════════
# 🔧 HELPERS
# ════════════════════════════════════════════════════

async def _get_or_create_profile(participant: Participant, db: AsyncSession) -> ParticipantProfile:
    stmt = select(ParticipantProfile).filter(
        ParticipantProfile.participant_id == participant.id
    )
    res = await db.execute(stmt)
    profile = res.scalars().first()
    if not profile:
        profile = ParticipantProfile(
            participant_id=participant.id,
            event_id=participant.event_id
        )
        db.add(profile)
        await db.flush()
    return profile

async def _get_connection(id_a: int, id_b: int, db: AsyncSession) -> Optional[NetworkingConnection]:
    stmt = select(NetworkingConnection).filter(
        or_(
            and_(NetworkingConnection.requester_id == id_a,
                 NetworkingConnection.requested_id == id_b),
            and_(NetworkingConnection.requester_id == id_b,
                 NetworkingConnection.requested_id == id_a)
        )
    )
    res = await db.execute(stmt)
    return res.scalars().first()

async def _verify_connection_access(connection_id: int, participant_id: int, db: AsyncSession) -> NetworkingConnection:
    stmt = select(NetworkingConnection).filter(
        NetworkingConnection.id == connection_id,
        or_(
            NetworkingConnection.requester_id == participant_id,
            NetworkingConnection.requested_id == participant_id
        ),
        NetworkingConnection.status == "accepted"
    )
    res = await db.execute(stmt)
    conn = res.scalars().first()
    if not conn:
        raise HTTPException(403, "لا يمكن الوصول لهذه المحادثة")
    return conn

async def _get_connected_ids(participant_id: int, event_id: int, db: AsyncSession) -> set:
    stmt = select(NetworkingConnection).filter(
        NetworkingConnection.event_id == event_id,
        or_(
            NetworkingConnection.requester_id == participant_id,
            NetworkingConnection.requested_id == participant_id
        )
    )
    res = await db.execute(stmt)
    conns = res.scalars().all()
    ids = set()
    for c in conns:
        ids.add(c.requester_id)
        ids.add(c.requested_id)
    return ids

async def _award_points(participant_id: int, event_type: str, points: int, db: AsyncSession):
    try:
        from app.models.engagement import GamificationEvent
        ge = GamificationEvent(participant_id=participant_id, event_type=event_type, points=points)
        db.add(ge)
        # تحديث networking_score في الملف الشخصي
        stmt = select(ParticipantProfile).filter(
            ParticipantProfile.participant_id == participant_id
        )
        res = await db.execute(stmt)
        profile = res.scalars().first()
        if profile:
            profile.networking_score = (profile.networking_score or 0) + points
    except Exception as e:
        print(f"Failed to award points: {e}")

def _serialize_message(msg: DirectMessage, my_id: int) -> dict:
    return {
        "id": msg.id,
        "content": decrypt_message(msg.content),
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
        "organization": p.organization,
        "role": p.role,
        "department": p.department,
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
