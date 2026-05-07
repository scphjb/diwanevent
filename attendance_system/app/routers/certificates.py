from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.participant import Participant
from app.models.event import Event
from app.utils.certificates import generate_certificate_pdf
from app.utils.email import send_email_sync

router = APIRouter()

async def send_certificate_email(email: str, participant_name: str, pdf_content: bytes):
    subject = "شهادة حضور - Diwan Event"
    body = f"مرحباً {participant_name}، تجد مرفقاً شهادة حضورك للفعالية. نتمنى لك التوفيق."
    send_email_sync(email, subject, body, pdf_content, "Certificate.pdf")

@router.post("/{event_id}/send-all")
async def send_all_certificates(event_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    event = db.query(Event).get(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Only attendees (payment_status='paid' as a proxy for attendance in our current logic)
    attendees = db.query(Participant).filter(Participant.event_id == event_id, Participant.payment_status == 'paid').all()
    
    for p in attendees:
        if p.email:
            pdf = generate_certificate_pdf(p.full_name, event.event_name, str(event.event_date))
            background_tasks.add_task(send_certificate_email, p.email, p.full_name, pdf.getvalue())
            
    return {"message": f"Started sending certificates to {len(attendees)} attendees."}

@router.get("/download/{participant_id}")
def download_certificate(participant_id: int, db: Session = Depends(get_db)):
    p = db.query(Participant).get(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    event = db.query(Event).get(p.event_id)
    pdf = generate_certificate_pdf(p.full_name, event.event_name, str(event.event_date))
    
    return Response(
        content=pdf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Certificate_{p.id}.pdf"}
    )
