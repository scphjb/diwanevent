"""
نقاط نهاية OTP للمشاركين
POST /api/v1/participant-auth/request-otp  → توليد وإرسال OTP
POST /api/v1/participant-auth/verify-otp   → التحقق والحصول على token
GET  /api/v1/participant-auth/me           → بيانات المشارك المتحقق منه
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.participant import Participant
from app.models.otp import ParticipantOTP
from app.core.security import create_access_token, decode_token
from sqlalchemy import select, update
from app.core.config import settings
import secrets
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)

OTP_EXPIRE_MINUTES = 10
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = 60


# ─── Hash Helper ──────────────────────────────────────────────────────────────

import hashlib

def hash_otp(otp: str) -> str:
    """تشفير OTP بـ SHA-256 — لا يُحفظ plain text في DB أبداً."""
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    order_num: str   # رقم المشارك (DWN-XXXX)
    email: EmailStr  # بريده الإلكتروني للتحقق


class OTPVerify(BaseModel):
    order_num: str
    email: EmailStr
    otp_code: str    # الرمز المكون من 6 أرقام


# ─── Helper Functions ─────────────────────────────────────────────────────────

def generate_otp() -> str:
    """توليد رمز OTP عشوائي من 6 أرقام."""
    import secrets
    return str(secrets.randbelow(900000) + 100000)

def create_magic_token(participant_id: int) -> str:
    """إنشاء Magic Link Token للمشارك."""
    return create_access_token(
        subject=f"participant:{participant_id}",
        expires_delta=timedelta(hours=24) # صالح لـ 24 ساعة
    )


# ─── Helper: إرسال OTP بالبريد ────────────────────────────────────────────────

async def send_unified_welcome_email(
    email: str, 
    participant_name: str, 
    event_name: str, 
    order_num: str, 
    otp: str, 
    magic_link: str, 
    qr_code: str = None, 
    event_date: str = None, 
    event_location: str = None,
    event_id: int = None,
    logo_url: str = None,
    event_time: str = None,
    maps_link: str = None
) -> bool:
    """إرسال إيميل موحد (ترحيب + OTP + شارة دخول + تفاصيل الفعالية) بقالب فاخر متوافق بالكامل مع الموبايل"""
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

        # ── 1. جلب البيانات تلقائياً من قاعدة البيانات إذا تم تمرير المعرّفات ──
        if event_id or event_name:
            try:
                from app.core.database import AsyncSessionLocal
                from app.models.event import Event
                from sqlalchemy import select
                async with AsyncSessionLocal() as db:
                    if event_id:
                        stmt = select(Event).filter(Event.id == event_id)
                    else:
                        stmt = select(Event).filter(Event.event_name == event_name)
                    res = await db.execute(stmt)
                    ev = res.scalars().first()
                    if ev:
                        if not event_date and ev.event_date:
                            event_date = ev.event_date.strftime("%Y-%m-%d")
                        if not event_location and ev.location:
                            event_location = ev.location
                        if not logo_url and ev.logo_url:
                            logo_url = ev.logo_url
                        if not event_time and ev.event_timestamp:
                            event_time = ev.event_timestamp
            except Exception as db_err:
                logger.warning("Dynamic database lookup in send_unified_welcome_email failed: %s", db_err)

        # ── 2. بناء رابط خرائط Google بشكل ديناميكي ──
        if event_location and not maps_link:
            import urllib.parse
            quoted_loc = urllib.parse.quote(event_location)
            maps_link = f"https://www.google.com/maps/search/?api=1&query={quoted_loc}"

        # ── 3. بناء لوجو الفعالية الفاخر ──
        logo_html = ""
        if logo_url:
            logo_html = f'<img src="{logo_url}" alt="{event_name}" style="height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 15px; border-radius: 10px;" />'
        else:
            logo_html = """
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#F0C040 0%,#D4AF37 100%);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px;box-shadow:0 8px 20px rgba(212,175,55,0.2);">
                <span style="color:#050B18;font-size:24px;font-weight:900;font-family:sans-serif;line-height:56px;text-align:center;display:block;width:100%;">D</span>
              </div>
            """

        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_code}" if qr_code else ""

        # ── 4. صفوف تفاصيل الفعالية الإضافية ──
        date_row = (
            f'<div style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; direction: rtl;">'
            f'<span style="color:#64748B; font-size:12px; font-weight: bold; width:35%; text-align:right;">📅 تاريخ الفعالية</span>'
            f'<span style="color:#050B18; font-size:13px; font-weight:700; width:65%; text-align:left; direction: ltr;">{event_date}</span>'
            f'</div>'
        ) if event_date else ''

        time_row = (
            f'<div style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; direction: rtl;">'
            f'<span style="color:#64748B; font-size:12px; font-weight: bold; width:35%; text-align:right;">⏰ التوقيت</span>'
            f'<span style="color:#050B18; font-size:13px; font-weight:700; width:65%; text-align:left; direction: ltr;">{event_time}</span>'
            f'</div>'
        ) if event_time else ''

        loc_card = ""
        if event_location:
            loc_card = f"""
              <!-- Location Card -->
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:18px; padding:20px; margin-bottom:25px; text-align:right; direction:rtl;">
                <span style="display:block; color:#2A64EC; font-size:11px; font-weight:900; margin-bottom:6px; letter-spacing:1px; text-transform:uppercase;">📍 موقع الفعالية</span>
                <p style="margin:0 0 10px 0; color:#050B18; font-size:13px; font-weight:bold; line-height:1.6;">{event_location}</p>
                {f'<a href="{maps_link}" target="_blank" style="background:#ffffff; border:1px solid #CBD5E1; color:#0F172A; text-decoration:none; padding:8px 16px; border-radius:10px; font-size:12px; font-weight:bold; display:inline-block; box-shadow:0 2px 4px rgba(0,0,0,0.02);">🗺 فتح الموقع في خرائط Google ←</a>' if maps_link else ''}
              </div>
            """

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
      .btn-responsive {{ width: 100% !important; box-sizing: border-box !important; text-align: center !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F6F9;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F6F9;padding:20px 0;">
    <tr>
      <td align="center">
        <!-- Main responsive card container -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(5,11,24,0.04);border:1px solid rgba(5,11,24,0.02); max-width:600px; width:100%;">
          
          <!-- Header (Luxury Brand Glow) -->
          <tr>
            <td class="header-pad" style="background:linear-gradient(135deg,#050B18 0%,#0F1E36 100%);padding:40px;text-align:center;">
              {logo_html}
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;line-height:1.4;">{event_name}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">شارة الدخول وبوابتك التفاعلية</p>
            </td>
          </tr>
          
          <!-- Body Section -->
          <tr>
            <td class="body-pad" style="padding:40px;text-align:right;direction:rtl;">
              <h2 style="color:#050B18;font-size:18px;font-weight:900;margin:0 0 10px;letter-spacing:-0.3px;">مرحباً {participant_name} 👋</h2>
              <p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 25px;">
                يسعدنا تأكيد تسجيلك بنجاح في <strong>{event_name}</strong>. لقد قمنا بتجهيز بطاقة الدخول الرقمية ورمز التفعيل الخاص بك. يرجى الاحتفاظ بهذا البريد وإبراز شارة الدخول للمنظمين عند الوصول.
              </p>

              <!-- Access QR & OTP Badge Card (Mobile Friendly Stacking) -->
              <div style="background:#FFFDF5; border:1px solid #FCD34D; border-radius:20px; padding:24px; margin-bottom:25px; text-align:center; box-shadow:0 4px 15px rgba(251,191,36,0.03);">
                <span style="display:block; color:#854D0E; font-size:11px; font-weight:900; margin-bottom:12px; letter-spacing:1px; text-transform:uppercase;">📱 شارة الدخول الرقمية (QR Code)</span>
                
                {f'<div style="background:#ffffff; padding:10px; border-radius:14px; border:1px solid #FEF3C7; display:inline-block; box-shadow:0 4px 10px rgba(0,0,0,0.02); margin-bottom:15px;"><img src="{qr_url}" width="140" height="140" style="display:block; border:none;" alt="QR Code"/></div>' if qr_code else ''}
                
                <div style="background:#ffffff; border:1px dashed #F59E0B; border-radius:14px; padding:12px; max-width:240px; margin:0 auto;">
                  <span style="display:block; color:#D97706; font-size:10px; font-weight:900; margin-bottom:2px;">رمز الدخول السريع (OTP)</span>
                  <span style="color:#B45309; font-size:22px; font-weight:900; letter-spacing:2px; font-family:monospace;">{otp}</span>
                </div>
              </div>

              <!-- Registration Details Card -->
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:18px; padding:20px; margin-bottom:20px;">
                <span style="display:block; color:#64748B; font-size:11px; font-weight:900; margin-bottom:10px; letter-spacing:1px; text-transform:uppercase; text-align:right;">📝 بيانات التسجيل والفعالية</span>
                
                <div style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                  <span style="color:#64748B; font-size:12px; font-weight: bold; width:35%; text-align:right;">👤 الاسم الكامل</span>
                  <span style="color:#050B18; font-size:13px; font-weight:700; width:65%; text-align:left;">{participant_name}</span>
                </div>
                
                <div style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                  <span style="color:#64748B; font-size:12px; font-weight: bold; width:35%; text-align:right;">🎫 رقم التسجيل</span>
                  <span style="color:#D4AF37; font-size:13px; font-weight:900; font-family:monospace; width:65%; text-align:left; direction: ltr;">{order_num}</span>
                </div>
                
                {date_row}
                {time_row}
              </div>

              {loc_card}

              <!-- Direct Login Link CTA -->
              <div style="text-align:center; margin:30px 0;">
                <a href="{magic_link}" class="btn-responsive" style="background:linear-gradient(135deg,#F0C040 0%,#D4AF37 100%); color:#050B18; padding:15px 32px; border-radius:14px; text-decoration:none; font-weight:900; font-size:14px; display:inline-block; box-shadow:0 8px 20px rgba(212,175,55,0.2); transition:all 0.2s;">
                  👈 دخول فوري لبوابتك الرقمية ✨
                </a>
                <p style="margin:10px 0 0; color:#64748B; font-size:11px; font-weight:bold;">(تسجيل دخول آمن وتلقائي بنقرة واحدة)</p>
              </div>

              <!-- Quick tips advisory -->
              <div style="border-top:1px solid #E2E8F0; padding-top:20px; margin-top:10px;">
                <p style="color:#64748B; font-size:11.5px; line-height:1.6; margin:0; text-align:right;">
                  💡 <strong>ملاحظة هامة:</strong> بوابتك الرقمية تمكّنك من متابعة جدول الجلسات والمحاضرين، طرح الأسئلة مباشرة في قاعة النقاش، والتفاعل مع الزملاء المشاركين. يرجى إبقاء هذا البريد الإلكتروني متاحاً.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:25px;text-align:center;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:10.5px;font-weight:bold;">
              <p style="margin:0 0 5px;">© 2026 {event_name}. جميع الحقوق محفوظة.</p>
              <p style="margin:0;font-size:9.5px;color:#CBD5E1;">بواسطة منصة ديوان إيفنت — إدارة وربط الفعاليات الذكية</p>
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
            subject=f"✅ تأكيد تسجيلك في {event_name} — شارة الدخول الرقمية",
            recipients=[email],
            body=html,
            subtype=MessageType.html,
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        return True
    except Exception as e:
        logger.error("Failed to send unified email: %s", e)
        return False


# ─── 1. طلب OTP ───────────────────────────────────────────────────────────────

@router.post("/request-otp")
async def request_otp(body: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    المشارك يُدخل رقمه + بريده → يصله OTP بالبريد.
    يدعم المسجلين مسبقاً (imported)، التسجيل الذاتي، والـ walk-in.
    """
    # 1. التحقق من وجود المشارك
    stmt = select(Participant).filter(Participant.order_num == body.order_num)
    res = await db.execute(stmt)
    participant = res.scalars().first()

    if not participant:
        raise HTTPException(status_code=404, detail="رقم المشارك غير موجود")

    # 2. التحقق من البريد
    stored_email = (participant.email or "").lower().strip()

    # Walk-in بلا بريد
    if not stored_email:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "NO_EMAIL",
                "message": "هذا المشارك لم يُسجَّل ببريد إلكتروني. يرجى التوجه لمكتب التسجيل.",
                "has_phone": bool(participant.phone_number),
            }
        )

    # عدم تطابق البريد
    if stored_email != body.email.lower().strip():
        raise HTTPException(
            status_code=403,
            detail="البريد الإلكتروني لا يتطابق مع سجل المشارك"
        )

    # 3. التحقق من cooldown
    otp_stmt = select(ParticipantOTP).filter(
        ParticipantOTP.participant_id == participant.id,
        ParticipantOTP.is_used == False,
        ParticipantOTP.created_at >= datetime.utcnow() - timedelta(seconds=RESEND_COOLDOWN),
    )
    otp_res = await db.execute(otp_stmt)
    recent_otp = otp_res.scalars().first()

    if recent_otp:
        remaining = RESEND_COOLDOWN - int(
            (datetime.utcnow() - recent_otp.created_at).total_seconds()
        )
        raise HTTPException(
            status_code=429,
            detail=f"يرجى الانتظار {remaining} ثانية قبل طلب رمز جديد"
        )

    # 4. إلغاء OTP سابق
    upd_stmt = update(ParticipantOTP).filter(
        ParticipantOTP.participant_id == participant.id,
        ParticipantOTP.is_used == False,
    ).values(is_used=True)
    await db.execute(upd_stmt)

    # 5. توليد OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    new_otp = ParticipantOTP(
        participant_id=participant.id,
        email=body.email.lower().strip(),
        otp_code=hash_otp(otp_code),   # مُشفَّر — لا يُحفظ plain text
        expires_at=expires_at,
    )
    db.add(new_otp)
    await db.commit()

    # 6. جلب اسم الفعالية
    event_name = "الفعالية"
    # Note: load event relationship asynchronously or get it manually
    from app.models.event import Event
    event_stmt = select(Event).filter(Event.id == participant.event_id)
    event_res = await db.execute(event_stmt)
    event_obj = event_res.scalars().first()
    if event_obj:
        event_name = event_obj.event_name or event_name

    # 7. رابط البوابة الدائم (صالح حتى نهاية الفعالية بدلاً من 24 ساعة)
    frontend_url = settings.FRONTEND_URL
    if "localhost" in frontend_url and "localhost" not in settings.APP_DOMAIN:
        frontend_url = settings.APP_DOMAIN
    magic_link = f"{frontend_url}/p/{participant.event_id}/{participant.qr_code}?origin=email"

    # 8. إرسال البريد الموحد
    sent = await send_unified_welcome_email(
        email=body.email,
        otp=otp_code,
        participant_name=participant.full_name,
        event_name=event_name,
        order_num=participant.order_num,
        magic_link=magic_link,
        qr_code=participant.qr_code,
        event_id=participant.event_id
    )

    if not sent:
        logger.warning("DEV MODE: OTP=%s", otp_code)
        return {
            "status": "dev_mode",
            "message": "SMTP غير مهيأ. الرمز في حقل dev_otp (للتطوير فقط)",
            "dev_otp": otp_code,
            "expires_in": OTP_EXPIRE_MINUTES * 60,
        }

    return {
        "status": "success",
        "message": f"تم إرسال رمز التحقق إلى {body.email[:3]}***@{body.email.split('@')[1]}",
        "expires_in": OTP_EXPIRE_MINUTES * 60,
    }


# ─── 2. التحقق من OTP وإصدار Token ───────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(body: OTPVerify, db: AsyncSession = Depends(get_db)):
    """
    المشارك يُدخل الرمز → يحصل على JWT token صالح لجلسة واحدة.
    """
    stmt = select(Participant).filter(Participant.order_num == body.order_num)
    res = await db.execute(stmt)
    participant = res.scalars().first()

    if not participant:
        raise HTTPException(status_code=404, detail="رقم المشارك غير موجود")

    # جلب آخر OTP نشط وغير مستخدم
    otp_stmt = select(ParticipantOTP).filter(
        ParticipantOTP.participant_id == participant.id,
        ParticipantOTP.is_used == False,
        ParticipantOTP.email == body.email.lower().strip(),
    ).order_by(ParticipantOTP.created_at.desc())
    otp_res = await db.execute(otp_stmt)
    otp_record = otp_res.scalars().first()

    if not otp_record:
        raise HTTPException(status_code=404, detail="لا يوجد رمز تحقق نشط. يرجى طلب رمز جديد")

    # التحقق من عدد المحاولات (حماية brute force)
    if otp_record.attempt_count >= MAX_ATTEMPTS:
        otp_record.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=429,
            detail="تم تجاوز الحد الأقصى للمحاولات. يرجى طلب رمز جديد"
        )

    # التحقق من انتهاء الصلاحية
    if datetime.utcnow() > otp_record.expires_at:
        otp_record.is_used = True
        await db.commit()
        raise HTTPException(status_code=410, detail="انتهت صلاحية الرمز. يرجى طلب رمز جديد")

    # التحقق من الرمز (مقارنة الهاش)
    if otp_record.otp_code != hash_otp(body.otp_code.strip()):
        otp_record.attempt_count += 1
        await db.commit()
        remaining = MAX_ATTEMPTS - otp_record.attempt_count
        raise HTTPException(
            status_code=400,
            detail=f"رمز التحقق غير صحيح. المحاولات المتبقية: {remaining}"
        )

    # ✅ رمز صحيح — إلغاؤه وإصدار JWT
    otp_record.is_used = True
    await db.commit()

    # توليد JWT خاص بالمشارك (مختلف عن توكن المنظمين)
    access_token = create_access_token(
        subject=f"participant:{participant.id}",
        expires_delta=timedelta(hours=8),  # صالح 8 ساعات (مدة الفعالية عادةً)
    )

    return {
        "status": "success",
        "message": "تم التحقق بنجاح 🎉",
        "access_token": access_token,
        "token_type": "bearer",
        "participant": {
            "id": participant.id,
            "full_name": participant.full_name,
            "order_num": participant.order_num,
            "role": participant.role,
            "organization": participant.organization,
            "event_id": participant.event_id,
        },
    }


# ─── 3. بيانات المشارك المتحقق منه ───────────────────────────────────────────

async def get_current_participant(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """استخراج المشارك من التوكن (يدعم JWT أو رقم الطلب مباشرة)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="يجب تسجيل الدخول أولاً")

    token = credentials.credentials
    
    # 1. محاولة فك تشفير JWT
    payload = decode_token(token)
    if payload:
        sub = payload.get("sub", "")
        if sub.startswith("participant:"):
            try:
                participant_id = int(sub.split(":")[1])
                participant = await db.get(Participant, participant_id)
                if participant:
                    return participant
            except: pass
    
    # 2. محاولة البحث بواسطة رقم الطلب مباشرة (إذا كان التوكن ليس JWT)
    if token.startswith("DWN-") or token.startswith("REG-"):
        stmt = select(Participant).filter(Participant.order_num == token)
        res = await db.execute(stmt)
        participant = res.scalars().first()
        if participant:
            return participant

    raise HTTPException(status_code=401, detail="الجلسة غير صالحة أو منتهية")


@router.get("/me")
async def get_participant_me(participant: Participant = Depends(get_current_participant)):
    """بيانات المشارك المتحقق منه"""
    return {
        "id": participant.id,
        "full_name": participant.full_name,
        "order_num": participant.order_num,
        "role": participant.role,
        "organization": participant.organization,
        "department": participant.department,
        "seat_info": participant.seat_info,
        "event_id": participant.event_id,
    }
