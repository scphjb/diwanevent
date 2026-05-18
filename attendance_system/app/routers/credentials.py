from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.template import BadgeTemplate
from app.models.participant import Participant
from app.models.event import Event
from app.utils.pdf_renderer import render_design_to_pdf
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from sqlalchemy import select
import json

DEFAULT_CERTIFICATE_DESIGN = {
    "background": {"color": "#FFFFFF"},
    "elements": [
      {"id": "frame", "type": "frame", "color": "#D4AF37", "x": 0, "y": 0, "width": 1060, "height": 750, "zIndex": 1},
      {"id": "top_bar", "type": "shape", "color": "#022C22", "x": 30, "y": 30, "width": 1000, "height": 80, "zIndex": 2},
      {"id": "cert_title", "type": "static_text", "value": "شـهـادة حـضـور", "x": 30, "y": 38, "width": 1000, "height": 60, "zIndex": 3, "style": {"color": "#D4AF37", "fontSize": "36px", "fontWeight": "900", "textAlign": "center"}},
      {"id": "basmala", "type": "static_text", "value": "بسم الله الرحمن الرحيم", "x": 30, "y": 130, "width": 1000, "height": 30, "zIndex": 2, "style": {"color": "#7B5B00", "fontSize": "18px", "textAlign": "center"}},
      {"id": "cert_body", "type": "multiline_text", "value": "يُشهد بأن السيد/ة", "x": 30, "y": 180, "width": 1000, "height": 40, "zIndex": 2, "style": {"color": "#333333", "fontSize": "22px", "textAlign": "center"}},
      {"id": "full_name", "type": "dynamic_text", "placeholder": "اسم المشارك الكامل", "x": 30, "y": 230, "width": 1000, "height": 70, "zIndex": 3, "style": {"color": "#022C22", "fontSize": "42px", "fontWeight": "900", "textAlign": "center"}},
      {"id": "cert_body_2", "type": "multiline_text", "value": "قد حضر فعالية", "x": 30, "y": 310, "width": 1000, "height": 36, "zIndex": 2, "style": {"color": "#333333", "fontSize": "22px", "textAlign": "center"}},
      {"id": "event_name", "type": "dynamic_text", "placeholder": "[اسم الفعالية]", "x": 30, "y": 360, "width": 1000, "height": 50, "zIndex": 3, "style": {"color": "#022C22", "fontSize": "28px", "fontWeight": "bold", "textAlign": "center"}},
      {"id": "event_date_loc", "type": "dynamic_text", "placeholder": "[التاريخ والمكان]", "x": 30, "y": 430, "width": 1000, "height": 30, "zIndex": 2, "style": {"color": "#555555", "fontSize": "18px", "textAlign": "center"}},
      {"id": "bottom_bar", "type": "shape", "color": "#D4AF37", "x": 230, "y": 530, "width": 600, "height": 2, "zIndex": 2},
      {"id": "qr_verify", "type": "qr", "x": 480, "y": 570, "width": 100, "height": 100, "zIndex": 3},
      {"id": "cert_number", "type": "dynamic_text", "placeholder": "CERT-2026-0001", "x": 30, "y": 710, "width": 300, "height": 20, "zIndex": 2, "style": {"color": "#AAAAAA", "fontSize": "12px", "textAlign": "left"}},
    ]
}

router = APIRouter()

# ──────────────────────── helpers ────────────────────────────────────

def _participant_to_dict(p: Participant) -> dict:
    """تحويل كائن SQLAlchemy Participant إلى dict يفهمه render_design_to_pdf"""
    data = {
        "id": p.id,
        "full_name": p.full_name or "",
        "organization": p.organization or "",
        "department": p.department or "",
        "role": p.role or "",
        "order_num": p.order_num or "",
        "qr_code": p.qr_code or "",
        "payment_status": p.payment_status or "",
        "seat_info": p.seat_info or "",
        "id_number": p.id_number or "",
        "phone_number": p.phone_number or "",
        "email": p.email or "",
        "cert_number": f"CERT-{p.event_id}-{p.id:04d}",
    }
    
    # دمج القيم المخصصة (Enterprise Custom Fields)
    if p.custom_values:
        data.update(p.custom_values)
        
    return data

def _event_to_dict(e) -> dict:
    """تحويل كائن SQLAlchemy Event إلى dict"""
    if e is None:
        return {}
    return {
        "id": e.id,
        "event_name": getattr(e, "event_name", "") or "",
        "location": getattr(e, "location", "") or "",
        "event_date": str(getattr(e, "event_date", "")) if getattr(e, "event_date", None) else "",
        "event_location": getattr(e, "location", "") or "",
    }

def _template_to_dict(t: BadgeTemplate) -> dict:
    """تحويل كائن SQLAlchemy BadgeTemplate إلى dict"""
    if t is None:
        return {}
    return {
        "id": t.id,
        "name": t.name,
        "type": t.type,
        "width_mm": t.width_mm,
        "height_mm": t.height_mm,
        "orientation": t.orientation,
        "design_json": t.design_json,
    }

# ──────────────────────── Badge Print ────────────────────────────────

@router.get("/badges/print/{participant_id}")
async def print_badge(participant_id: int, db: AsyncSession = Depends(get_db)):
    """طباعة بادج مشارك واحد — مفتوح (لا يحتاج توكن)"""
    p = await db.get(Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    event = await db.get(Event, p.event_id)
    
    stmt = select(BadgeTemplate).filter(BadgeTemplate.event_id == p.event_id, BadgeTemplate.type == 'badge')
    res = await db.execute(stmt)
    template = res.scalars().first()
    
    if not template:
        raise HTTPException(status_code=404, detail="قالب البادج غير موجود للفعالية")

    try:
        design = json.loads(template.design_json)
        participant_data = _participant_to_dict(p)
        participant_data.update(_event_to_dict(event)) # دمج معلومات الفعالية
        
        pdf_bytes = render_design_to_pdf(
            design=design,
            participant=participant_data,
            doc_type='badge'
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"فشل توليد الباج: {str(exc)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=badge_{participant_id}.pdf"}
    )

@router.get("/badges/secure-download/{token}")
async def download_badge_by_token(token: str, db: AsyncSession = Depends(get_db)):
    """تحميل بادج مشارك عبر الرمز الفريد (أكثر أماناً)"""
    stmt = select(Participant).filter(
        (Participant.order_num == token) | (Participant.qr_code == token)
    )
    res = await db.execute(stmt)
    p = res.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="الرمز غير صالح")

    event = await db.get(Event, p.event_id)
    
    stmt_tmpl = select(BadgeTemplate).filter(BadgeTemplate.event_id == p.event_id, BadgeTemplate.type == 'badge')
    res_tmpl = await db.execute(stmt_tmpl)
    template = res_tmpl.scalars().first()
    
    if not template:
        raise HTTPException(status_code=404, detail="قالب البادج غير موجود للفعالية")

    try:
        design = json.loads(template.design_json)
        participant_data = _participant_to_dict(p)
        participant_data.update(_event_to_dict(event))
        
        pdf_bytes = render_design_to_pdf(
            design=design,
            participant=participant_data,
            doc_type='badge'
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="فشل توليد الباج")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=badge_{token}.pdf"}
    )


# ──────────────────────── Certificate Download ───────────────────────

@router.get("/certificates/download/{participant_id}")
async def download_certificate_by_id(
    participant_id: int,
    db: AsyncSession = Depends(get_db)
):
    """تحميل شهادة مشارك — مفتوح (Dashboard)"""
    p = await db.get(Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    event = await db.get(Event, p.event_id)
    
    stmt = select(BadgeTemplate).filter(BadgeTemplate.event_id == p.event_id, BadgeTemplate.type.like('certificate%'))
    res = await db.execute(stmt)
    template = res.scalars().first()
    
    design = json.loads(template.design_json) if template else DEFAULT_CERTIFICATE_DESIGN

    try:
        participant_data = _participant_to_dict(p)
        participant_data.update(_event_to_dict(event))
        
        pdf_bytes = render_design_to_pdf(
            design=design,
            participant=participant_data,
            doc_type='certificate'
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"فشل توليد الشهادة: {str(exc)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate_{participant_id}.pdf"}
    )

@router.get("/certificates/secure-download/{token}")
async def download_certificate_by_token(token: str, db: AsyncSession = Depends(get_db)):
    """تحميل شهادة مشارك عبر الرمز الفريد (آمن)"""
    stmt = select(Participant).filter(
        (Participant.order_num == token) | (Participant.qr_code == token)
    )
    res = await db.execute(stmt)
    p = res.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="الرمز غير صالح")

    event = await db.get(Event, p.event_id)
    
    stmt_tmpl = select(BadgeTemplate).filter(BadgeTemplate.event_id == p.event_id, BadgeTemplate.type.like('certificate%'))
    res_tmpl = await db.execute(stmt_tmpl)
    template = res_tmpl.scalars().first()
    
    design = json.loads(template.design_json) if template else DEFAULT_CERTIFICATE_DESIGN

    try:
        participant_data = _participant_to_dict(p)
        participant_data.update(_event_to_dict(event))
        
        pdf_bytes = render_design_to_pdf(
            design=design,
            participant=participant_data,
            doc_type='certificate'
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="فشل توليد الشهادة")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate_{token}.pdf"}
    )


# ──────────────────────── Certificate via QR (Self-Service) ──────────

@router.get("/{event_id}/participant/{qr_code}/certificate")
async def download_certificate_by_qr(
    event_id: int,
    qr_code: str,
    db: AsyncSession = Depends(get_db)
):
    """تحميل شهادة الحضور — متاح للمشارك عبر رمز QR بدون تسجيل دخول"""
    from app.models.participant import Attendance

    stmt = select(Participant).filter(
        Participant.qr_code == qr_code,
        Participant.event_id == event_id
    )
    res = await db.execute(stmt)
    participant = res.scalars().first()
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    # تحقق من الحضور الفعلي
    stmt_att = select(Attendance).filter(
        Attendance.participant_id == participant.id,
        Attendance.event_type == "check_in"
    )
    res_att = await db.execute(stmt_att)
    attendance = res_att.scalars().first()
    if not attendance:
        raise HTTPException(status_code=403, detail="الشهادة تُمنح فقط للحاضرين المسجلين")

    event = await db.get(Event, event_id)
    
    stmt_tmpl = select(BadgeTemplate).filter(BadgeTemplate.event_id == event_id, BadgeTemplate.type.like('certificate%'))
    res_tmpl = await db.execute(stmt_tmpl)
    template = res_tmpl.scalars().first()
    
    design = json.loads(template.design_json) if template else DEFAULT_CERTIFICATE_DESIGN

    try:
        participant_data = _participant_to_dict(participant)
        participant_data.update(_event_to_dict(event))
        
        pdf_bytes = render_design_to_pdf(
            design=design,
            participant=participant_data,
            doc_type='certificate'
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"فشل توليد الشهادة: {str(exc)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate_{qr_code}.pdf"}
    )
