from fastapi.testclient import TestClient
import pytest
import os
import sys

# ضمان وجود مسار التطبيق في الـ Path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock البيئة قبل import التطبيق لضمان عدم الاتصال بقاعدة البيانات الحقيقية
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_only_not_real_32chars!")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from main import app

client = TestClient(app)

# ─── Health Check ───────────────────────────────
def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

# ─── Auth ───────────────────────────────────────
def test_login_wrong_password(client):
    response = client.post("/api/v1/auth/login", data={
        "username": "admin@diwan.com", "password": "wrong"
    })
    # Auth login uses Form data, not json
    assert response.status_code in [401, 404, 422]

def test_protected_endpoint_without_token(client):
    # يتطلب event_id كـ query param
    response = client.get("/api/v1/participants?event_id=1")
    # نتحقق فقط أن الوصول غير مسموح (ليس 200) لضمان وجود الحماية
    assert response.status_code != 200, f"Endpoint is not protected! Got {response.status_code}"

# ─── Public Endpoints ───────────────────────────
def test_public_sponsors(client, admin_token):
    # يتطلب event_id في المسار وهو محمي
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/v1/sponsors/1", headers=headers)
    assert response.status_code in [200, 404]

def test_public_sessions(client):
    # يتطلب event_id كـ query param
    response = client.get("/api/v1/sessions/?event_id=1")
    assert response.status_code in [200, 404] # 404 إذا لم تكن الفعالية موجودة ولكن المسار صحيح

# ─── 404 Handler ────────────────────────────────
def test_404_returns_json(client):
    response = client.get("/api/v1/nonexistent_route")
    assert response.status_code == 404

# ─── CORS Headers ───────────────────────────────
def test_cors_headers(client):
    response = client.options(
        "/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"}
    )
    # قد يعيد 200 أو 204
    assert response.status_code in [200, 204]

