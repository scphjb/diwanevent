from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, case, and_, select, distinct
from typing import Dict, List, Any
from app.core.database import get_db
from app.models.participant import Participant, Attendance
from app.models.event import Event
from datetime import datetime, timedelta

from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.core.rbac import require_permission

router = APIRouter()

@router.get("/{event_id}/summary")
async def get_event_summary(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    جلب ملخص إحصائي شامل للفعالية بشكل Async بالكامل.
    """
    # 1. إجمالي المدعوين
    total_result = await db.execute(
        select(func.count(Participant.id)).filter(Participant.event_id == event_id)
    )
    total = total_result.scalar() or 0
    
    # 2. الحضور الفعلي
    checked_in_result = await db.execute(
        select(func.count(distinct(Attendance.participant_id)))
        .join(Participant, Attendance.participant_id == Participant.id)
        .filter(
            Participant.event_id == event_id,
            Attendance.event_type == 'check_in'
        )
    )
    checked_in = checked_in_result.scalar() or 0
    
    # 3. توزيع الجهات
    by_council_result = await db.execute(
        select(
            Participant.organization,
            func.count(Participant.id).label("total"),
            func.count(Attendance.id).label("present")
        ).outerjoin(
            Attendance,
            (Attendance.participant_id == Participant.id) & 
            (Attendance.event_type == 'check_in')
        ).filter(Participant.event_id == event_id)
        .group_by(Participant.organization)
    )
    by_council = by_council_result.all()
    
    # 4. الفعالية والقاعات
    event_result = await db.execute(select(Event).filter(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    
    from app.models.event import EventHall
    halls_result = await db.execute(
        select(EventHall).filter(EventHall.event_id == event_id)
    )
    halls = halls_result.scalars().all()
    
    total_halls_capacity = sum(h.capacity for h in halls)
    effective_capacity = total_halls_capacity if total_halls_capacity > 0 else (event.hall_capacity if event else 100)
    
    halls_stats = []
    for h in halls:
        hall_count_result = await db.execute(
            select(func.count(Attendance.id))
            .join(Participant, Attendance.participant_id == Participant.id)
            .filter(
                Participant.event_id == event_id,
                Attendance.event_type == 'check_in',
                Attendance.location_id == h.name
            )
        )
        count = hall_count_result.scalar() or 0
        halls_stats.append({
            "name": h.name,
            "capacity": h.capacity,
            "count": count,
            "rate": round(count / h.capacity * 100, 1) if h.capacity > 0 else 0
        })

    # 5. توزيع البوابات
    by_location_result = await db.execute(
        select(
            Attendance.location_id,
            func.count(Attendance.id).label("count")
        ).join(Participant, Attendance.participant_id == Participant.id)
        .filter(
            Participant.event_id == event_id,
            Attendance.event_type == 'check_in',
            Attendance.location_id != None
        ).group_by(Attendance.location_id)
    )
    by_location = by_location_result.all()
    
    return {
        "event_id": event_id,
        "overview": {
            "total_invited": total,
            "checked_in": checked_in,
            "not_present": total - checked_in,
            "hall_capacity": effective_capacity,
            "attendance_rate": round(checked_in / total * 100, 2) if total > 0 else 0,
            "occupancy_rate": round(checked_in / effective_capacity * 100, 2) if effective_capacity > 0 else 0,
            "organizer_credits": current_user.credits if current_user.role != 'super_admin' else 999999
        },
        "councils_distribution": [
            {
                "name": r.organization, 
                "total": r.total, 
                "present": r.present,
                "rate": round(r.present/r.total*100, 1) if r.total > 0 else 0
            }
            for r in by_council
        ],
        "gates_distribution": [
            {"gate": r.location_id, "count": r.count}
            for r in by_location
        ],
        "halls_occupancy": halls_stats
    }


@router.get("/{event_id}/peak-hours")
async def get_peak_hours(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    تحليل أوقات الذروة للحضور بشكل Async.
    """
    peak_result = await db.execute(
        select(
            func.extract('hour', Attendance.check_in_time).label("hour"),
            func.count(Attendance.id).label("count")
        ).join(Participant, Attendance.participant_id == Participant.id)
        .filter(Participant.event_id == event_id)
        .group_by(func.extract('hour', Attendance.check_in_time))
        .order_by(func.extract('hour', Attendance.check_in_time))
    )
    peak_data = peak_result.all()

    return [
        {"hour": f"{int(row.hour)}:00", "count": row.count} for row in peak_data
    ]


@router.get("/{event_id}/export-data")
async def get_export_raw_data(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    جلب البيانات الخام مهيأة للتصدير بشكل Async.
    """
    results_result = await db.execute(
        select(Participant, Attendance.check_in_time)
        .outerjoin(
            Attendance, 
            (Participant.id == Attendance.participant_id) & 
            (Attendance.event_type == 'check_in')
        )
        .filter(Participant.event_id == event_id)
    )
    results = results_result.all()
    
    return [
        {
            "id": p.id,
            "name": p.full_name,
            "organization": p.organization,
            "status": "حاضر" if check_in else "لم يحضر",
            "check_in": check_in.isoformat() if check_in else None
        }
        for p, check_in in results
    ]


from fastapi import Response
from app.utils.report_generator import generate_official_report

@router.get("/{event_id}/export-report")
async def export_official_report(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    تصدير المحضر الرسمي للفعالية بشكل Async.
    """
    event_result = await db.execute(select(Event).filter(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    summary = await get_event_summary(event_id, db, current_user, None)
    
    participants_result = await db.execute(
        select(Participant).filter(Participant.event_id == event_id)
    )
    participants = participants_result.scalars().all()
    
    report_buffer = generate_official_report(
        event.event_name, 
        summary['overview'], 
        participants
    )
    
    return Response(
        content=report_buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=Official_Report_Event_{event_id}.docx"}
    )
