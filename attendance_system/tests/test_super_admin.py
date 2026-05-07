import pytest

def test_super_admin_access_denied_for_organizer(client, organizer_token):
    """التحقق من منع المنظم العادي من الوصول لمسارات السوبر أدمن"""
    headers = {"Authorization": f"Bearer {organizer_token}"}
    response = client.get("/api/v1/super-admin/settings", headers=headers)
    assert response.status_code == 403

def test_super_admin_settings_access(client, admin_token):
    """التحقق من وصول السوبر أدمن للإعدادات"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/v1/super-admin/settings", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "project_name" in data

def test_manage_plans(client, admin_token):
    """اختبار إدارة الباقات (CRUD)"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. إنشاء باقة
    create_res = client.post(
        "/api/v1/super-admin/plans",
        headers=headers,
        json={
            "name": "Testing Plan",
            "price": 99.99,
            "max_events": 5,
            "max_participants_per_event": 500,
            "features": ["Feature 1", "Feature 2"]
        }
    )
    assert create_res.status_code == 200
    plan_id = create_res.json()["id"]

    # 2. عرض الباقات
    list_res = client.get("/api/v1/super-admin/plans", headers=headers)
    assert any(p["id"] == plan_id for p in list_res.json())

    # 3. تعديل الباقة
    patch_res = client.patch(
        f"/api/v1/super-admin/plans/{plan_id}",
        headers=headers,
        json={"price": 149.99}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["price"] == 149.99

    # 4. حذف الباقة
    del_res = client.delete(f"/api/v1/super-admin/plans/{plan_id}", headers=headers)
    assert del_res.status_code == 200

def test_assign_plan_to_user(client, admin_token, db):
    """اختبار تعيين باقة لمستخدم"""
    from app.models.user import User
    from app.models.auth import SubscriptionPlan
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # تجهيز مستخدم وباقة
    user = User(
        email="target@test.com", 
        hashed_password="...", 
        full_name="Target User",
        is_active=True
    )
    plan = SubscriptionPlan(name="Target Plan", price=0, max_events=1)
    db.add(user)
    db.add(plan)
    db.commit()

    response = client.patch(
        f"/api/v1/super-admin/organizers/{user.id}/plan?plan_id={plan.id}",
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["plan"] == plan.name
