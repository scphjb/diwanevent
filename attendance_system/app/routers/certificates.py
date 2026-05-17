from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from app.core.database import get_db
from app.models.participant import Participant, Attendance
from app.models.event import Event
from app.utils.email import send_email_with_attachment
import json

router = APIRouter()

async def send_certificate_email(email: str, participant_name: str, pdf_content: bytes):
    subject = "شهادة حضور - Diwan Event"
    body = f"مرحباً {participant_name}، تجد مرفقاً شهادة حضورك للفعالية. نتمنى لك التوفيق."
    await send_email_with_attachment(email, subject, body, pdf_content, "Certificate.pdf")

@router.post("/{event_id}/send-all")
async def send_all_certificates(event_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    event = db.query(Event).get(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # FIX 2: استخدام جدول Attendance للتحقق من الحضور الفعلي بدلاً من payment_status
    checked_in_ids = db.query(distinct(Attendance.participant_id))\
        .join(Participant, Attendance.participant_id == Participant.id)\
        .filter(
            Participant.event_id == event_id,
            Attendance.event_type == 'check_in'
        ).all()
    checked_in_ids = [row[0] for row in checked_in_ids]

    attendees = db.query(Participant).filter(
        Participant.id.in_(checked_in_ids)
    ).all()
    
    # FIX 8: استخدام pdf_renderer بدلاً من generate_certificate_pdf القديمة
    from app.utils.pdf_renderer import render_design_to_pdf
    from app.models.template import BadgeTemplate
    from app.routers.credentials import DEFAULT_CERTIFICATE_DESIGN

    # جلب قالب الشهادة الافتراضي للفعالية
    cert_template = db.query(BadgeTemplate).filter(
        BadgeTemplate.event_id == event_id,
        BadgeTemplate.type.in_(['certificate_attendance', 'certificate'])
    ).first()

    if cert_template:
        design = json.loads(cert_template.design_json)
    else:
        design = DEFAULT_CERTIFICATE_DESIGN

    for p in attendees:
        if p.email:
            participant_data = {
                "full_name":      p.full_name,
                "organization":        p.organization or "",
                "department": p.department or "",
                "order_num":      p.order_num,
                "qr_code":        p.qr_code,
                "event_name":     event.event_name,
                "event_date":     str(event.event_date),
                "event_location": getattr(event, 'location', ''),
                "cert_number":    f"CERT-{event_id}-{p.id:04d}",
            }
            try:
                pdf_bytes = render_design_to_pdf(design, participant_data, 'certificate')
            except Exception as e:
                print(f"Certificate generation failed for {p.id}: {e}")
                continue
            background_tasks.add_task(send_certificate_email, p.email, p.full_name, pdf_bytes)
            
    return {"message": f"Started sending certificates to {len(attendees)} attendees."}

@router.get("/download/{participant_id}")
def download_certificate(participant_id: int, db: Session = Depends(get_db)):
    p = db.query(Participant).get(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    event = db.query(Event).get(p.event_id)

    # FIX 8: استخدام pdf_renderer
    from app.utils.pdf_renderer import render_design_to_pdf
    from app.models.template import BadgeTemplate
    from app.routers.credentials import DEFAULT_CERTIFICATE_DESIGN

    cert_template = db.query(BadgeTemplate).filter(
        BadgeTemplate.event_id == p.event_id,
        BadgeTemplate.type.in_(['certificate_attendance', 'certificate'])
    ).first()

    design = json.loads(cert_template.design_json) if cert_template else DEFAULT_CERTIFICATE_DESIGN
    
    participant_data = {
        "full_name":      p.full_name,
        "organization":        p.organization or "",
        "department": p.department or "",
        "order_num":      p.order_num,
        "qr_code":        p.qr_code,
        "event_name":     event.event_name if event else "",
        "event_date":     str(event.event_date) if event else "",
        "event_location": getattr(event, 'location', ''),
        "cert_number":    f"CERT-{p.event_id}-{p.id:04d}",
    }
    
    pdf_bytes = render_design_to_pdf(design, participant_data, 'certificate')
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Certificate_{p.id}.pdf"}
    )
