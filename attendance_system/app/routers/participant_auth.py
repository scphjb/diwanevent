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
    """إرسال إيميل موحد (ترحيب + OTP + شارة دخول + تفاصيل الفعالية)"""
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

        html = f"""
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:40px 20px;">
              <table width="600" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#022C22 0%,#1DB58A 100%);padding:40px;text-align:center;">
                    <h1 style="margin:0;color:#D4AF37;font-size:32px;letter-spacing:2px;font-weight:900;">Diwan Event</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:16px;">تأكيد التسجيل والبوابة الرقمية</p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding:40px;text-align:right;">
                    <h2 style="color:#022C22;margin:0 0 16px;">مرحباً {participant_name} 👋</h2>
                    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      يسعدنا تأكيد تسجيلك في <strong>{event_name}</strong>. لقد قمنا بتجهيز بوابتك الرقمية وشارة الدخول الخاصة بك أدناه.
                    </p>

                    <!-- Event Logistics -->
                    <div style="display:flex; gap:10px; margin-bottom:24px;">
                      {f'<div style="flex:1; padding:12px; background:#f0fdf4; border:1px solid #dcfce7; border-radius:12px; text-align:center;"><span style="display:block; color:#166534; font-size:11px; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">📅 التاريخ</span><span style="color:#14532d; font-size:14px; font-weight:bold;">{event_date}</span></div>' if event_date else ''}
                      {f'<div style="flex:1; padding:12px; background:#fffbeb; border:1px solid #fef3c7; border-radius:12px; text-align:center;"><span style="display:block; color:#92400e; font-size:11px; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">📍 الموقع</span><span style="color:#78350f; font-size:14px; font-weight:bold;">{event_location[:30]}...</span></div>' if event_location else ''}
                    </div>

                    <!-- QR & Info Box -->
                    <table width="100%" style="background:#f8f9fa;border-radius:20px;padding:24px;margin-bottom:30px;">
                      <tr>
                        <td width="60%" style="vertical-align:top;text-align:right;">
                           <p style="margin:0;color:#888;font-size:12px;font-weight:bold;text-transform:uppercase;">رقم التسجيل</p>
                           <p style="margin:4px 0 20px;color:#022C22;font-size:24px;font-weight:900;font-family:monospace;">{order_num}</p>
                           
                           <p style="margin:0;color:#888;font-size:12px;font-weight:bold;text-transform:uppercase;">رمز التحقق (OTP)</p>
                           <p style="margin:4px 0 0;color:#D4AF37;font-size:28px;font-weight:900;letter-spacing:4px;">{otp}</p>
                        </td>
                        <td width="40%" align="center">
                           <div style="background:#fff;padding:10px;border-radius:15px;display:inline-block;border:1px solid #eee;">
                              <img src="{qr_url}" width="140" height="140" alt="QR Code">
                           </div>
                           <p style="margin:8px 0 0;color:#022C22;font-size:11px;font-weight:bold;">امسح الشارة عند الدخول 🏁</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Magic Link Button -->
                    <div style="text-align:center;margin:35px 0;">
                      <a href="{magic_link}" style="background:linear-gradient(135deg,#1DB58A 0%,#022C22 100%);color:#ffffff;padding:20px 40px;border-radius:16px;text-decoration:none;font-weight:bold;display:inline-block;box-shadow:0 6px 20px rgba(29,181,138,0.3);font-size:18px;">
                         دخول مباشر للبوابة الرقمية ✨
                      </a>
                      <p style="margin:12px 0 0;color:#888;font-size:12px;">(رابط آمن وسريع - نقرة واحدة فقط)</p>
                    </div>

                    <div style="border-top:1px solid #eee;padding-top:24px;">
                      <p style="color:#666;font-size:13px;margin:0;">
                        📍 <strong>نصيحة:</strong> احتفظ بهذا البريد الإلكتروني، فهو تذكرتك ومفتاح دخولك الدائم للفعالية.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background:#f8f9fa;padding:24px;text-align:center;border-top:1px solid #eee;">
                    <p style="margin:0;color:#aaa;font-size:11px;">
                      © 2026 Diwan Event Platform. كل الحقوق محفوظة.
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
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

    # 7. توليد Magic Link
    magic_token = create_magic_token(participant.id)
    
    # تحديد رابط البوابة
    frontend_url = settings.FRONTEND_URL
    magic_link = f"{frontend_url}/participant-login?token={magic_token}"

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
