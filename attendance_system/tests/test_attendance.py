import pytest
from app.models.event import Event
from app.models.participant import Participant, Attendance
from app.models.user import User

def test_check_in_participant_unpaid(client, admin_token, db):
    """التحقق من رفض تسجيل دخول مشارك غير مفعل (دفع معلق)"""
    # 1. تجهيز الفعالية والمشارك
    event = Event(event_name="Attendance Test Event")
    db.add(event)
    db.commit()
    
    participant = Participant(
        full_name="CheckIn Test Unpaid",
        email="unpaid@test.com",
        order_num="ORD-UNPAID",
        qr_code="QR-UNPAID",
        event_id=event.id,
        payment_status="pending",
        organization="Test Org",
        department="Test Dept"
    )
    db.add(participant)
    db.commit()

    # 2. محاولة تسجيل الحضور كـ أدمن
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.patch(
        f"/api/v1/participants/{participant.id}/check-in",
        headers=headers,
        params={"location_id": "gate_1"}
    )
    # يجب أن يرجع 403 Forbidden لأن المشارك غير مفعل دفعاً
    assert response.status_code == 403
    assert "غير مفعل" in response.json()["detail"]


def test_check_in_and_undo_success(client, admin_token, db):
    """اختبار نجاح تسجيل الدخول للمشارك المفعل وإلغائه"""
    # 1. تجهيز الفعالية والمشارك كـ paid
    event = Event(event_name="Attendance Test Event Paid")
    db.add(event)
    db.commit()
    
    participant = Participant(
        full_name="CheckIn Test Paid",
        email="paid@test.com",
        order_num="ORD-PAID",
        qr_code="QR-PAID",
        event_id=event.id,
        payment_status="paid",
        organization="Test Org",
        department="Test Dept"
    )
    db.add(participant)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. تسجيل الدخول
    response = client.patch(
        f"/api/v1/participants/{participant.id}/check-in",
        headers=headers,
        params={"location_id": "gate_1"}
    )
    assert response.status_code == 200
    
    # التحقق من وجود سجل في جدول الحضور
    attendance_rec = db.query(Attendance).filter(
        Attendance.participant_id == participant.id,
        Attendance.event_type == "check_in"
    ).first()
    assert attendance_rec is not None
    assert attendance_rec.location_id == "gate_1"

    # 3. إلغاء تسجيل الدخول
    undo_response = client.patch(
        f"/api/v1/participants/{participant.id}/undo-check-in",
        headers=headers
    )
    assert undo_response.status_code == 200
    
    # يجب أن يعود status لـ pending وتُحذف سجلات الحضور
    db.refresh(participant)
    assert participant.payment_status == "pending"
    
    attendance_rec_after = db.query(Attendance).filter(
        Attendance.participant_id == participant.id,
        Attendance.event_type == "check_in"
    ).first()
    assert attendance_rec_after is None


def test_check_in_permission_denied_for_viewer(client, db):
    """التحقق من رفض الصلاحية لمستخدم غير مخول بتسجيل الحضور"""
    # إنشاء مستخدم viewer/normal
    from app.core.security import create_access_token, get_password_hash
    user = User(
        email="viewer@diwan.com",
        hashed_password=get_password_hash("viewer123"),
        role="viewer",
        full_name="Viewer User",
        is_active=True
    )
    db.add(user)
    
    event = Event(event_name="Attendance Test Event Permission")
    db.add(event)
    db.commit()
    
    participant = Participant(
        full_name="Perm Test Participant",
        email="perm@test.com",
        order_num="ORD-PERM",
        qr_code="QR-PERM",
        event_id=event.id,
        payment_status="paid",
        organization="Test Org",
        department="Test Dept"
    )
    db.add(participant)
    db.commit()

    token = create_access_token(subject=user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # محاولة تسجيل الدخول
    response = client.patch(
        f"/api/v1/participants/{participant.id}/check-in",
        headers=headers
    )
    assert response.status_code == 403
