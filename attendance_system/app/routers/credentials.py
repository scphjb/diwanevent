from fastapi import APIRouter, Depends, HTTPException, Response, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.template import BadgeTemplate, CertificateTemplate
from app.models.participant import Participant
from app.models.event import Event
from app.utils.badge import generate_badge_pdf
from app.utils.certificates import generate_dynamic_pdf, generate_certificate_pdf
from app.core.auth_deps import get_current_active_user
from app.models.user import User

router = APIRouter()

# --- Design Management ---
@router.post("/badges/design")
def save_badge_design(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_active_user)):
    # Logic to save or update BadgeTemplate JSON
    event_id = data.get('event_id')
    template = db.query(BadgeTemplate).filter(BadgeTemplate.event_id == event_id).first()
    if not template:
        template = BadgeTemplate(event_id=event_id, elements_config=data.get('elements_config'))
        db.add(template)
    else:
        template.elements_config = data.get('elements_config')
    db.commit()
    return {"status": "saved"}

# --- PDF Generation & Printing ---
@router.get("/badges/print/{participant_id}")
def print_badge(participant_id: int, db: Session = Depends(get_db)):
    p = db.query(Participant).get(participant_id)
    if not p: raise HTTPException(status_code=404)
    
    template = db.query(BadgeTemplate).filter(BadgeTemplate.event_id == p.event_id).first()
    template_config = template.elements_config if template else None
    
    pdf = generate_badge_pdf(p, template_config)
    return Response(content=pdf.getvalue(), media_type="application/pdf")

@router.get("/certificates/download/{participant_id}")
def download_certificate_by_id(participant_id: int, db: Session = Depends(get_db)):
    p = db.query(Participant).get(participant_id)
    if not p: raise HTTPException(status_code=404)
    event = db.query(Event).get(p.event_id)
    
    pdf = generate_certificate_pdf(p.__dict__, event.__dict__)
    return Response(content=pdf.getvalue(), media_type="application/pdf")

from app.models.participant import Attendance

@router.get("/{event_id}/participant/{qr_code}/certificate")
def download_certificate(
    event_id: int,
    qr_code: str,
    db: Session = Depends(get_db)
):
    """تحميل شهادة الحضور — متاح للمشارك بدون تسجيل دخول"""
    participant = db.query(Participant).filter(
        Participant.qr_code == qr_code,
        Participant.event_id == event_id
    ).first()
    if not participant:
        raise HTTPException(404, "المشارك غير موجود")
    
    # تحقق من الحضور الفعلي
    attendance = db.query(Attendance).filter(
        Attendance.participant_id == participant.id,
        Attendance.event_type == 'check_in'
    ).first()
    if not attendance:
        raise HTTPException(403, "الشهادة تُمنح فقط للحاضرين المسجلين")
    
    event = db.query(Event).filter(Event.id == event_id).first()
    
    pdf = generate_certificate_pdf(participant.__dict__, event.__dict__)
    
    return Response(
        content=pdf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate_{qr_code}.pdf"}
    )
