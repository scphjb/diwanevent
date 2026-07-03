from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import pandas as pd
import io
import os
import logging
from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.participant import ParticipantOut
from app.core.websockets import manager
from app.utils.badge import generate_badge_pdf
from app.routers.participant_auth import send_unified_welcome_email, OTP_EXPIRE_MINUTES
from app.core.auth_deps import get_current_active_user
from app.routers.notifications import get_current_user_or_participant
from app.models.user import User
from app.services.data_sanitizer import DataSanitizer
from app.services.webhook_engine import WebhookEngine
from app.core.rbac import require_permission
from app.routers.participant_auth import get_current_participant
from sqlalchemy import select, update, delete, func
import uuid

logger = logging.getLogger("diwan.participants")

def _participant_to_dict(p):
    return {
        "id": p.id,
        "full_name": p.full_name,
        "email": p.email,
        "phone_number": p.phone_number,
        "order_num": p.order_num,
        "qr_code": p.qr_code,
        "organization": p.organization,
        "department": p.department,
        "payment_status": p.payment_status,
        "seat_info": p.seat_info,
        "seat_number": p.seat_number
    }

def _get_frontend_url():
    from app.core.config import settings
    frontend_url = settings.FRONTEND_URL
    if "localhost" in frontend_url and "localhost" not in settings.APP_DOMAIN:
        return settings.APP_DOMAIN
    return frontend_url

router = APIRouter()

from pydantic import BaseModel

@router.get("/search")
async def public_search(
    q: str = Query(...),
    event_id: int = Query(1),
    db: AsyncSession = Depends(get_db),
):
    """
    البحث العام للمشاركين (يستخدم في الخدمة الذاتية والكيوسك).
    محمي: يتطلب 3 أحرف على الأقل — يُرجع بيانات آمنة فقط.
    """
    if not q or len(q.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="يجب إدخال 3 أحرف على الأقل للبحث",
        )

    # التحقق من أن الفعالية تسمح بالبحث العام
    from app.models.event import Event
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    stmt = select(Participant).filter(
        Participant.event_id == event_id,
        Participant.full_name.ilike(f"%{q.strip()}%"),
    ).limit(10)
    result = await db.execute(stmt)
    results = result.scalars().all()

    # إرجاع بيانات آمنة فقط (بدون بريد أو هاتف)
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "organization": p.organization,
            "department": p.department,
            "order_num": p.order_num,
            "payment_status": p.payment_status,
        }
        for p in results
    ]

@router.get("/public/access/{token}")
async def get_participant_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    الدخول الآمن للبوابة باستخدام رمز QR الدائم (DWN-XXXXXXXX) أو JWT.
    الرابط يبقى صالحاً حتى يُغلق المنظم الفعالية (status = completed).
    """
    from app.core.security import decode_token
    from sqlalchemy.orm import selectinload
    from app.models.event import Event

    participant = None
    if token.startswith("DWN-") or token.startswith("REG-"):
        # البحث بواسطة رمز QR الدائم (order_num / qr_code)
        stmt = select(Participant).filter(
            (Participant.order_num == token) | (Participant.qr_code == token)
        ).options(selectinload(Participant.profile))
        result = await db.execute(stmt)
        participant = result.scalars().first()
    else:
        # احتياطي: JWT قديم (مدة انتقالية)
        payload = decode_token(token)
        if payload and payload.get("sub", "").startswith("participant:"):
            try:
                p_id = int(payload.get("sub").split(":")[1])
                stmt = select(Participant).filter(Participant.id == p_id).options(selectinload(Participant.profile))
                result = await db.execute(stmt)
                participant = result.scalars().first()
            except: pass

    if not participant:
        raise HTTPException(status_code=404, detail="الرمز غير صالح")

    # ── فحص حالة الفعالية — البوابة تُغلق عند إنهاء الفعالية ────────────
    event = await db.get(Event, participant.event_id)
    if event and event.status == "completed":
        raise HTTPException(
            status_code=410,
            detail="event_ended"
        )
    
    avatar_url = participant.profile.avatar_url if participant.profile else None
    if not avatar_url and participant.custom_values:
        avatar_url = participant.custom_values.get("avatar_url")
        
    import hashlib
    salt = "diwan_secure_card_salt"
    raw_hash = f"{participant.id}:{participant.qr_code}:{salt}"
    card_hash = hashlib.sha256(raw_hash.encode("utf-8")).hexdigest()[:16]
    public_card_token = f"{participant.id}-{card_hash}"

    return {
        "id": participant.id,
        "full_name": participant.full_name,
        "organization": participant.organization,
        "order_num": participant.order_num,
        "qr_code": participant.qr_code,
        "seat_info": participant.seat_info,
        "seat_number": participant.seat_number,
        "event_id": participant.event_id,
        "avatar_url": avatar_url,
        "custom_values": participant.custom_values or {},
        "role": participant.role or "",
        "phone": participant.phone_number or "",
        "email": participant.email or "",
        "public_card_token": public_card_token
    }

@router.get("/public/card/{token}")
async def get_public_card_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """جلب بيانات بطاقة الأعمال العامة للمشارك باستخدام رمز أمني مشفر لمنع تخمين المعرفات"""
    try:
        parts = token.split("-")
        if len(parts) != 2:
            raise HTTPException(status_code=404, detail="الرمز غير صالح")
        p_id = int(parts[0])
        hash_val = parts[1]
    except Exception:
        raise HTTPException(status_code=404, detail="الرمز غير صالح")
        
    participant = await db.get(Participant, p_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
        
    # التحقق من صحة التوقيع الأمني
    import hashlib
    salt = "diwan_secure_card_salt"
    raw_hash = f"{participant.id}:{participant.qr_code}:{salt}"
    expected_hash = hashlib.sha256(raw_hash.encode("utf-8")).hexdigest()[:16]
    
    if hash_val != expected_hash:
        raise HTTPException(status_code=404, detail="الرمز غير صالح")
        
    avatar_url = participant.profile.avatar_url if participant.profile else None
    if not avatar_url and participant.custom_values:
        avatar_url = participant.custom_values.get("avatar_url")
        
    return {
        "id": participant.id,
        "full_name": participant.full_name,
        "organization": participant.organization,
        "department": participant.department,
        "order_num": participant.order_num,
        "qr_code": participant.qr_code,
        "seat_info": participant.seat_info,
        "seat_number": participant.seat_number,
        "event_id": participant.event_id,
        "avatar_url": avatar_url,
        "custom_values": participant.custom_values or {},
        "role": participant.role or "",
        "phone": participant.phone_number or "",
        "email": participant.email or "",
        "public_card_token": token
    }

class PublicRegistrationRequest(BaseModel):
    event_id: int
    full_name: str
    email: str
    organization: str
    phone_number: str
    department: Optional[str] = None
    role: Optional[str] = None
    custom_values: Optional[dict] = None
    verification_code: Optional[str] = None
    payment_method: Optional[str] = 'online'

@router.get("/public/info/{participant_id}")
async def get_public_participant_info(
    participant_id: int,
    db: AsyncSession = Depends(get_db)
):
    """جلب بيانات المشارك العامة (بدون مصادقة) — يُستخدم في بوابة المشارك."""
    from sqlalchemy.orm import selectinload
    stmt = select(Participant).filter(Participant.id == participant_id).options(selectinload(Participant.profile))
    result = await db.execute(stmt)
    participant = result.scalars().first()
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    avatar_url = participant.profile.avatar_url if participant.profile else None
    if not avatar_url and participant.custom_values:
        avatar_url = participant.custom_values.get("avatar_url")
        
    return {
        "id": participant.id,
        "full_name": participant.full_name,
        "organization": participant.organization,
        "department": participant.department,
        "order_num": participant.order_num,
        "qr_code": participant.qr_code,
        "payment_status": participant.payment_status,
        "seat_info": participant.seat_info,
        "seat_number": participant.seat_number,
        "avatar_url": avatar_url,
        "custom_values": participant.custom_values or {},
    }

@router.patch("/public/visibility/{token}")
async def toggle_public_visibility(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """تفعيل/تعطيل ظهور المشارك في صفحة التواصل الميداني"""
    from app.core.security import decode_token
    from sqlalchemy.orm.attributes import flag_modified
    
    participant = None
    if token.startswith("DWN-") or token.startswith("REG-"):
        # البحث بواسطة رقم الطلب مباشرة (رابط عام)
        stmt = select(Participant).filter(Participant.order_num == token)
        result = await db.execute(stmt)
        participant = result.scalars().first()
    else:
        # البحث بواسطة JWT Token (جلسة مسجلة)
        payload = decode_token(token)
        if payload and payload.get("sub", "").startswith("participant:"):
            try:
                p_id = int(payload.get("sub").split(":")[1])
                participant = await db.get(Participant, p_id)
            except: pass

    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود أو الجلسة غير صالحة")
    
    cv = participant.custom_values or {}
    current_visibility = cv.get("is_visible", False)
    new_visibility = not current_visibility
    cv["is_visible"] = new_visibility
    
    participant.custom_values = cv
    flag_modified(participant, "custom_values")
    await db.commit()
    
    return {"status": "success", "is_visible": new_visibility}
    
@router.patch("/public/profile")
async def update_participant_profile(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_p: Participant = Depends(get_current_participant)
):
    """تحديث البيانات المهنية للمشارك (Bio, Social, Specialties)"""
    cv = current_p.custom_values or {}
    
    # تحديث الحقول المسموح بها فقط
    allowed_fields = ["bio", "linkedin", "specialties", "website"]
    for field in allowed_fields:
        if field in data:
            cv[field] = data[field]
            
    current_p.custom_values = cv
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(current_p, "custom_values")
    
    # تحديث رقم الهاتف والبريد الإلكتروني الأساسي
    if "phone_number" in data:
        current_p.phone_number = data["phone_number"]
    if "email" in data:
        current_p.email = data["email"]
        
    await db.commit()
    
    return {"status": "success", "updated_fields": list(data.keys())}

@router.get("/public/{event_id}/directory")
async def get_public_directory(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """جلب قائمة المشاركين المرئيين فقط (للتعارف والتواصل)"""
    stmt = select(Participant).filter(Participant.event_id == event_id)
    result = await db.execute(stmt)
    participants = result.scalars().all()
    
    visible_participants = []
    for p in participants:
        cv = p.custom_values or {}
        if cv.get("is_visible") is True:
            visible_participants.append({
                "id": p.id,
                "full_name": p.full_name,
                "organization": p.organization,
                "department": p.department,
                "role": p.role,
                "qr_code": p.qr_code
            })
            
    return {"items": visible_participants}

from pydantic import BaseModel, EmailStr

class EmailVerificationRequest(BaseModel):
    email: EmailStr
    event_id: int

async def send_registration_verification_email(email: str, event_name: str, otp_code: str) -> bool:
    try:
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
        from app.core.config import settings

        if not settings.SMTP_PASSWORD or not settings.EMAILS_FROM_EMAIL:
            return False

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USERNAME or settings.EMAILS_FROM_EMAIL,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_SERVER,
            MAIL_FROM_NAME=settings.EMAILS_FROM_NAME or "Diwan Event",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )

        html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
    body {{
      font-family: 'Cairo', sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
    }}
  </style>
</head>
<body>
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border:1px solid #E2E8F0;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.03);">
    <div style="background:linear-gradient(135deg, #050B18 0%, #0D1527 100%);padding:40px 30px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;">ديوان إيفنت — تحقق من البريد الإلكتروني</h1>
      <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:14px;font-weight:700;">{event_name}</p>
    </div>
    
    <div style="padding:40px 30px;">
      <p style="color:#334155;font-size:15px;line-height:1.8;margin:0 0 24px;font-weight:700;">
        مرحباً بك،
      </p>
      <p style="color:#475569;font-size:14px;line-height:1.8;margin:0 0 32px;">
        يرجى استخدام رمز التحقق المؤقت أدناه لإكمال عملية التسجيل في الفعالية. هذا الرمز صالح لمدة 10 دقائق فقط ولا يجب مشاركته مع أي شخص.
      </p>
      
      <div style="background:#F1F5F9;border:2px dashed #CBD5E1;border-radius:16px;padding:24px;text-align:center;margin-bottom:32px;">
        <span style="font-family:monospace;font-size:32px;font-weight:900;color:#050B18;letter-spacing:6px;display:block;">{otp_code}</span>
      </div>
      
      <p style="color:#94A3B8;font-size:12px;line-height:1.6;margin:0;text-align:center;">
        إذا لم تكن قد طلبت هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني.
      </p>
    </div>
    
    <div style="background:#F8FAFC;padding:24px 30px;border-top:1px solid #E2E8F0;text-align:center;">
      <p style="color:#94A3B8;font-size:11px;margin:0;font-weight:bold;">Diwan Event Manager &copy; 2026</p>
    </div>
  </div>
</body>
</html>
"""

        message = MessageSchema(
            subject=f"رمز التحقق من البريد الإلكتروني: {otp_code} — {event_name}",
            recipients=[email],
            body=html,
            subtype=MessageType.html
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"FAILED TO SEND OTP EMAIL: {e}")
        return False

@router.post("/public/send-verification-otp")
async def send_public_verification_otp(
    body: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    إرسال OTP للتحقق من البريد الإلكتروني قبل إكمال عملية التسجيل الذاتي
    """
    from app.models.event import Event
    from app.models.otp import RegistrationOTP
    from app.routers.participant_auth import generate_otp
    from datetime import datetime, timedelta
    
    event = await db.get(Event, body.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    if not event.registration_enabled:
        raise HTTPException(status_code=403, detail="التسجيل مغلق لهذه الفعالية")
        
    # تحقق من تكرار التسجيل بالبريد مسبقاً
    stmt = select(Participant).filter(
        Participant.event_id == body.event_id,
        Participant.email == body.email
    )
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        raise HTTPException(status_code=409, detail="البريد الإلكتروني مسجل مسبقاً في هذه الفعالية")
        
    # توليد OTP
    otp_code = generate_otp()
    
    # حفظ OTP
    new_otp = RegistrationOTP(
        email=body.email.lower().strip(),
        event_id=body.event_id,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(new_otp)
    await db.commit()
    
    # إرسال الإيميل
    success = await send_registration_verification_email(
        email=body.email.lower().strip(),
        event_name=event.event_name,
        otp_code=otp_code
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="فشل إرسال رمز التحقق. يرجى التأكد من صحة البريد أو تجربة محاولة أخرى.")
        
    async def send_transfer_instruction_email(
    email: str,
    participant_name: str,
    event_name: str,
    order_num: str,
    amount: float,
    currency: str,
    bank_name: str,
    bank_account_name: str,
    bank_account_number: str,
    bank_instructions: Optional[str] = None
) -> bool:
    """إرسال إيميل يحتوي على معلومات الحساب البنكي والتعليمات للمسجّلين بالحوالة"""
    try:
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
        from app.core.config import settings

        if not settings.SMTP_PASSWORD or not settings.EMAILS_FROM_EMAIL:
            return False

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USERNAME or settings.EMAILS_FROM_EMAIL,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_SERVER,
            MAIL_FROM_NAME=settings.EMAILS_FROM_NAME or "Diwan Event",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )

        instructions_html = f"""
        <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:16px; margin-top:16px; text-align:right;">
            <p style="color:#1E40AF; font-size:13px; font-weight:bold; margin:0 0 6px 0;">💡 تعليمات الدفع:</p>
            <p style="color:#1E3A8A; font-size:12.5px; margin:0; line-height:1.6;">{bank_instructions}</p>
        </div>
        """ if bank_instructions else ""

        html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
    body, table, td, a {{ font-family: 'Cairo', Arial, sans-serif !important; }}
    @media screen and (max-width: 600px) {{
      .email-container {{ width: 100% !important; border-radius: 0px !important; box-shadow: none !important; }}
      .header-pad {{ padding: 35px 20px !important; }}
      .body-pad {{ padding: 30px 20px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F6F9;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F6F9;padding:20px 0;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(5,11,24,0.04);border:1px solid rgba(5,11,24,0.02); max-width:600px; width:100%;">
          
          <!-- Header -->
          <tr>
            <td class="header-pad" style="background:linear-gradient(135deg,#050B18 0%,#0F1E36 100%);padding:40px;text-align:center;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#F0C040 0%,#D4AF37 100%);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px;box-shadow:0 8px 20px rgba(212,175,55,0.2);">
                <span style="color:#050B18;font-size:24px;font-weight:900;font-family:sans-serif;line-height:56px;text-align:center;display:block;width:100%;">🏦</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;line-height:1.4;">{event_name}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:11px;font-weight:bold;text-transform:uppercase;">طلب التسجيل بالحوالة البنكية</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="body-pad" style="padding:40px;text-align:right;direction:rtl;">
              <h2 style="color:#050B18;font-size:18px;font-weight:900;margin:0 0 10px;">مرحباً {participant_name} 👋</h2>
              <p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 25px;">
                تم استلام طلب تسجيلك بنجاح في الفعالية. يرجى إتمام عملية تحويل مبلغ الاشتراك للحساب البنكي التالي وتزويدنا بوصل التحويل لتفعيل حسابك بالكامل.
              </p>

              <!-- Bank Account Details Card -->
              <div style="background:#FFFDF5; border:1px solid #FCD34D; border-radius:20px; padding:24px; margin-bottom:25px;">
                <span style="display:block; color:#854D0E; font-size:11px; font-weight:900; margin-bottom:12px; text-align:right; text-transform:uppercase;">🏦 معلومات الحساب البنكي للتحويل</span>
                
                <div style="padding: 10px 0; border-bottom: 1px solid #FEF3C7; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                  <span style="color:#854D0E; font-size:12px; font-weight: bold; width:35%; text-align:right;">اسم البنك</span>
                  <span style="color:#050B18; font-size:13px; font-weight:700; width:65%; text-align:left;">{bank_name}</span>
                </div>
                
                <div style="padding: 10px 0; border-bottom: 1px solid #FEF3C7; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                  <span style="color:#854D0E; font-size:12px; font-weight: bold; width:35%; text-align:right;">صاحب الحساب</span>
                  <span style="color:#050B18; font-size:13px; font-weight:700; width:65%; text-align:left;">{bank_account_name}</span>
                </div>

                <div style="padding: 10px 0; border-bottom: 1px solid #FEF3C7; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                  <span style="color:#854D0E; font-size:12px; font-weight: bold; width:35%; text-align:right;">رقم الحساب (RIB)</span>
                  <span style="color:#050B18; font-size:13px; font-weight:900; font-family:monospace; width:65%; text-align:left; direction: ltr;">{bank_account_number}</span>
                </div>

                <div style="padding: 10px 0; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                  <span style="color:#854D0E; font-size:12px; font-weight: bold; width:35%; text-align:right;">المبلغ المطلوب</span>
                  <span style="color:#B45309; font-size:16px; font-weight:900; width:65%; text-align:left;">{amount} {currency}</span>
                </div>

                {instructions_html}
              </div>

              <!-- Registration details for transfer identification -->
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:18px; padding:20px; margin-bottom:20px; text-align:right;">
                <span style="display:block; color:#64748B; font-size:11px; font-weight:900; margin-bottom:8px; text-transform:uppercase;">🎫 المرجع الخاص بك (يرجى إرفاقه أو ذكره في عملية التحويل)</span>
                <p style="margin:0 0 5px 0; color:#D4AF37; font-size:20px; font-weight:900; font-family:monospace; direction:ltr; text-align:right;">{order_num}</p>
                <p style="margin:0; color:#64748B; font-size:12px;">استخدم هذا الرمز السريع أو رقم المشاركة لتسجيل الدخول إلى بوابتك ورفع صورة الوصل.</p>
              </div>

              <!-- CTA to upload receipt -->
              <div style="text-align:center; margin:30px 0;">
                <p style="margin:0 0 10px; color:#475569; font-size:12.5px;">بعد إتمام الحوالة، ارفع الوصل لتسريع عملية التفعيل:</p>
                <a href="{settings.FRONTEND_URL}/participant-login?order_num={order_num}&email={email}" target="_blank" style="background:linear-gradient(135deg,#050B18 0%,#0F1E36 100%); color:#ffffff; padding:14px 28px; border-radius:12px; text-decoration:none; font-weight:bold; font-size:13px; display:inline-block; box-shadow:0 8px 20px rgba(5,11,24,0.15);">
                  رفع إثبات الدفع (الوصل) ←
                </a>
              </div>

            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:25px;text-align:center;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:10.5px;font-weight:bold;">
              <p style="margin:0 0 5px;">© 2026 {event_name}. جميع الحقوق محفوظة.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        message = MessageSchema(
            subject=f"⚠️ تفاصيل الحوالة البنكية لإتمام اشتراكك في {event_name}",
            recipients=[email],
            body=html,
            subtype=MessageType.html,
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        return True
    except Exception as e:
        logger.error("Failed to send transfer instruction email: %s", e)
        return False

@router.post("/public/register")
async def public_register_participant(
    body: PublicRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    تسجيل مشارك جديد من قبل الجمهور (Self-Registration).
    يدعم دمج الحسابات (Claiming) إذا كان مسجلاً مسبقاً (Imported) ولا يملك بريداً.
    """
    event_id = body.event_id
    full_name = body.full_name.strip()
    email = body.email.strip().lower()
    organization = body.organization.strip()
    phone_number = body.phone_number.strip()
    department = body.department.strip() if body.department else None
    role = body.role
    custom_values = body.custom_values or {}

    # التحقق من صحة البريد الإلكتروني
    if '@' not in email or '.' not in email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني غير صالح")

    # التحقق وتطهير رقم الهاتف بالصيغة الدولية
    import re
    cleaned_phone = re.sub(r'[\s\-\(\)]', '', phone_number)
    if cleaned_phone.startswith('00'):
        cleaned_phone = '+' + cleaned_phone[2:]
    # إذا بدأ رقم الهاتف بـ 0 وكان متبوعاً بـ 5 أو 6 أو 7 أو 9 وطوله 10 أرقام (الجزائر)، نقوم بتحويله تلقائياً للصيغة الدولية
    if re.match(r'^0[5679]\d{8}$', cleaned_phone):
        cleaned_phone = '+213' + cleaned_phone[1:]
    # وإذا بدأ بـ 5 أو 6 أو 7 أو 9 وطوله 9 أرقام (بدون الصفر البدئي)، نقوم بإضافة رمز الجزائر أيضاً
    elif re.match(r'^[5679]\d{8}$', cleaned_phone):
        cleaned_phone = '+213' + cleaned_phone
        
    if not re.match(r'^\+[1-9]\d{6,14}$', cleaned_phone):
        raise HTTPException(
            status_code=400, 
            detail="رقم الهاتف يجب أن يكون بالصيغة الدولية ويبدأ برمز البلد (مثال: +966500000000)"
        )

    # تحقق من وجود الفعالية وفتح التسجيل
    from app.models.event import Event
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    if not event.registration_enabled:
        raise HTTPException(status_code=403, detail="التسجيل مغلق لهذه الفعالية")
    
    # التحقق من البريد الإلكتروني بـ OTP إذا كانت الميزة مفعلة في الإعدادات
    if event.verify_email_on_register:
        if not email:
            raise HTTPException(status_code=400, detail="البريد الإلكتروني مطلوب لتفعيل التحقق")
        if not body.verification_code:
            raise HTTPException(status_code=400, detail="رمز التحقق من البريد الإلكتروني مطلوب لإكمال التسجيل")
            
        from app.models.otp import RegistrationOTP
        from datetime import datetime
        
        # البحث عن رمز تحقق صالح وغير مستخدم
        otp_stmt = select(RegistrationOTP).filter(
            RegistrationOTP.email == email.lower().strip(),
            RegistrationOTP.event_id == event_id,
            RegistrationOTP.otp_code == body.verification_code.strip(),
            RegistrationOTP.is_used == False,
            RegistrationOTP.expires_at >= datetime.utcnow()
        )
        otp_res = await db.execute(otp_stmt)
        active_otp = otp_res.scalars().first()
        
        if not active_otp:
            raise HTTPException(status_code=400, detail="رمز التحقق من البريد غير صالح أو منتهي الصلاحية")
            
        # وضع علامة مستخدم
        active_otp.is_used = True
    
    # جلب المنظم للتحقق من الرصيد
    organizer = await db.get(User, event.created_by)
    has_credits = organizer and (organizer.credits > 0 or organizer.role == 'super_admin')
    
    # تحقق من تكرار البريد الإلكتروني
    stmt = select(Participant).filter(
        Participant.event_id == event_id,
        Participant.email == email
    )
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=409, detail="البريد الإلكتروني مسجل مسبقاً")

    # تحقق من تكرار رقم الهاتف
    stmt = select(Participant).filter(
        Participant.event_id == event_id,
        Participant.phone_number == cleaned_phone
    )
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=409, detail="رقم الهاتف مسجل مسبقاً")

    # محاولة المطابقة والدمج (Merge) لمشارك مستورد مسبقاً بدون بريد
    stmt = select(Participant).filter(
        Participant.event_id == event_id,
        Participant.full_name == full_name,
        (Participant.email.is_(None) | (Participant.email == ""))
    )
    res = await db.execute(stmt)
    existing_by_name = res.scalars().first()

    if existing_by_name:
        # وجدنا تسجيلاً مسبقاً بنفس الاسم ولا يملك إيميل -> نقوم بتحديثه بدل إنشاء نسخة جديدة
        existing_by_name.email = email
        existing_by_name.organization = organization
        existing_by_name.department = department
        if role:
            existing_by_name.role = role
        if custom_values:
            existing_by_name.phone_number = custom_values.get('phone_number', existing_by_name.phone_number)
            existing_by_name.custom_values = custom_values
        
        await db.commit()
        await db.refresh(existing_by_name)
        
        # إرسال البريد الموحد فقط إذا كان الرصيد متوفراً
        if existing_by_name.email and has_credits:
            # خصم الرصيد للمنظمين العاديين
            if organizer.role != 'super_admin':
                organizer.credits -= 1
            
            existing_by_name.payment_status = 'paid' # تفعيل تلقائي لوجود رصيد
            
            # توليد بيانات الدخول آلياً
            from app.routers.participant_auth import generate_otp
            otp_code = generate_otp()
            from app.models.otp import ParticipantOTP
            from datetime import datetime, timedelta
            await db.execute(
                delete(ParticipantOTP).filter(ParticipantOTP.participant_id == existing_by_name.id)
            )
            new_otp = ParticipantOTP(
                participant_id=existing_by_name.id,
                email=existing_by_name.email,
                otp_code=otp_code,
                expires_at=datetime.utcnow() + timedelta(minutes=60)
            )
            db.add(new_otp)
            await db.commit()

            frontend_url = _get_frontend_url()
            magic_link = f"{frontend_url}/p/{existing_by_name.event_id}/{existing_by_name.qr_code}?origin=email"

            background_tasks.add_task(
                send_unified_welcome_email,
                email=existing_by_name.email,
                participant_name=existing_by_name.full_name,
                event_name=event.event_name,
                order_num=existing_by_name.order_num,
                otp=otp_code,
                magic_link=magic_link,
                qr_code=existing_by_name.qr_code,
                event_date=str(event.event_date) if event.event_date else None,
                event_location=event.location,
                event_id=existing_by_name.event_id
            )
        
        await db.commit()
        return {"status": "success", "participant_id": existing_by_name.id, "order_num": existing_by_name.order_num, "merged": True, "active": has_credits}

    # تحقق من سعة التسجيل (فقط للجدد)
    if event.total_invited > 0:
        count_stmt = select(func.count()).select_from(Participant).filter(Participant.event_id == event_id)
        count_res = await db.execute(count_stmt)
        current_count = count_res.scalar_one()
        if current_count >= event.total_invited:
            raise HTTPException(status_code=403, detail="عذراً، تم الوصول للحد الأقصى للمسجلين في هذه الفعالية")

    # توليد رقم طلب فريد مباشرة بدون الاستعلام المتكرر (UUID4 يضمن عدم التكرار رياضياً)
    import uuid as _uuid
    order_num = f"DWN-{_uuid.uuid4().hex[:8].upper()}"
    qr_code = order_num
    
    initial_payment_status = 'pending'
    is_transfer = False
    
    if event.require_payment and event.ticket_price > 0:
        if body.payment_method == 'transfer' and event.allow_transfer_payment:
            initial_payment_status = 'transfer_pending'
            is_transfer = True

    participant = Participant(
        event_id=event_id,
        full_name=full_name,
        email=email,
        organization=organization,
        department=department,
        role=role,
        phone_number=cleaned_phone,
        order_num=order_num,
        qr_code=qr_code,
        payment_status=initial_payment_status,
        entry_type='self_registered',
        custom_values=custom_values
    )
    
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    # إذا كان دفعاً بالحوالة، نرسل له إيميل بالتعليمات فوراً
    if is_transfer and participant.email:
        background_tasks.add_task(
            send_transfer_instruction_email,
            email=participant.email,
            participant_name=participant.full_name,
            event_name=event.event_name,
            order_num=participant.order_num,
            amount=float(event.ticket_price),
            currency=event.currency or 'DZD',
            bank_name=event.bank_name or '',
            bank_account_name=event.bank_account_name or '',
            bank_account_number=event.bank_account_number or '',
            bank_instructions=event.bank_instructions
        )
    
    return {"status": "success", "participant_id": participant.id, "order_num": participant.order_num, "merged": False, "active": False}

@router.get("/")
async def read_participants(
    event_id: int,
    skip: int = 0,
    limit: int = 1000,
    query: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    identity = Depends(get_current_user_or_participant)
):
    """جلب المشاركين وإرجاعهم كقواميس لتفادي أخطاء الـ Serialization"""

    if identity["type"] == "user":
        current_user = identity["obj"]
        if current_user.role != "super_admin":
            from app.models.event import Event
            event = await db.get(Event, event_id)
            if not event or event.created_by != current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="هذه الفعالية لا تنتمي لحسابك"
                )
    elif identity["type"] == "participant":
        current_participant = identity["obj"]
        if current_participant.event_id != event_id:
            raise HTTPException(
                status_code=403,
                detail="ليس لديك صلاحية لعرض مشاركي هذه الفعالية"
            )
        # Check if the participant is a helper/organizer/committee member
        role_lower = (current_participant.role or "").lower()
        is_staff = any(x in role_lower for x in ("منظم", "رئيس", "عضو", "organizer", "helper", "driver", "companion", "staff", "president", "member"))
        if not is_staff:
            raise HTTPException(
                status_code=403,
                detail="المشاركون العاديون لا يمكنهم عرض كامل القائمة"
            )
    else:
        raise HTTPException(status_code=401, detail="Unauthorized")

    stmt = select(Participant).filter(Participant.event_id == event_id)
    if query:
        stmt = stmt.filter(
            (Participant.full_name.ilike(f"%{query}%")) | 
            (Participant.order_num.ilike(f"%{query}%"))
        )
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar_one()

    # Get paginated items
    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    participants = res.scalars().all()
    
    # جلب سجلات الحضور لكل المشاركين دفعة واحدة
    from app.models.participant import Attendance
    participant_ids = [p.id for p in participants]
    attendance_map = {}
    if participant_ids:
        att_stmt = select(Attendance).filter(
            Attendance.participant_id.in_(participant_ids),
            Attendance.event_type == 'check_in'
        )
        att_res = await db.execute(att_stmt)
        attendance_records = att_res.scalars().all()
        for a in attendance_records:
            attendance_map[a.participant_id] = a.check_in_time
    
    return {
        "total": total_count,
        "items": [
            {
                "id": p.id,
                "event_id": p.event_id,
                "full_name": p.full_name,
                "role": p.role,
                "organization": p.organization,
                "department": p.department,
                "order_num": p.order_num,
                "qr_code": p.qr_code,
                "payment_status": p.payment_status,
                "badge_printed": p.badge_printed,
                "is_flagged": p.is_flagged,
                "seat_info": p.seat_info,
                "seat_number": p.seat_number,
                "check_in_time": attendance_map.get(p.id)
            }
            for p in participants
        ]
    }

@router.get("/{participant_id}", response_model=ParticipantOut)
async def read_participant(
    participant_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
    return participant

@router.get("/qr/{qr_code}")
async def get_participant_by_qr(
    qr_code: str,
    event_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """البحث عن مشارك بواسطة رمز الـ QR مع التحقق من الصلاحية"""
    stmt = select(Participant).filter(Participant.qr_code == qr_code)
    if event_id:
        stmt = stmt.filter(Participant.event_id == event_id)
    
    res = await db.execute(stmt)
    participant = res.scalars().first()
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
    return participant

@router.post("/bulk-activate")
async def bulk_activate_participants(
    participant_ids: List[int],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تفعيل مجموعة من المشاركين دفعة واحدة وخصم الرصيد وإرسال الإيميلات."""
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية التفعيل")

    stmt = select(Participant).filter(Participant.id.in_(participant_ids))
    res = await db.execute(stmt)
    participants = res.scalars().all()
    activated_count = 0
    
    from app.models.event import Event
    from app.routers.participant_auth import generate_otp, send_unified_welcome_email
    from app.models.otp import ParticipantOTP
    from datetime import datetime, timedelta

    for p in participants:
        # التحقق من الرصيد لكل مشارك
        if current_user.role != 'super_admin' and current_user.credits <= 0:
            break # توقف إذا نفد الرصيد أثناء العملية
        
        if p.payment_status == 'paid':
            continue # تخطي المفعلين مسبقاً
            
        # الخصم والتفعيل
        if current_user.role != 'super_admin':
            current_user.credits -= 1
        
        p.payment_status = 'paid'
        activated_count += 1
        
        # إرسال البريد الموحد
        if p.email:
            otp_code = generate_otp()
            await db.execute(
                delete(ParticipantOTP).filter(ParticipantOTP.participant_id == p.id)
            )
            new_otp = ParticipantOTP(
                participant_id=p.id,
                email=p.email,
                otp_code=otp_code,
                expires_at=datetime.utcnow() + timedelta(minutes=60)
            )
            db.add(new_otp)
            
            frontend_url = _get_frontend_url()
            magic_link = f"{frontend_url}/p/{p.event_id}/{p.qr_code}?origin=email"

            event = await db.get(Event, p.event_id)
            
            background_tasks.add_task(
                send_unified_welcome_email,
                email=p.email,
                participant_name=p.full_name,
                event_name=event.event_name if event else "Diwan Event",
                order_num=p.order_num,
                otp=otp_code,
                magic_link=magic_link,
                qr_code=p.qr_code,
                event_date=str(event.event_date) if event and event.event_date else None,
                event_location=event.location if event else None,
                event_id=p.event_id
            )

    await db.commit()
    return {
        "status": "success", 
        "activated_count": activated_count, 
        "remaining_credits": current_user.credits if current_user.role != 'super_admin' else "unlimited"
    }

@router.patch("/{participant_id}", response_model=ParticipantOut)
async def update_participant(
    participant_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تحديث بيانات مشارك مع التحقق من الصلاحية والتكرار"""
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
    
    # التحقق من تكرار البريد الإلكتروني في نفس الفعالية لمشارك آخر
    new_email = data.get("email")
    if new_email and new_email != participant.email:
        stmt = select(Participant).filter(
            Participant.event_id == participant.event_id,
            Participant.email == new_email,
            Participant.id != participant_id
        )
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail="البريد الإلكتروني مسجل مسبقاً لمشارك آخر في هذه الفعالية"
            )
            
    # التحقق من عدم تعيين رئيس للجنة مرتين
    new_role = data.get("role")
    if new_role and "رئيس" in new_role:
        stmt = select(Participant).filter(
            Participant.event_id == participant.event_id,
            Participant.role == new_role,
            Participant.id != participant_id
        )
        res = await db.execute(stmt)
        existing_pres = res.scalars().first()
        if existing_pres:
            raise HTTPException(
                status_code=400,
                detail=f"تم تعيين رئيس لهذه اللجنة مسبقاً: {existing_pres.full_name}"
            )
    
    for key, value in data.items():
        if hasattr(participant, key):
            setattr(participant, key, value)
            
    await db.commit()
    await db.refresh(participant)
    return participant

@router.post("/{participant_id}/resend-email")
async def resend_participant_email(
    participant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """إعادة إرسال إيميل الترحيب والدخول الموحد للمشارك بعد تعديل بياناته"""
    if current_user.role not in ('super_admin', 'organizer'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")
        
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
        
    if not participant.email:
        raise HTTPException(status_code=400, detail="المشارك ليس لديه بريد إلكتروني مسجل")
        
    from app.routers.participant_auth import generate_otp, send_unified_welcome_email
    from app.models.otp import ParticipantOTP
    from datetime import datetime, timedelta
    
    # توليد OTP جديد وحفظه
    otp_code = generate_otp()
    new_otp = ParticipantOTP(
        participant_id=participant.id,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=15)
    )
    db.add(new_otp)
    
    frontend_url = _get_frontend_url()
    magic_link = f"{frontend_url}/p/{participant.event_id}/{participant.qr_code}?origin=email"
    
    # تحميل تفاصيل الفعالية
    from sqlalchemy import select
    from app.models.event import Event
    event_stmt = select(Event).filter(Event.id == participant.event_id)
    event_res = await db.execute(event_stmt)
    event = event_res.scalars().first()
    
    event_name = event.event_name if event else "الفعالية"
    
    # إرسال البريد الإلكتروني
    success = await send_unified_welcome_email(
        email=participant.email,
        participant_name=participant.full_name,
        event_name=event_name,
        order_num=participant.order_num,
        otp=otp_code,
        magic_link=magic_link,
        qr_code=participant.qr_code,
        event_id=participant.event_id
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="فشل إرسال البريد الإلكتروني. يرجى التحقق من إعدادات SMTP في النظام.")
        
    participant.email_status = 'sent'
    await db.commit()
    
    return {"status": "success", "message": "تم إعادة إرسال تذكرة الدخول بنجاح"}

async def _register_attendance_background(
    participant_id: int,
    event_id: int,
    location_id: Optional[str],
    participant_name: str,
    updated_at_str: str
):
    """
    يُنفَّذ في background بعد إرسال الاستجابة للمستخدم.
    يسجّل الحضور، يحسب الإحصائيات، يبث تحديث WebSocket، ويطلق الـ Webhooks.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.participant import Attendance, Participant
    from app.core.websockets import manager
    from app.services.notification_service import NotificationService
    from app.services.webhook_engine import WebhookEngine
    from sqlalchemy import select, func
    from datetime import datetime
    import logging

    logger = logging.getLogger("diwan.checkin")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. تسجيل الحضور الفعلي
            attendance = Attendance(
                participant_id=participant_id,
                event_type='check_in',
                check_in_time=datetime.now(),
                entry_method='qr_scan',
                location_id=location_id
            )
            db.add(attendance)
            await db.commit()

            # 2. التحقق من الـ Milestones وإرسال تنبيهات للمسؤولين
            try:
                await NotificationService.check_attendance_milestones(db, event_id)
            except Exception as ne:
                logger.error(f"Milestone check failed: {ne}")

            # 3. حساب الإحصائيات للبث المباشر
            invited_stmt = select(func.count()).select_from(Participant).filter(Participant.event_id == event_id)
            invited_res = await db.execute(invited_stmt)
            total_invited = invited_res.scalar_one()

            from sqlalchemy import distinct
            checked_stmt = select(func.count(distinct(Attendance.participant_id))).join(
                Participant, Participant.id == Attendance.participant_id
            ).filter(
                Participant.event_id == event_id,
                Attendance.event_type == 'check_in'
            )
            checked_res = await db.execute(checked_stmt)
            total_checked_in = checked_res.scalar_one()

            attendance_rate = (total_checked_in / total_invited * 100) if total_invited > 0 else 0

            milestones = [25, 50, 75, 100]
            reached_milestone = next((m for m in milestones if abs(attendance_rate - m) < 0.5), None)

            # 4. Broadcast update via WebSocket
            await manager.broadcast_to_event(event_id, {
                "type": "check_in",
                "attendance_rate": round(attendance_rate, 2),
                "milestone": reached_milestone,
                "participant": {
                    "id": participant_id,
                    "full_name": participant_name,
                    "organization": "مشارك",
                    "order_num": ""
                }
            })

            # 5. Trigger Webhooks
            try:
                await WebhookEngine.trigger(
                    db,
                    event_id,
                    "participant.checkin",
                    {
                        "id": participant_id,
                        "full_name": participant_name,
                        "time": updated_at_str
                    }
                )
            except Exception as we:
                logger.error(f"Webhook trigger failed: {we}")

        except Exception as e:
            await db.rollback()
            logger.error(f"Background check-in failed: {e}")

@router.patch(
    "/{participant_id}/check-in", 
    response_model=ParticipantOut,
    responses={
        200: {"description": "تم تسجيل الدخول بنجاح وتحديث الإحصائيات"},
        404: {"description": "المشارك غير موجود في قاعدة البيانات"},
        401: {"description": "التوكن غير صالح أو منتهي الصلاحية"}
    }
)
async def check_in_participant(
    participant_id: int, 
    background_tasks: BackgroundTasks,
    location_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    تسجيل حضور مشارك عبر QR.
    الاستجابة الفورية للمسح: القراءة async سريعة وممتازة.
    الكتابة (Attendance + broadcast + milestones + webhooks): في background لا تحجب الاستجابة.
    """
    # التحقق من الصلاحية
    if current_user.role not in ('super_admin', 'organizer', 'scanner'):
        raise HTTPException(status_code=403, detail="لا صلاحية لك")

    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")
    
    # ✅ منع التحضير للمشاركين غير المفعلين (Pending)
    if participant.payment_status != 'paid':
        raise HTTPException(
            status_code=403, 
            detail="لا يمكن تسجيل دخول مشارك غير مفعل. يرجى تفعيل الحساب أو شحن الرصيد أولاً."
        )
    
    # تحقق سريع: هل سجّل حضوره مسبقاً؟
    from app.models.participant import Attendance
    stmt = select(Attendance.id).filter(
        Attendance.participant_id == participant_id,
        Attendance.event_type == 'check_in'
    )
    res = await db.execute(stmt)
    already_checked = res.scalars().first()
    
    if not already_checked:
        # ✅ الكتابة في background — لا تحجب الاستجابة
        background_tasks.add_task(
            _register_attendance_background,
            participant_id=participant_id,
            event_id=participant.event_id,
            location_id=location_id,
            participant_name=participant.full_name,
            updated_at_str=str(participant.updated_at)
        )
    
    return participant

@router.patch(
    "/{participant_id}/undo-check-in", 
    response_model=ParticipantOut
)
async def undo_check_in_participant(
    participant_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        participant = await db.get(Participant, participant_id)
        if not participant:
            raise HTTPException(status_code=404, detail="المشارك غير موجود")
        
        if current_user.role not in ('super_admin', 'organizer', 'scanner'):
            raise HTTPException(status_code=403, detail="لا صلاحية لك")
        
        # إزالة سجل الحضور الفعلي
        from app.models.participant import Attendance
        await db.execute(
            delete(Attendance).filter(
                Attendance.participant_id == participant.id,
                Attendance.event_type == 'check_in'
            )
        )
        
        await db.commit()
        await db.refresh(participant)
        
        return participant
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error undoing check in: {error_details}")
        raise HTTPException(status_code=500, detail="حدث خطأ أثناء التراجع عن تسجيل الحضور")

@router.post("/analyze-import")
async def analyze_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    import io
    import pandas as pd
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
        columns = [str(col).strip() for col in df.columns]
        return {"columns": columns}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فشل تحليل ملف الإكسيل: {str(e)}")

@router.post("/import")
async def import_participants(
    event_id: int,
    file: UploadFile = File(...),
    mapping: str = Form(...), # JSON string of mapping
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    import json
    import io
    try:
        field_mapping = json.loads(mapping)
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
        df = df.fillna('')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فشل معالجة الملف: {str(e)}")
        
    # ── 1. التحقق من وجود الفعالية وصلاحيتها دفعة واحدة ─────────────
    from app.models.event import Event
    event_obj = await db.get(Event, event_id)
    if not event_obj:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
        
    # جلب المنظم للتحقق من الرصيد والحدود المتاحة
    organizer = await db.get(User, event_obj.created_by) if event_obj else None
    has_credits = organizer and (organizer.credits > 0 or organizer.role == 'super_admin')
    
    # ── 2. جلب المشاركين الحاليين للتحقق من التكرار محلياً (منع N+1) ───
    existing_result = await db.execute(
        select(Participant.email, Participant.phone_number).filter(
            Participant.event_id == event_id
        )
    )
    existing_rows = existing_result.fetchall()
    existing_emails = {row.email.lower() for row in existing_rows if row.email}
    existing_phones = {row.phone_number for row in existing_rows if row.phone_number}
    
    participants_to_insert = []
    skipped = 0
    added = 0
    skipped_details = []
    
    # ── 3. تجميع السجلات وتطهيرها محلياً ────────────────────────────
    for idx, row in df.iterrows():
        row_num = idx + 2 # 1-based + header row
        
        # 1. الاسم واللقب
        raw_name = str(row.get(field_mapping.get('full_name'), '')).strip()
        if not raw_name or raw_name.lower() == 'nan':
            skipped += 1
            skipped_details.append(f"السطر {row_num}: الاسم واللقب مطلوب")
            continue
            
        # 2. الصفة المهنية / الجهة
        raw_org = str(row.get(field_mapping.get('organization'), '')).strip()
        if not raw_org or raw_org.lower() == 'nan':
            skipped += 1
            skipped_details.append(f"السطر {row_num} ({raw_name}): الصفة المهنية مطلوبة")
            continue
            
        # 3. الايميل
        raw_email = str(row.get(field_mapping.get('email'), '')).strip().lower()
        if not raw_email or raw_email.lower() == 'nan':
            skipped += 1
            skipped_details.append(f"السطر {row_num} ({raw_name}): البريد الإلكتروني مطلوب")
            continue
        if '@' not in raw_email or '.' not in raw_email:
            skipped += 1
            skipped_details.append(f"السطر {row_num} ({raw_name}): البريد الإلكتروني غير صالح")
            continue
            
        # 4. رقم الهاتف بالصيغة الدولية
        raw_phone = str(row.get(field_mapping.get('phone'), '')).strip()
        if not raw_phone or raw_phone.lower() == 'nan':
            skipped += 1
            skipped_details.append(f"السطر {row_num} ({raw_name}): رقم الهاتف مطلوب")
            continue
            
        # تطهير رقم الهاتف والتحقق من الصيغة الدولية
        import re
        cleaned_phone = re.sub(r'[\s\-\(\)]', '', raw_phone)
        if cleaned_phone.startswith('00'):
            cleaned_phone = '+' + cleaned_phone[2:]
        # إذا بدأ رقم الهاتف بـ 0 وكان متبوعاً بـ 5 أو 6 أو 7 أو 9 وطوله 10 أرقام (الجزائر)، نقوم بتحويله تلقائياً للصيغة الدولية
        if re.match(r'^0[5679]\d{8}$', cleaned_phone):
            cleaned_phone = '+213' + cleaned_phone[1:]
        # وإذا بدأ بـ 5 أو 6 أو 7 أو 9 وطوله 9 أرقام (بدون الصفر البدئي)، نقوم بإضافة رمز الجزائر أيضاً
        elif re.match(r'^[5679]\d{8}$', cleaned_phone):
            cleaned_phone = '+213' + cleaned_phone
            
        if not re.match(r'^\+[1-9]\d{6,14}$', cleaned_phone):
            skipped += 1
            skipped_details.append(f"السطر {row_num} ({raw_name}): رقم الهاتف يجب أن يكون بالصيغة الدولية ويبدأ بـ +")
            continue
            
        # كشف التكرار الفوري محلياً دون استعلامات
        if raw_email in existing_emails:
            skipped += 1
            skipped_details.append(f"السطر {row_num} ({raw_name}): البريد الإلكتروني مكرر")
            continue
        if cleaned_phone in existing_phones:
            skipped += 1
            skipped_details.append(f"السطر {row_num} ({raw_name}): رقم الهاتف مكرر")
            continue
            
        order_num = f"DWN-{uuid.uuid4().hex[:8].upper()}"
        payment_status = 'pending'
        
        # خصم الرصيد ديناميكياً
        if raw_email and has_credits:
            payment_status = 'paid'
            if organizer.role != 'super_admin':
                organizer.credits -= 1
                if organizer.credits <= 0:
                    organizer.credits = 0
                    has_credits = False # إيقاف الدفع التلقائي للأسطر اللاحقة
                    
        participants_to_insert.append({
            "event_id": event_id,
            "full_name": raw_name,
            "organization": raw_org,
            "department": str(row.get(field_mapping.get('department'), 'عام')).strip(),
            "role": str(row.get(field_mapping.get('role'), '')).strip() or None,
            "seat_number": str(row.get(field_mapping.get('seat_number'), '')).strip() or None,
            "email": raw_email,
            "phone_number": cleaned_phone,
            "payment_status": payment_status,
            "entry_type": "imported",
            "order_num": order_num,
            "qr_code": order_num
        })
        
        # تحديث قائمة الكشف الفوري لمنع تكرار الإكسل نفسه
        if raw_email:
            existing_emails.add(raw_email)
        if raw_phone:
            existing_phones.add(raw_phone)
            
    # ── 4. الإدراج المجمّع الفائق للبيانات (Bulk Insert with returning) ─
    if participants_to_insert:
        from sqlalchemy import insert
        stmt = insert(Participant).returning(
            Participant.id,
            Participant.email,
            Participant.full_name,
            Participant.order_num,
            Participant.qr_code,
            Participant.payment_status
        )
        result = await db.execute(stmt, participants_to_insert)
        inserted_rows = result.fetchall()
        added = len(inserted_rows)
        
        # ── 5. إنشاء رموز الـ OTP وتجميع حملة الإيميل ───────────────────
        from app.routers.participant_auth import generate_otp
        from app.models.otp import ParticipantOTP
        from datetime import datetime, timedelta
        
        otps_to_insert = []
        emails_to_notify = []
        
        for p_id, p_email, p_name, p_order, p_qr, p_pay in inserted_rows:
            if p_email and p_pay == 'paid':
                otp_code = generate_otp()
                otps_to_insert.append({
                    "participant_id": p_id,
                    "email": p_email,
                    "otp_code": otp_code,
                    "expires_at": datetime.utcnow() + timedelta(minutes=60)
                })
                
                frontend_url = _get_frontend_url()
                magic_link = f"{frontend_url}/p/{event_obj.id if event_obj else 0}/{p_qr}?origin=email"
                
                emails_to_notify.append({
                    "email": p_email,
                    "participant_name": p_name,
                    "event_name": event_obj.event_name if event_obj else "Diwan Event",
                    "order_num": p_order,
                    "otp": otp_code,
                    "magic_link": magic_link,
                    "qr_code": p_qr,
                    "event_date": str(event_obj.event_date) if event_obj and event_obj.event_date else None,
                    "event_location": event_obj.location if event_obj else None,
                    "event_id": event_obj.id if event_obj else None
                })
                
        if otps_to_insert:
            # مسح الـ OTPs القديمة وإدراج مجمّع للجديد
            inserted_ids = [otp['participant_id'] for otp in otps_to_insert]
            await db.execute(
                delete(ParticipantOTP).filter(ParticipantOTP.participant_id.in_(inserted_ids))
            )
            await db.execute(insert(ParticipantOTP), otps_to_insert)
            
        await db.commit()
        
        # ── 6. ترحيل حملة الإيميل لـ Celery خارج الـ Event Loop ─────────
        if emails_to_notify:
            try:
                from app.tasks.email_tasks import send_bulk_welcome_emails_task
                send_bulk_welcome_emails_task.delay(emails_to_notify, event_id)
            except Exception as e:
                logger.warning(f"Failed dispatching to Celery, falling back to BackgroundTasks: {e}")
                if background_tasks:
                    background_tasks.add_task(
                        _send_welcome_emails_batch,
                        emails_to_notify,
                        batch_size=10,
                        delay_between_batches=1.0
                    )
                    
    return {"status": "success", "added": added, "skipped": skipped, "errors": skipped_details}


async def _send_welcome_emails_batch(recipients: list, batch_size: int = 10, delay_between_batches: float = 1.0):
    """إرسال الإيميلات الاحتياطي المبطأ لمنع خنق خادم الويب عند توقف Celery"""
    import asyncio
    from app.routers.participant_auth import send_unified_welcome_email
    for i in range(0, len(recipients), batch_size):
        batch = recipients[i:i + batch_size]
        for recipient in batch:
            try:
                await send_unified_welcome_email(
                    email=recipient["email"],
                    participant_name=recipient["participant_name"],
                    event_name=recipient["event_name"],
                    order_num=recipient["order_num"],
                    otp=recipient["otp"],
                    magic_link=recipient["magic_link"],
                    qr_code=recipient["qr_code"],
                    event_date=recipient["event_date"],
                    event_location=recipient["event_location"],
                    event_id=recipient.get("event_id")
                )
            except Exception as e:
                logger.error(f"Fallback Email failed for {recipient.get('email')}: {e}")
        if i + batch_size < len(recipients):
            await asyncio.sleep(delay_between_batches)

@router.post("/register", response_model=ParticipantOut)
async def register_participant(
    full_name: str,
    organization: str,
    background_tasks: BackgroundTasks,
    department: str = 'حضور ميداني',
    email: Optional[str] = None,
    phone: Optional[str] = None,
    role: str = 'attendee',
    event_id: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    """تسجيل مشارك يدوي مع التحقق من الصلاحية"""
    # التحقق من الرصيد للتسجيل اليدوي
    from app.models.event import Event
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    
    organizer = await db.get(User, event.created_by)
    if current_user.role != 'super_admin' and organizer.credits <= 0:
        raise HTTPException(status_code=403, detail="رصيد الاعتمادات غير كافٍ للتسجيل اليدوي")

    # تحقق من التكرار بالبريد الإلكتروني في نفس الفعالية
    if email:
        stmt = select(Participant).filter(
            Participant.event_id == event_id,
            Participant.email == email
        )
        res = await db.execute(stmt)
        existing_by_email = res.scalars().first()
        if existing_by_email:
            raise HTTPException(
                status_code=409,
                detail="البريد الإلكتروني مسجل مسبقاً لمشارك آخر في هذه الفعالية"
            )

    # التحقق من عدم تعيين رئيس للجنة مرتين
    if role and "رئيس" in role:
        stmt = select(Participant).filter(
            Participant.event_id == event_id,
            Participant.role == role
        )
        res = await db.execute(stmt)
        existing_pres = res.scalars().first()
        if existing_pres:
            raise HTTPException(
                status_code=400,
                detail=f"تم تعيين رئيس لهذه اللجنة مسبقاً: {existing_pres.full_name}"
            )

    order_num = f"DWN-{uuid.uuid4().hex[:8].upper()}"
    new_p = Participant(
        event_id=event_id,
        full_name=full_name,
        organization=organization,
        role=role,
        department=department,
        email=email,
        phone_number=phone,
        order_num=order_num,
        qr_code=order_num,
        payment_status='paid',
        entry_type='walk_in'
    )
    
    # خصم الرصيد
    if current_user.role != 'super_admin':
        organizer.credits -= 1
    
    db.add(new_p)
    await db.commit()
    await db.refresh(new_p)
    
    # ✅ إنشاء سجل حضور فوري للمشارك الميداني
    from app.models.participant import Attendance
    from datetime import datetime
    attendance_record = Attendance(
        participant_id=new_p.id,
        event_type='check_in',
        check_in_time=datetime.now(),
        entry_method='walk_in'
    )
    db.add(attendance_record)
    await db.commit()
    await db.refresh(new_p)
    
    # إرسال البريد الموحد للمشارك المسجل يدوياً
    if new_p.email:
        from app.routers.participant_auth import generate_otp
        otp_code = generate_otp()
        from app.models.otp import ParticipantOTP
        from datetime import datetime, timedelta
        new_otp = ParticipantOTP(
            participant_id=new_p.id,
            email=new_p.email,
            otp_code=otp_code,
            expires_at=datetime.utcnow() + timedelta(minutes=60)
        )
        db.add(new_otp)
        await db.commit()
        await db.refresh(new_p)
        
        frontend_url = _get_frontend_url()
        magic_link = f"{frontend_url}/p/{new_p.event_id}/{new_p.qr_code}?origin=email"

        background_tasks.add_task(
            send_unified_welcome_email,
            email=new_p.email,
            participant_name=new_p.full_name,
            event_name=event.event_name if event else "Diwan Event",
            order_num=new_p.order_num,
            otp=otp_code,
            magic_link=magic_link,
            qr_code=new_p.qr_code,
            event_date=str(event.event_date) if event and event.event_date else None,
            event_location=event.location if event else None,
            event_id=new_p.event_id
        )
    
    return new_p

@router.post("/sync")
async def sync_offline_checkins(
    payload: List[dict],
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("checkin:operate"))
):
    """
    مزامنة عمليات الحضور التي تمت في وضع "أوفلاين" من أجهزة العتاد.
    """
    synced_count = 0
    errors = []

    for item in payload:
        qr_code = item.get("qr_code")
        timestamp = item.get("timestamp")
        
        stmt = select(Participant).filter(
            Participant.event_id == event_id,
            Participant.qr_code == qr_code
        )
        res = await db.execute(stmt)
        participant = res.scalars().first()

        if participant:
            if participant.payment_status != 'paid':
                participant.payment_status = 'paid'
                from app.models.participant import Attendance
                attendance = Attendance(
                    participant_id=participant.id,
                    event_type='check_in',
                    check_in_time=timestamp,
                    entry_method='offline_sync',
                    device_id=item.get("device_id")
                )
                db.add(attendance)
                synced_count += 1
        else:
            errors.append(f"QR {qr_code} not found")

    await db.commit()
    return {"status": "success", "synced": synced_count, "errors": errors}

@router.get("/badges/all")
async def get_all_badges(
    event_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    تحميل كافة شارات الحضور في ملف PDF واحد متعدد الصفحات.
    """
    # Security: Verify ownership
    from app.models.event import Event
    event = await db.get(Event, event_id)
    if not event or (current_user.role != 'super_admin' and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt = select(Participant).filter(Participant.event_id == event_id)
    res = await db.execute(stmt)
    participants = res.scalars().all()
    if not participants:
        raise HTTPException(status_code=404, detail="No participants found")
    
    # Fetch active badge template
    from app.models.template import BadgeTemplate
    stmt_tmpl = select(BadgeTemplate).filter(
        BadgeTemplate.event_id == event_id,
        BadgeTemplate.type == 'badge'
    )
    res_tmpl = await db.execute(stmt_tmpl)
    template_obj = res_tmpl.scalars().first()
    
    if not template_obj:
        raise HTTPException(status_code=404, detail="قالب الشارة غير موجود لهذه الفعالية")

    from app.utils.pdf_renderer import render_batch_pdf
    from app.routers.credentials import _participant_to_dict, _event_to_dict
    import json
    
    try:
        design = json.loads(template_obj.design_json)
        
        # تحضير قائمة بيانات المشاركين مع دمج بيانات الفعالية
        participants_data = []
        event_data = _event_to_dict(event)
        
        for p in participants:
            p_data = _participant_to_dict(p)
            p_data.update(event_data)
            participants_data.append(p_data)
            
        pdf_bytes = render_batch_pdf(
            design=design,
            participants=participants_data,
            doc_type='badge'
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=all_badges_event_{event_id}.pdf",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"فشل توليد الطباعة المجمعة: {str(e)}")


@router.delete("/{event_id}/imported")
async def delete_imported_participants(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    """
    حذف كافة المشتركين الذين تم استيرادهم بالإكسيل لهذه الفعالية دفعة واحدة.
    """
    # 1. التحقق من وجود الفعالية
    from app.models.event import Event
    event_obj = await db.get(Event, event_id)
    if not event_obj:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
        
    # 2. تنفيذ الحذف
    stmt = delete(Participant).filter(
        Participant.event_id == event_id,
        Participant.entry_type == "imported"
    )
    result = await db.execute(stmt)
    await db.commit()
    
    return {"status": "success", "message": "Successfully deleted all imported participants"}

@router.delete("/{event_id}/participants/{participant_id}")
async def delete_participant(
    event_id: int,
    participant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("participant:manage"))
):
    """
    حذف مشارك من الفعالية.
    """
    stmt = select(Participant).filter(
        Participant.id == participant_id,
        Participant.event_id == event_id
    )
    res = await db.execute(stmt)
    participant = res.scalars().first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    await db.delete(participant)
    await db.commit()
    return {"status": "success", "message": "Participant deleted"}
