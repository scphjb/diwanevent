import pytest
import json
import hmac
import hashlib

def test_stripe_webhook_invalid_signature(client):
    """التحقق من رفض ويبهوك سترايب بتوقيع غير صالح"""
    response = client.post(
        "/api/v1/payments/webhook/stripe",
        headers={"stripe-signature": "invalid"},
        content=json.dumps({"id": "evt_test"})
    )
    # ملاحظة: الكود يرمي 500 إذا لم يكن STRIPE_WEBHOOK_SECRET مُعدّاً، أو 400 إذا كان التوقيع خطأ
    assert response.status_code in [400, 500]

def test_chargily_webhook_valid_signature(client, db):
    """اختبار ويبهوك شارجيلي بتوقيع صالح"""
    from app.core.config import settings
    from app.models.participant import Participant
    from app.models.event import Event
    
    # تأكد من وجود السر للاختبار
    settings.CHARGILY_API_SECRET = "test_secret"
    
    # تجهيز مشارك في قاعدة البيانات
    event = Event(event_name="Test Event")
    db.add(event)
    db.commit()
    
    participant = Participant(
        full_name="Payment Test",
        email="pay@test.com",
        order_num="ORD-123",
        qr_code="QR-123",
        event_id=event.id,
        payment_status="pending",
        council="C",
        court="C"
    )
    db.add(participant)
    db.commit()

    payload = {
        "status": "paid",
        "metadata": [{"participant_id": str(participant.id)}]
    }
    payload_str = json.dumps(payload)
    
    # حساب التوقيع (HMAC-SHA256)
    signature = hmac.new(
        "test_secret".encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    response = client.post(
        "/api/v1/payments/webhook/chargily",
        headers={"signature": signature},
        content=payload_str
    )
    assert response.status_code == 200
    
    db.refresh(participant)
    assert participant.payment_status == "paid"

def test_create_payment_session_invalid_event(client):
    """التحقق من فشل إنشاء جلسة لفعالية غير موجودة"""
    response = client.post(
        "/api/v1/payments/create-session",
        json={"event_id": 999, "participant_id": 1}
    )
    assert response.status_code == 404
