"""
بوابة الدفع الإلكتروني — Stripe + Chargily Pay
═══════════════════════════════════════════════════
تدعم:
- إنشاء جلسة دفع (Checkout Session)
- استقبال Webhooks لتأكيد الدفع تلقائياً
- التحقق من حالة الدفع
"""
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging
import stripe
import requests
import hmac
import hashlib

from app.core.database import get_db
from app.core.config import settings
from app.core.auth_deps import get_current_active_user
from app.routers.participant_auth import get_current_participant
from app.models.user import User
from app.models.participant import Participant
from app.models.event import Event

router = APIRouter()
logger = logging.getLogger("diwan.payments")


# ═══════════════════════════════════════════════════════════
# نظام الحوالة البنكية
# ═══════════════════════════════════════════════════════════

async def _send_transfer_email(email: str, subject: str, html_body: str) -> bool:
    """إرسال بريد إلكتروني لإشعار الحوالة."""
    try:
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
        if not settings.SMTP_PASSWORD or not settings.EMAILS_FROM_EMAIL:
            return False
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USERNAME or settings.EMAILS_FROM_EMAIL,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_SERVER,
            MAIL_FROM_NAME=settings.EMAILS_FROM_NAME or "Diwan Event",
            MAIL_STARTTLS=True, MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True, VALIDATE_CERTS=True,
        )
        message = MessageSchema(subject=subject, recipients=[email], body=html_body, subtype=MessageType.html)
        await FastMail(conf).send_message(message)
        return True
    except Exception as e:
        logger.warning(f"Transfer email failed: {e}")
        return False


@router.post("/submit-transfer")
async def submit_transfer_proof(
    background_tasks: BackgroundTasks,
    proof_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_p: Participant = Depends(get_current_participant)
):
    """
    رفع إثبات الحوالة البنكية من بوابة المشارك المقيدة.
    يغيّر payment_status إلى transfer_pending ويُشعر المنظّم.
    """
    event = await db.get(Event, current_p.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    if not getattr(event, 'allow_transfer_payment', False):
        raise HTTPException(status_code=400, detail="الدفع بالحوالة غير مفعّل لهذه الفعالية")

    if current_p.payment_status == 'paid':
        raise HTTPException(status_code=409, detail="اشتراكك مفعّل مسبقاً")

    # التحقق من نوع الملف
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if proof_file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم. يُقبل: JPG, PNG, PDF")

    # رفع الملف للتخزين
    from app.services.cloud_storage import StorageService
    storage = StorageService()
    file_content = await proof_file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB حد أقصى
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز الحد المسموح (5MB)")

    proof_url = storage.upload_image_or_file(
        file_content=file_content,
        filename=proof_file.filename,
        folder=f"transfers/{current_p.event_id}/{current_p.id}",
        content_type=proof_file.content_type or "image/jpeg"
    )

    # تحديث بيانات المشارك
    current_p.transfer_proof_url = proof_url
    current_p.transfer_submitted_at = datetime.utcnow()
    current_p.payment_status = 'transfer_pending'
    await db.commit()

    # إشعار المنظّم بالبريد الإلكتروني
    organizer = await db.get(User, event.created_by)
    if organizer and organizer.email:
        html = f"""<!DOCTYPE html><html lang="ar" dir="rtl"><body style="font-family:Cairo,sans-serif;background:#F8FAFC;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E2E8F0;">
        <h2 style="color:#050B18;">🏦 حوالة بنكية جديدة تنتظر المراجعة</h2>
        <p style="color:#475569;">فعالية: <strong>{event.event_name}</strong></p>
        <p style="color:#475569;">المشارك: <strong>{current_p.full_name}</strong> — رقم {current_p.order_num}</p>
        <p style="color:#475569;">تاريخ الإرسال: <strong>{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}</strong></p>
        <p style="margin-top:24px;"><a href="{proof_url}" style="background:#D4AF37;color:#050B18;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">عرض وصل التحويل ↗</a></p>
        <p style="color:#94A3B8;font-size:12px;margin-top:24px;">يرجى الدخول للوحة التحكم لقبول أو رفض الحوالة.</p>
        </div></body></html>"""
        background_tasks.add_task(
            _send_transfer_email,
            email=organizer.email,
            subject=f"🏦 حوالة جديدة تنتظر مراجعتك — {event.event_name}",
            html_body=html
        )

    logger.info(f"Transfer proof submitted: participant={current_p.id}, event={current_p.event_id}")
    return {"status": "success", "message": "تم إرسال إثبات الدفع للمراجعة. سيتم إشعارك بالنتيجة خلال 24 ساعة."}


@router.get("/pending-transfers/{event_id}")
async def list_pending_transfers(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """قائمة الحوالات المعلقة للمراجعة (لوحة الإدارة)."""
    event = await db.get(Event, event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt = select(Participant).filter(
        Participant.event_id == event_id,
        Participant.payment_status.in_(['transfer_pending', 'transfer_rejected'])
    ).order_by(Participant.transfer_submitted_at.desc().nullslast())
    result = await db.execute(stmt)
    participants = result.scalars().all()

    return [
        {
            "id":                    p.id,
            "full_name":             p.full_name,
            "order_num":             p.order_num,
            "email":                 p.email,
            "phone_number":          p.phone_number,
            "organization":          p.organization,
            "payment_status":        p.payment_status,
            "transfer_proof_url":    p.transfer_proof_url,
            "transfer_submitted_at": p.transfer_submitted_at.isoformat() if p.transfer_submitted_at else None,
            "payment_notes":         p.payment_notes,
        }
        for p in participants
    ]


@router.post("/approve-transfer/{participant_id}")
async def approve_transfer(
    participant_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الموافقة على حوالة مشارك — يُفعّل حسابه ويُرسل إشعار بالبريد."""
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    event = await db.get(Event, participant.event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if participant.payment_status not in ('transfer_pending', 'pending'):
        raise HTTPException(status_code=409, detail="لا توجد حوالة معلقة لهذا المشارك")

    participant.payment_status = 'paid'
    participant.payment_notes = 'تم قبول الحوالة البنكية والتحقق منها.'
    await db.commit()

    # إشعار المشارك
    if participant.email:
        from app.core.config import settings as cfg
        portal_url = f"{cfg.FRONTEND_URL}/p/{participant.event_id}/{participant.qr_code}"
        html = f"""<!DOCTYPE html><html lang="ar" dir="rtl"><body style="font-family:Cairo,sans-serif;background:#F8FAFC;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E2E8F0;">
        <div style="text-align:center;font-size:48px;margin-bottom:16px;">✅</div>
        <h2 style="color:#050B18;text-align:center;">تم تأكيد اشتراكك!</h2>
        <p style="color:#475569;text-align:center;">مرحباً <strong>{participant.full_name}</strong>،</p>
        <p style="color:#475569;text-align:center;">تم التحقق من حوالتك البنكية وتفعيل وصولك الكامل لفعالية <strong>{event.event_name}</strong>.</p>
        <div style="background:#FEF9E7;border:1px solid #D4AF37;border-radius:12px;padding:16px;text-align:center;margin:24px 0;">
        <p style="color:#92400E;font-size:12px;font-weight:bold;margin:0 0 8px;">رقم مشاركتك</p>
        <p style="color:#050B18;font-size:28px;font-weight:900;font-family:monospace;margin:0;">{participant.order_num}</p>
        </div>
        <p style="text-align:center;"><a href="{portal_url}" style="background:#D4AF37;color:#050B18;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">دخول البوابة الكاملة ←</a></p>
        </div></body></html>"""
        background_tasks.add_task(
            _send_transfer_email,
            email=participant.email,
            subject=f"✅ تم تأكيد اشتراكك في {event.event_name}",
            html_body=html
        )

    logger.info(f"Transfer approved: participant={participant_id}")
    return {"status": "success", "message": f"تم تفعيل اشتراك {participant.full_name}"}


class RejectTransferBody(BaseModel):
    reason: Optional[str] = "الوصل غير واضح أو لا يطابق البيانات المطلوبة."


@router.post("/reject-transfer/{participant_id}")
async def reject_transfer(
    participant_id: int,
    body: RejectTransferBody,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """رفض حوالة مشارك مع إرسال سبب الرفض بالبريد."""
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    event = await db.get(Event, participant.event_id)
    if not event or (current_user.role != "super_admin" and event.created_by != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    participant.payment_status = 'transfer_rejected'
    participant.payment_notes = body.reason
    await db.commit()

    # إشعار المشارك بالرفض
    if participant.email:
        from app.core.config import settings as cfg
        portal_url = f"{cfg.FRONTEND_URL}/p/{participant.event_id}/{participant.qr_code}"
        html = f"""<!DOCTYPE html><html lang="ar" dir="rtl"><body style="font-family:Cairo,sans-serif;background:#F8FAFC;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E2E8F0;">
        <div style="text-align:center;font-size:48px;margin-bottom:16px;">⚠️</div>
        <h2 style="color:#050B18;text-align:center;">تعذّر قبول حوالتك</h2>
        <p style="color:#475569;text-align:center;">مرحباً <strong>{participant.full_name}</strong>،</p>
        <p style="color:#475569;text-align:center;">للأسف لم نتمكن من قبول وصل الحوالة المُرسل للفعالية <strong>{event.event_name}</strong>.</p>
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin:24px 0;">
        <p style="color:#991B1B;font-weight:bold;margin:0 0 8px;">سبب الرفض:</p>
        <p style="color:#7F1D1D;margin:0;">{body.reason}</p>
        </div>
        <p style="color:#475569;text-align:center;">يمكنك إعادة رفع الإثبات من بوابتك الشخصية.</p>
        <p style="text-align:center;"><a href="{portal_url}" style="background:#D4AF37;color:#050B18;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">إعادة رفع الإثبات ←</a></p>
        </div></body></html>"""
        background_tasks.add_task(
            _send_transfer_email,
            email=participant.email,
            subject=f"⚠️ بخصوص وصل الدفع — {event.event_name}",
            html_body=html
        )

    logger.info(f"Transfer rejected: participant={participant_id}, reason={body.reason}")
    return {"status": "success", "message": "تم رفض الحوالة وإشعار المشارك."}


# ═══════════════════════════════════════
# Schemas
# ═══════════════════════════════════════
class CreateCheckoutRequest(BaseModel):
    event_id: int
    participant_id: int
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class PaymentStatusOut(BaseModel):
    participant_id: int
    payment_status: str
    payment_gateway: Optional[str] = None


# ═══════════════════════════════════════
# إنشاء جلسة دفع
# ═══════════════════════════════════════
@router.post("/create-session")
async def create_checkout_session(
    body: CreateCheckoutRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    إنشاء جلسة دفع — يختار البوابة المناسبة تلقائياً حسب إعدادات الفعالية.
    """
    event = await db.get(Event, body.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")

    if not event.require_payment:
        raise HTTPException(status_code=400, detail="هذه الفعالية لا تتطلب دفعاً")

    participant = await db.get(Participant, body.participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    if participant.payment_status == "paid":
        raise HTTPException(status_code=409, detail="الدفع مسجل مسبقاً لهذا المشارك")

    amount = float(event.ticket_price or 0)
    currency = (event.currency or "USD").upper()
    gateway = event.payment_gateway or "none"

    base_url = body.success_url or f"{settings.APP_DOMAIN}/p/{event.id}/{participant.id}"
    cancel_url = body.cancel_url or f"{settings.APP_DOMAIN}/register/{event.id}"

    # ═══ Chargily (الجزائر — DZD) ═══
    if gateway == "chargily" and settings.CHARGILY_API_KEY:
        mode = event.payment_mode or "test"
        api_url = (
            "https://pay.chargily.net/test/api/v2/checkouts"
            if mode == "test"
            else "https://pay.chargily.net/api/v2/checkouts"
        )
        headers = {
            "Authorization": f"Bearer {settings.CHARGILY_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "amount": amount,
            "currency": "dzd",
            "success_url": base_url,
            "failure_url": cancel_url,
            "metadata": [{"participant_id": str(participant.id), "event_id": str(event.id)}],
            "description": f"تسجيل في {event.event_name}",
        }
        resp = requests.post(api_url, json=payload, headers=headers, timeout=15)
        if resp.status_code in (200, 201):
            data = resp.json()
            return {
                "checkout_url": data.get("checkout_url"),
                "provider": "chargily",
                "session_id": data.get("id"),
            }
        else:
            logger.error(f"Chargily error: {resp.status_code} — {resp.text}")
            raise HTTPException(status_code=502, detail="خطأ في بوابة Chargily")

    # ═══ Stripe (دولي) ═══
    elif gateway == "stripe" and settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": currency.lower(),
                            "product_data": {"name": f"تسجيل: {event.event_name}"},
                            "unit_amount": int(amount * 100),
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=base_url,
                cancel_url=cancel_url,
                metadata={
                    "participant_id": str(participant.id),
                    "event_id": str(event.id),
                },
            )
            return {
                "checkout_url": session.url,
                "provider": "stripe",
                "session_id": session.id,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {e}")
            raise HTTPException(status_code=502, detail="خطأ في بوابة Stripe")

    else:
        raise HTTPException(
            status_code=400,
            detail="لم يتم تكوين بوابة دفع لهذه الفعالية",
        )


# ═══════════════════════════════════════
# Webhook — Stripe
# ═══════════════════════════════════════
@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """استقبال تأكيدات الدفع من Stripe."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET غير مُعدّ")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        logger.warning(f"Stripe webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="توقيع غير صالح")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        participant_id = session.get("metadata", {}).get("participant_id")

        if participant_id:
            participant = await db.get(Participant, int(participant_id))
            if participant:
                participant.payment_status = "paid"
                await db.commit()
                logger.info(f"✅ Stripe payment confirmed for participant {participant_id}")

    return {"status": "ok"}


# ═══════════════════════════════════════
# Webhook — Chargily
# ═══════════════════════════════════════
@router.post("/webhook/chargily")
async def chargily_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """استقبال تأكيدات الدفع من Chargily Pay."""
    payload = await request.body()
    signature = request.headers.get("signature", "")

    if not settings.CHARGILY_API_SECRET:
        raise HTTPException(status_code=500, detail="CHARGILY_API_SECRET غير مُعدّ")

    # التحقق من HMAC-SHA256
    expected = hmac.new(
        settings.CHARGILY_API_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.warning("Chargily webhook signature mismatch")
        raise HTTPException(status_code=400, detail="توقيع غير صالح")

    import json
    data = json.loads(payload)
    checkout_status = data.get("status")

    if checkout_status == "paid":
        metadata = data.get("metadata", [])
        participant_id = None
        for item in metadata:
            if "participant_id" in item:
                participant_id = item["participant_id"]
                break

        if participant_id:
            participant = await db.get(Participant, int(participant_id))
            if participant:
                participant.payment_status = "paid"
                await db.commit()
                logger.info(f"✅ Chargily payment confirmed for participant {participant_id}")

    return {"status": "ok"}


# ═══════════════════════════════════════
# التحقق من حالة الدفع
# ═══════════════════════════════════════
@router.get("/status/{participant_id}", response_model=PaymentStatusOut)
async def check_payment_status(
    participant_id: int,
    db: AsyncSession = Depends(get_db),
):
    """التحقق من حالة دفع مشارك معين."""
    participant = await db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="المشارك غير موجود")

    event = await db.get(Event, participant.event_id)

    return {
        "participant_id": participant.id,
        "payment_status": participant.payment_status or "pending",
        "payment_gateway": event.payment_gateway if event else None,
    }
