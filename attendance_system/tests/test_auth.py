import pytest

def test_signup(client):
    """اختبار تسجيل منظم جديد"""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "strongpassword123",
            "full_name": "New User",
            "organization_name": "New Org"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "newuser@example.com"

def test_login(client, db):
    """اختبار تسجيل الدخول"""
    # إنشاء مستخدم أولاً
    from app.core.security import get_password_hash
    from app.models.user import User
    user = User(
        email="login_test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Login Test",
        is_active=True
    )
    db.add(user)
    db.commit()

    # محاولة الدخول
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "login_test@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login_wrong_password(client, db):
    """اختبار فشل الدخول بكلمة مرور خاطئة"""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_refresh_token(client, db):
    """اختبار تجديد التوكن"""
    from app.core.security import create_refresh_token, get_password_hash
    from app.models.user import User
    user = User(
        email="refresh@test.com", 
        hashed_password=get_password_hash("pass"), 
        full_name="Refresh Test",
        is_active=True
    )
    db.add(user)
    db.commit()

    refresh_token = create_refresh_token(subject=user.email)
    
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_forgot_password(client, db):
    """اختبار طلب استعادة كلمة المرور"""
    from app.core.security import get_password_hash
    from app.models.user import User
    user = User(
        email="forgot@test.com", 
        hashed_password=get_password_hash("pass"), 
        full_name="Forgot Test",
        is_active=True
    )
    db.add(user)
    db.commit()

    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "forgot@test.com"}
    )
    assert response.status_code == 200
    assert "message" in response.json()
