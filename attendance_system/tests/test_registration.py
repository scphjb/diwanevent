import pytest
from app.models.event import Event
from app.models.participant import Participant
from app.models.user import User

def test_public_registration_disabled(client, db):
    """التحقق من رفض التسجيل عندما يكون معطلاً للفعالية"""
    event = Event(event_name="Disabled Reg Event", registration_enabled=False)
    db.add(event)
    db.commit()

    response = client.post(
        "/api/v1/participants/public/register",
        json={
            "event_id": event.id,
            "full_name": "Attendee One",
            "email": "one@test.com",
            "organization": "Test Org",
            "department": "Test Dept"
        }
    )
    assert response.status_code == 403
    assert "التسجيل مغلق" in response.json()["detail"]


def test_public_registration_success(client, db):
    """التحقق من نجاح التسجيل العام الجديد"""
    # يجب أن يكون لدى المنظم رصيد أو يكون super_admin
    event = Event(event_name="Enabled Reg Event", registration_enabled=True)
    db.add(event)
    db.commit()

    response = client.post(
        "/api/v1/participants/public/register",
        json={
            "event_id": event.id,
            "full_name": "Attendee Two",
            "email": "two@test.com",
            "organization": "Test Org",
            "department": "Test Dept"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "participant_id" in data
    assert "order_num" in data

    # التأكد من حفظ البيانات في قاعدة البيانات
    participant = db.query(Participant).filter(Participant.id == data["participant_id"]).first()
    assert participant is not None
    assert participant.full_name == "Attendee Two"
    assert participant.email == "two@test.com"


def test_public_registration_duplicate_email(client, db):
    """التحقق من منع التسجيل المتكرر بنفس البريد الإلكتروني"""
    event = Event(event_name="Duplicate Reg Event", registration_enabled=True)
    db.add(event)
    db.commit()

    participant = Participant(
        full_name="Original User",
        email="dup@test.com",
        order_num="ORD-DUP",
        qr_code="QR-DUP",
        event_id=event.id,
        organization="Test Org",
        department="Test Dept"
    )
    db.add(participant)
    db.commit()

    response = client.post(
        "/api/v1/participants/public/register",
        json={
            "event_id": event.id,
            "full_name": "Another User",
            "email": "dup@test.com",
            "organization": "Another Org",
            "department": "Another Dept"
        }
    )
    assert response.status_code == 409
    assert "مسجل مسبقاً" in response.json()["detail"]


def test_public_registration_capacity_exceeded(client, db):
    """التحقق من رفض التسجيل عند تجاوز سعة الفعالية القصوى"""
    # نحدد الحد الأقصى للمدعوين بـ 1
    event = Event(event_name="Capacity Event", registration_enabled=True, total_invited=1)
    db.add(event)
    db.commit()

    # نضيف مشاركاً واحداً يملأ السعة
    participant = Participant(
        full_name="Full User",
        email="full@test.com",
        order_num="ORD-FULL",
        qr_code="QR-FULL",
        event_id=event.id,
        organization="Test Org",
        department="Test Dept"
    )
    db.add(participant)
    db.commit()

    # محاولة إضافة مشارك آخر
    response = client.post(
        "/api/v1/participants/public/register",
        json={
            "event_id": event.id,
            "full_name": "Exceeded User",
            "email": "exceeded@test.com",
            "organization": "Test Org",
            "department": "Test Dept"
        }
    )
    assert response.status_code == 403
    assert "الوصول للحد الأقصى" in response.json()["detail"]


def test_public_registration_merge_claiming(client, db):
    """التحقق من دمج البيانات إذا كان المشارك مستورداً بدون بريد إلكتروني"""
    event = Event(event_name="Merge Event", registration_enabled=True)
    db.add(event)
    db.commit()

    # مشارك مستورد بالاسم والمنظمة والقسم ولكن بدون إيميل
    participant = Participant(
        full_name="Imported User",
        email="",  # فارغ
        order_num="ORD-MERGE",
        qr_code="QR-MERGE",
        event_id=event.id,
        organization="Imported Org",
        department="Imported Dept"
    )
    db.add(participant)
    db.commit()

    # تسجيل عام بنفس الاسم، يهدف لدمج/تأكيد البريد الإلكتروني
    response = client.post(
        "/api/v1/participants/public/register",
        json={
            "event_id": event.id,
            "full_name": "Imported User",
            "email": "merged@test.com",
            "organization": "Updated Org",
            "department": "Updated Dept"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["merged"] is True
    assert data["participant_id"] == participant.id

    # التحقق من تحديث السجل الأصلي
    db.refresh(participant)
    assert participant.email == "merged@test.com"
    assert participant.organization == "Updated Org"
    assert participant.department == "Updated Dept"
