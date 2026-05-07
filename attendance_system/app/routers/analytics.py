from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from typing import Dict, List, Any
from app.core.database import get_db
from app.models.participant import Participant
from app.models.event import Event
from datetime import datetime, timedelta

from app.core.auth_deps import get_current_active_user
from app.models.user import User

from app.core.rbac import require_permission

router = APIRouter()

@router.get("/{event_id}/summary")
def get_event_summary(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    جلب ملخص إحصائي شامل للفعالية باستخدام سجلات الحضور الفعلية.
    """
    from app.models.participant import Participant, Attendance
    from sqlalchemy import func, distinct

    total = db.query(func.count(Participant.id))\
               .filter(Participant.event_id == event_id).scalar() or 0
    
    # الحضور الفعلي من جدول attendance
    checked_in = db.query(func.count(distinct(Attendance.participant_id)))\
                   .join(Participant, Attendance.participant_id == Participant.id)\
                   .filter(
                       Participant.event_id == event_id,
                       Attendance.event_type == 'check_in'
                   ).scalar() or 0
    
    # توزيع حسب الجهة مع الحضور الصحيح
    by_council = db.query(
        Participant.council,
        func.count(Participant.id).label("total"),
        func.count(Attendance.id).label("present")
    ).outerjoin(
        Attendance,
        (Attendance.participant_id == Participant.id) & 
        (Attendance.event_type == 'check_in')
    ).filter(Participant.event_id == event_id)\
     .group_by(Participant.council)\
     .all()
    
    return {
        "event_id": event_id,
        "overview": {
            "total_invited": total,
            "checked_in": checked_in,
            "not_present": total - checked_in,
            "attendance_rate": round(checked_in / total * 100, 2) if total > 0 else 0
        },
        "councils_distribution": [
            {
                "name": r.council, 
                "total": r.total, 
                "present": r.present,
                "rate": round(r.present/r.total*100, 1) if r.total > 0 else 0
            }
            for r in by_council
        ]
    }

from app.models.participant import Participant, Attendance

@router.get("/{event_id}/peak-hours")
def get_peak_hours(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    تحليل أوقات الذروة للحضور (Peak Hours) بناءً على سجلات الحضور الفعلية.
    """
    peak_data = db.query(
        func.extract('hour', Attendance.check_in_time).label("hour"),
        func.count(Attendance.id).label("count")
    ).join(Participant, Attendance.participant_id == Participant.id)\
     .filter(Participant.event_id == event_id)\
     .group_by(func.extract('hour', Attendance.check_in_time))\
     .order_by(func.extract('hour', Attendance.check_in_time))\
     .all()

    return [
        {"hour": f"{int(row.hour)}:00", "count": row.count} for row in peak_data
    ]

@router.get("/{event_id}/export-data")
def get_export_raw_data(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    جلب البيانات الخام مهيأة للتصدير (Excel/PDF) مع أوقات الدخول الصحيحة.
    """
    # Join participants with their latest attendance record
    results = db.query(
        Participant,
        Attendance.check_in_time
    ).outerjoin(Attendance, (Participant.id == Attendance.participant_id) & (Attendance.event_type == 'check_in'))\
     .filter(Participant.event_id == event_id)\
     .all()
    
    return [
        {
            "id": p.id,
            "name": p.full_name,
            "organization": p.council,
            "status": "حاضر" if check_in else "لم يحضر",
            "check_in": check_in.isoformat() if check_in else None
        }
        for p, check_in in results
    ]

from fastapi import Response
from app.utils.report_generator import generate_official_report

@router.get("/{event_id}/export-report")
def export_official_report(
    event_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("analytics:read"))
):
    """
    تصدير المحضر الرسمي للفعالية (DOCX).
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Get stats
    summary = get_event_summary(event_id, db, current_user, None)
    
    # Get participants
    participants = db.query(Participant).filter(Participant.event_id == event_id).all()
    
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

