from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.template import BadgeTemplate
from app.models.event import Event
import json

router = APIRouter(prefix="/api/v1/templates", tags=["Templates"])

# ── CRUD القوالب ────────────────────────────────────────────────

@router.post("/")
def create_template(data: dict, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    """حفظ قالب بادج أو شهادة"""
    template = BadgeTemplate(
        name=data['name'],
        type=data['type'],           # 'badge' | 'certificate_attendance' | ...
        event_id=data.get('event_id'),
        created_by=current_user.id,
        design_json=data['design_json'],
        width_mm=data.get('width_mm', 148),
        height_mm=data.get('height_mm', 105),
        orientation=data.get('orientation', 'landscape'),
        is_default=data.get('is_default', False)
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@router.get("/")
def list_templates(event_id: int = None, type: str = None,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_active_user)):
    """قائمة القوالب المحفوظة"""
    query = db.query(BadgeTemplate).filter(BadgeTemplate.created_by == current_user.id)
    if event_id: query = query.filter(BadgeTemplate.event_id == event_id)
    if type: query = query.filter(BadgeTemplate.type == type)
    return query.all()

@router.put("/{template_id}")
def update_template(template_id: int, data: dict,
                    db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    template = db.query(BadgeTemplate).filter(
        BadgeTemplate.id == template_id,
        BadgeTemplate.created_by == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="القالب غير موجود")
        
    template.design_json = data['design_json']
    template.name = data.get('name', template.name)
    template.type = data.get('type', template.type)
    template.width_mm = data.get('width_mm', template.width_mm)
    template.height_mm = data.get('height_mm', template.height_mm)
    template.orientation = data.get('orientation', template.orientation)
    db.commit()
    db.refresh(template)
    return template

@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    template = db.query(BadgeTemplate).filter(
        BadgeTemplate.id == template_id,
        BadgeTemplate.created_by == current_user.id
    ).first()
    if not template: raise HTTPException(status_code=404, detail="القالب غير موجود")
    db.delete(template)
    db.commit()
    return {"status": "deleted"}

# ── معاينة PDF (مشارك واحد نموذجي) ─────────────────────────────

@router.post("/preview-pdf")
def preview_template_pdf(data: dict, db: Session = Depends(get_db),
                                current_user: User = Depends(get_current_active_user)):
    """
    يولّد PDF معاينة بمشارك نموذجي.
    المدخلات:
      design_json: str (JSON للقالب)
      type: 'badge' | 'certificate_attendance' | ...
      sample_participant: dict (بيانات نموذجية)
    """
    from app.utils.pdf_renderer import render_design_to_pdf
    from fastapi.responses import Response
    
    design = json.loads(data['design_json'])
    participant = data.get('sample_participant', {
        'full_name': 'أحمد بن محمد المثال',
        'organization': 'محكمة عنابة الابتدائية',
        'department': 'قسم التنفيذ',
        'role': 'محضر قضائي',
        'order_num': 'DWN-PREVIEW',
        'seat_info': 'قاعة A - مقعد 15',
        'event_name': 'الجمعية العامة 2026',
        'event_date': '23 أبريل 2026',
        'event_location': 'فندق شيراتون عنابة',
        'event_logo': 'https://diwan-event.com/logo.png' # شعار افتراضي للمعاينة
    })
    
    pdf_bytes = render_design_to_pdf(design, participant, data.get('type', 'badge'))
    
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': 'inline; filename=preview.pdf'}
    )

# ── طباعة جماعية ─────────────────────────────────────────────────

@router.post("/{template_id}/print")
def print_badges(template_id: int, event_id: int, participant_id: int = None,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_active_user)):
    """
    يولّد PDF يحتوي على بادجات/شهادات. 
    يمكن استخدامه للكل أو لمشارك واحد عبر participant_id.
    """
    from app.models.participant import Participant
    from app.utils.pdf_renderer import render_batch_pdf
    from fastapi.responses import Response
    
    template = db.query(BadgeTemplate).filter(BadgeTemplate.id == template_id).first()
    if not template: raise HTTPException(status_code=404, detail="القالب غير موجود")
    
    query = db.query(Participant).filter(Participant.event_id == event_id)
    if participant_id:
        query = query.filter(Participant.id == participant_id)
    
    participants = query.all()
    
    if not participants:
        raise HTTPException(status_code=404, detail="لا يوجد مشاركون مسجلون في هذه الفعالية للطباعة")
    
    event = db.query(Event).filter(Event.id == event_id).first()
    event_info = {
        'event_logo': event.logo_url if event else None,
        'event_name': event.event_name if event else '',
        'event_date': str(event.event_date) if event and event.event_date else '',
        'event_location': event.location if event else ''
    }
    
    # --- DIAGNOSTIC LOG ---
    import os as _os
    _log_path = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))), "pdf_debug.log")
    with open(_log_path, "a", encoding="utf-8") as _f:
        _f.write(f"\n=== PRINT REQUEST ===\n")
        _f.write(f"template_id={template_id}, event_id={event_id}, participant_id={participant_id}\n")
        _f.write(f"event found: {event is not None}\n")
        _f.write(f"event_logo: {event_info['event_logo']}\n")
        _f.write(f"participants count: {len(participants)}\n")
        design_obj = json.loads(template.design_json)
        elements = design_obj.get('elements', [])
        _f.write(f"template elements count: {len(elements)}\n")
        for _el in elements:
            _f.write(f"  - id={_el.get('id')}, type={_el.get('type')}, src={_el.get('src')}\n")
    # --- END DIAGNOSTIC ---
    
    design = json.loads(template.design_json)
    
    # تحويل المشاركين إلى قواميس وإضافة بيانات الفعالية لكل منهم بشكل آمن
    participant_data = []
    for p in participants:
        p_dict = {
            "id": p.id,
            "full_name": p.full_name,
            "organization": p.organization,
            "department": p.department,
            "role": p.role,
            "order_num": p.order_num,
            "qr_code": p.qr_code,
            "seat_info": p.seat_info,
            "cert_number": f"CERT-{p.event_id}-{p.id:04d}"
        }
        p_dict.update(event_info)
        participant_data.append(p_dict)

    pdf_bytes = render_batch_pdf(design, participant_data, template.type)
    
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=documents_{event_id}.pdf'}
    )
