"""
بوابة الدفع الإلكتروني — Stripe + Chargily Pay
═══════════════════════════════════════════════════
تدعم:
- إنشاء جلسة دفع (Checkout Session)
- استقبال Webhooks لتأكيد الدفع تلقائياً
- التحقق من حالة الدفع
"""
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import logging
import stripe
import requests
import hmac
import hashlib

from app.core.database import get_db
from app.core.config import settings
from app.core.auth_deps import get_current_active_user
from app.models.user import User
from app.models.participant import Participant
from app.models.event import Event

router = APIRouter()
logger = logging.getLogger("diwan.payments")


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
