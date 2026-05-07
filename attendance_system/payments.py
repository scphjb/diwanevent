import stripe
import requests
import json
import os
from legacy.database import get_db_connection

def get_payment_settings(event_id):
    conn = get_db_connection()
    settings = conn.execute("""
        SELECT stripe_public_key, stripe_secret_key, chargily_api_key, 
               ticket_price, currency, payment_mode, event_name
        FROM event_settings WHERE id = %s
    """, (event_id,)).fetchone()
    conn.close()
    return settings

def create_checkout_session(event_id, participant_id, success_url, cancel_url, email=None):
    settings = get_payment_settings(event_id)
    if not settings:
        raise Exception("Event settings not found")

    amount = float(settings['ticket_price'])
    currency = settings['currency'].upper()

    # Preference: If currency is DZD or chargily key exists, use Chargily
    if currency == 'DZD' and settings['chargily_api_key']:
        return create_chargily_session(settings, participant_id, amount, success_url, cancel_url)
    
    # Otherwise use Stripe
    if settings['stripe_secret_key']:
        return create_stripe_session(settings, participant_id, amount, currency, success_url, cancel_url)
    
    raise Exception("No payment provider configured for this event")

def create_stripe_session(settings, participant_id, amount, currency, success_url, cancel_url):
    stripe.api_key = settings['stripe_secret_key']
    amount_cents = int(amount * 100)
    
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': currency.lower(),
                'product_data': {'name': f"Registration for {settings['event_name']}"},
                'unit_amount': amount_cents,
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={'participant_id': participant_id}
    )
    return {"url": session.url, "provider": "stripe"}

def create_chargily_session(settings, participant_id, amount, success_url, cancel_url):
    # Chargily Pay V2 API
    url = "https://pay.chargily.net/test/api/v2/checkouts" if settings['payment_mode'] == 'test' else "https://pay.chargily.net/api/v2/checkouts"
    
    headers = {
        "Authorization": f"Bearer {settings['chargily_api_key']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "amount": amount,
        "currency": "dzd",
        "success_url": success_url,
        "failure_url": cancel_url,
        "metadata": [
            {"participant_id": str(participant_id)}
        ],
        "description": f"Registration for {settings['event_name']}"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 201:
        data = response.json()
        return {"url": data['checkout_url'], "provider": "chargily"}
    else:
        raise Exception(f"Chargily error: {response.text}")

def verify_stripe_webhook(payload, sig_header, endpoint_secret):
    try:
        return stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except Exception as e:
        return None

import hmac as _hmac
import hashlib as _hashlib

async def verify_webhook(payload: bytes, signature: str, provider: str) -> bool:
    """
    التحقق من توقيع Webhook
    Chargily: HMAC-SHA256 باستخدام CHARGILY_API_SECRET
    Stripe:   يستخدم stripe.Webhook.construct_event
    """
    if provider == "chargily":
        secret = os.environ.get("CHARGILY_API_SECRET", "")
        if not secret:
            import logging
            logger = logging.getLogger("payments")
            logger.warning("⚠️ CHARGILY_API_SECRET غير محدد — رفض الـ Webhook")
            return False
        expected = _hmac.new(
            secret.encode("utf-8"),
            payload,
            _hashlib.sha256
        ).hexdigest()
        return _hmac.compare_digest(expected, signature or "")

    elif provider == "stripe":
        endpoint_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        if not endpoint_secret:
            return False
        try:
            stripe.Webhook.construct_event(payload, signature, endpoint_secret)
            return True
        except Exception:
            return False

    # مزود غير معروف — ارفض
    return False
