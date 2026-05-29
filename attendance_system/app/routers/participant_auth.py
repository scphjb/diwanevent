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

OTP_EXPIRE_MINUTES = 10  # صلاحية الرمز: 10 دقائق
MAX_ATTEMPTS = 5          # أقصى محاولات خاطئة قبل إلغاء الرمز
RESEND_COOLDOWN = 60      # ثوان بين كل إرسال وآخر (حماية من الإرسال المتكرر)


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

async def send_unified_welcome_email(email: str, participant_name: str, event_name: str, order_num: str, otp: str, magic_link: str, qr_code: str = None, event_date: str = None, event_location: str = None) -> bool:
    """إرسال إيميل موحد (ترحيب + OTP + شارة دخول + تفاصيل الفعالية) بقالب فاخر"""
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

        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_code}" if qr_code else ""

        org_row = ""
        date_row = (
            f'<tr><td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:12px;width:35%;">تاريخ الفعالية</td>'
            f'<td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#050B18;font-size:13px;font-weight:700;">{event_date}</td></tr>'
        ) if event_date else ''

        loc_row = (
            f'<tr><td style="padding:10px 0;color:#64748B;font-size:12px;width:35%;">الموقع</td>'
            f'<td style="padding:10px 0;color:#050B18;font-size:13px;font-weight:700;">{event_location}</td></tr>'
        ) if event_location else ''

        html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0F4F8;padding:30px 10px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 15px 40px rgba(5,11,24,0.06);border:1px solid rgba(5,11,24,0.03);">
          
          <!-- Header (Luxury Brand Glow) -->
          <tr>
            <td style="background:linear-gradient(135deg,#050B18 0%,#0F1E36 100%);padding:45px 40px;text-align:center;">
              <div style="width:64px;height:64px;background:linear-gradient(135deg,#F0C040 0%,#D4AF37 100%);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:15px;box-shadow:0 8px 20px rgba(212,175,55,0.2);">
                <span style="color:#050B18;font-size:28px;font-weight:900;font-family:sans-serif;line-height:64px;text-align:center;display:block;width:100%;">D</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">ديوان <span style="color:#D4AF37;">فعاليات</span></h1>
              <p style="margin:5px 0 0;color:rgba(255,255,255,0.55);font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">تأكيد التسجيل والبوابة الرقمية للمشترك</p>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding:40px;text-align:right;">
              <h2 style="color:#050B18;font-size:20px;font-weight:900;margin:0 0 12px;letter-spacing:-0.3px;">مرحباً {participant_name} 👋</h2>
              <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 25px;">
                يسعدنا تأكيد تسجيلك بنجاح في <strong>{event_name}</strong>. لقد قمنا بتوليد شارة الدخول ورمز التحقق الخاص بك. يمكنك الوصول المباشر لبوابتك التفاعلية لمتابعة تفاصيل الجلسات والتواصل الفعّال.
              </p>

              <!-- Main Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:20px;padding:24px;margin-bottom:30px;">
                <tr>
                  <!-- Data Section -->
                  <td width="55%" style="vertical-align:middle;text-align:right;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:12px;width:35%;">الاسم الكامل</td>
                        <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#050B18;font-size:13px;font-weight:700;">{participant_name}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:12px;">رقم التسجيل</td>
                        <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#D4AF37;font-size:14px;font-weight:900;font-family:monospace;">{order_num}</td>
                      </tr>
                      {date_row}
                      {loc_row}
                    </table>
                  </td>
                  
                  <!-- Divider -->
                  <td width="5%">&nbsp;</td>
                  
                  <!-- QR & OTP Block -->
                  <td width="40%" align="center" style="vertical-align:middle;border-right:1px solid #E2E8F0;padding-right:15px;">
                    {f'<div style="background:#ffffff;padding:8px;border-radius:14px;border:1px solid #E2E8F0;display:inline-block;box-shadow:0 4px 12px rgba(0,0,0,0.03);margin-bottom:10px;"><img src="{qr_url}" width="120" height="120" style="display:block;border:none;" alt="QR Code"/></div>' if qr_code else ''}
                    <div style="background:#FFFDF5;border:1px dashed #F0C040;border-radius:12px;padding:8px 12px;text-align:center;">
                      <span style="display:block;color:#8B6A08;font-size:10px;font-weight:900;margin-bottom:2px;letter-spacing:1px;text-transform:uppercase;">رمز الدخول (OTP)</span>
                      <span style="color:#D4AF37;font-size:20px;font-weight:900;letter-spacing:2px;font-family:monospace;">{otp}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Call To Action (One-click Magic Login) -->
              <div style="text-align:center;margin:35px 0;">
                <a href="{magic_link}" style="background:linear-gradient(135deg,#F0C040 0%,#D4AF37 100%);color:#050B18;padding:16px 36px;border-radius:16px;text-decoration:none;font-weight:900;font-size:15px;display:inline-block;box-shadow:0 10px 25px rgba(212,175,55,0.25);transition:all 0.2s;">
                  دخول مباشر للبوابة الرقمية ✨
                </a>
                <p style="margin:10px 0 0;color:#64748B;font-size:11px;font-weight:bold;">(رابط آمن وسريع — تسجيل دخول بنقرة واحدة)</p>
              </div>

              <!-- Important Advisory -->
              <div style="border-top:1px solid #E2E8F0;padding-top:20px;margin-top:10px;">
                <p style="color:#64748B;font-size:12px;line-height:1.6;margin:0;">
                  📌 <strong>نصيحة هامة:</strong> يرجى الاحتفاظ بهذا البريد الإلكتروني أو تصوير رمز الـ QR بهاتفك لإبرازه للمنظمين عند مداخل القاعة لتسجيل حضورك الميداني وطباعة بطاقتك فورياً.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:25px;text-align:center;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:11px;font-weight:bold;">
              <p style="margin:0 0 5px;">© 2026 Diwan Event Platform. كل الحقوق محفوظة.</p>
              <p style="margin:0;font-size:10px;color:#CBD5E1;">منصة احترافية متكاملة لإدارة وربط الفعاليات والمؤتمرات الذكية</p>
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
            subject=f"✅ تأكيد تسجيلك في {event_name} — شارة الدخول والبوابة",
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
        otp_code=otp_code,
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
    magic_link = f"{frontend_url}/p/{participant.event_id}/{participant.qr_code}"

    # 8. إرسال البريد الموحد
    sent = await send_unified_welcome_email(
        email=body.email,
        otp=otp_code,
        participant_name=participant.full_name,
        event_name=event_name,
        order_num=participant.order_num,
        magic_link=magic_link,
        qr_code=participant.qr_code
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

    # التحقق من الرمز نفسه
    if otp_record.otp_code != body.otp_code.strip():
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
