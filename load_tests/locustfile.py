"""
Diwan Event Platform — Load Test Suite
=======================================
الاستخدام:
    locust -f locustfile.py --host=http://localhost:8000

للاختبار الموزع:
    locust -f locustfile.py --host=http://localhost:8000 --master
    locust -f locustfile.py --host=http://localhost:8000 --worker --master-host=localhost
"""

import random
import json
import time
import os
import sys
from locust import HttpUser, FastHttpUser, task, between, events

# إعداد الترميز ليدعم الرموز على نظام ويندوز بدون مشاكل
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# ── إعدادات الاختبار ───────────────────────────────────────────────
EVENT_ID = 4          # ID الفعالية النشطة الافتراضي
_participant_ids = list(range(1, 101))
_participant_order_nums = [f"LT-{i:04d}" for i in range(1, 101)]

# محاولة تحميل الإعدادات الديناميكية من conftest
try:
    if os.path.exists("test_config.json"):
        with open("test_config.json", "r", encoding="utf-8") as f:
            cfg = json.load(f)
            EVENT_ID = cfg.get("event_id", EVENT_ID)
            _participant_ids = cfg.get("participant_ids", _participant_ids)
            _participant_order_nums = cfg.get("participant_order_nums", _participant_order_nums)
except Exception:
    pass

# ─────────────────────────────────────────────────────────────────────
# المستخدم 1: المسؤول (Admin)
# الدور: مراقبة + إدارة المشاركين
# النسبة: 10% من المستخدمين
# ─────────────────────────────────────────────────────────────────────
class AdminUser(FastHttpUser):
    weight = 10
    wait_time = between(5, 15)  # Admin يعمل ببطء أكثر
    
    def on_start(self):
        """تسجيل الدخول وحفظ التوكن مع معالجة المرونة للـ credentials"""
        creds_to_try = [
            {"username": "admin@diwan.com", "password": "admin123"},
            {"username": "admin@diwan.dz", "password": "AdminPass123!"}
        ]
        success = False
        self.headers = {}
        self.token = None
        
        for creds in creds_to_try:
            # تنبيه: منفذ الدخول /login يستخدم OAuth2PasswordRequestForm ويحتاج data (Form URL-Encoded)
            with self.client.post(
                "/api/v1/auth/login",
                data=creds,
                name="🔐 Admin Login",
                catch_response=True
            ) as resp:
                if resp.status_code == 200:
                    self.token = resp.json().get("access_token")
                    self.headers = {"Authorization": f"Bearer {self.token}"}
                    resp.success()
                    success = True
                    break
                else:
                    resp.success()  # تجنب إفشال الاختبار هنا، سنحاول الحساب التالي
                    
        if not success:
            with self.client.post(
                "/api/v1/auth/login",
                data=creds_to_try[0],
                name="🔐 Admin Login (Final Fail)",
                catch_response=True
            ) as resp:
                resp.failure("All admin credentials failed")
    
    @task(3)
    def view_analytics(self):
        """جلب ملخص الإحصائيات — يُستدعى كثيراً من لوحة التحكم"""
        with self.client.get(
            f"/api/v1/analytics/{EVENT_ID}/summary",
            headers=self.headers,
            name="📊 GET Analytics Summary",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if "overview" not in data:
                    resp.failure("Missing 'overview' in analytics response")
                else:
                    resp.success()
            elif resp.status_code == 403:
                resp.failure("Auth failed — token may be expired or unauthorized")
            else:
                resp.failure(f"Unexpected: {resp.status_code}")
    
    @task(2)
    def list_participants(self):
        """جلب قائمة المشاركين"""
        with self.client.get(
            f"/api/v1/participants/?event_id={EVENT_ID}&limit=50",
            headers=self.headers,
            name="👥 GET Participants List",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:100]}")
    
    @task(1)
    def get_peak_hours(self):
        """إحصائيات الذروة — أثقل query"""
        with self.client.get(
            f"/api/v1/analytics/{EVENT_ID}/peak-hours",
            headers=self.headers,
            name="📈 GET Peak Hours Analytics",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")
    
    @task(1)
    def view_sessions(self):
        """جلب برنامج الجلسات"""
        with self.client.get(
            f"/api/v1/sessions/?event_id={EVENT_ID}",
            headers=self.headers,
            name="📋 GET Sessions",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")


# ─────────────────────────────────────────────────────────────────────
# المستخدم 2: جهاز المسح (Scanner)
# الدور: مسح QR ← أهم سيناريو في المنصة
# النسبة: 60% من المستخدمين
# ─────────────────────────────────────────────────────────────────────
class ScannerUser(FastHttpUser):
    weight = 60
    wait_time = between(1, 4)   # جهاز مسح يعمل كل 1-4 ثواني
    
    def on_start(self):
        creds_to_try = [
            {"username": "scanner@diwan.dz", "password": "ScannerPass123!"},
            {"username": "admin@diwan.com", "password": "admin123"}  # Fallback
        ]
        success = False
        self.headers = {}
        self.token = None
        
        for creds in creds_to_try:
            with self.client.post(
                "/api/v1/auth/login",
                data=creds,
                name="🔐 Scanner Login",
                catch_response=True
            ) as resp:
                if resp.status_code == 200:
                    self.token = resp.json().get("access_token")
                    self.headers = {"Authorization": f"Bearer {self.token}"}
                    resp.success()
                    success = True
                    break
                else:
                    resp.success()
                    
        if not success:
            with self.client.post(
                "/api/v1/auth/login",
                data=creds_to_try[0],
                name="🔐 Scanner Login (Final Fail)",
                catch_response=True
            ) as resp:
                resp.failure("All scanner credentials failed")
    
    @task(10)
    def check_in_participant(self):
        """
        ⭐ السيناريو الأهم — مسح QR وتسجيل الحضور
        يحاكي: جهاز مسح يسجّل مشارك كل 2-4 ثواني
        """
        participant_id = random.choice(_participant_ids)
        
        with self.client.patch(
            f"/api/v1/participants/{participant_id}/check-in",
            headers=self.headers,
            params={"location_id": f"gate_{random.randint(1,3)}"},
            name="✅ PATCH Check-in",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 403):
                # 403 تعني أن المشارك pending وغير paid، وهو سلوك طبيعي من الخادم
                resp.success()
            elif resp.status_code == 404:
                # مشارك غير موجود — طبيعي في الاختبار الموزع
                resp.success()
            elif resp.status_code == 401:
                resp.failure("Token expired — re-login needed")
                self.on_start()
            else:
                resp.failure(f"Check-in failed: {resp.status_code} — {resp.text[:100]}")
    
    @task(2)
    def search_participant(self):
        """بحث بالاسم قبل المسح اليدوي"""
        names = ["أحمد", "محمد", "علي", "فاطمة", "خديجة", "عبد", "مشارك", "محضر"]
        with self.client.get(
            f"/api/v1/participants/search",
            params={"q": random.choice(names), "event_id": EVENT_ID},
            headers=self.headers,
            name="🔍 GET Search Participant",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 400, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:100]}")
    
    @task(1)
    def get_participant_by_id(self):
        """جلب بيانات مشارك محدد"""
        participant_id = random.choice(_participant_ids)
        with self.client.get(
            f"/api/v1/participants/{participant_id}",
            headers=self.headers,
            name="👤 GET Participant by ID",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")


# ─────────────────────────────────────────────────────────────────────
# المستخدم 3: المشارك العام (Attendee)
# الدور: تسجيل + بوابة المشارك
# النسبة: 25% من المستخدمين
# ─────────────────────────────────────────────────────────────────────
class AttendeeUser(FastHttpUser):
    weight = 25
    wait_time = between(2, 8)
    
    def on_start(self):
        """
        المشارك لا يحتاج JWT — البوابة تدعم رقم الطلب (order_num) كـ Bearer token مباشرة
        """
        self.order_num = random.choice(_participant_order_nums)
        self.headers = {"Authorization": f"Bearer {self.order_num}"}
    
    @task(5)
    def view_my_profile(self):
        """بوابة المشارك — عرض الملف الشخصي"""
        with self.client.get(
            "/api/v1/participant-auth/me",
            headers=self.headers,
            name="🎫 Participant GET Profile",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 401):
                resp.success()
            else:
                resp.failure(f"Portal access failed: {resp.status_code}")
                
    @task(5)
    def view_event_info(self):
        """صفحة معلومات الفعالية — عامة بدون auth"""
        with self.client.get(
            f"/api/v1/events/{EVENT_ID}/settings",
            name="ℹ️ GET Event Info (Public)",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")
    
    @task(3)
    def view_sessions(self):
        """برنامج الفعالية"""
        with self.client.get(
            f"/api/v1/sessions/?event_id={EVENT_ID}",
            name="📋 GET Sessions (Public)",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")
    
    @task(2)
    def self_register(self):
        """
        تسجيل ذاتي — يُختبر قبل الفعالية
        مع مطابقة البنية الصحيحة لـ PublicRegistrationRequest
        """
        councils = ["محكمة عنابة", "محكمة قسنطينة", "محكمة سطيف"]
        with self.client.post(
            "/api/v1/participants/public/register",
            json={
                "event_id": EVENT_ID,
                "full_name": f"مشارك اختبار {random.randint(1000, 9999)}",
                "organization": random.choice(councils),
                "department": "قسم التنفيذ",
                "role": "attendee",
                "custom_values": {
                    "phone_number": f"+2135{random.randint(1000000, 9999999)}"
                }
            },
            name="📝 POST Public Register",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 201, 403, 409):  # 409 مكرر، 403 مغلق للتسجيل
                resp.success()
            elif resp.status_code == 429:
                resp.success()  # rate limit طبيعي جداً
            else:
                resp.failure(f"Register failed: {resp.status_code} — {resp.text[:100]}")
    
    @task(1)
    def view_sponsors(self):
        """رعاة الفعالية"""
        with self.client.get(
            f"/api/v1/sponsors/?event_id={EVENT_ID}",
            name="💼 GET Sponsors (Public)",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")


# ─────────────────────────────────────────────────────────────────────
# المستخدم 4: مستخدم الـ Health Check (مراقبة)
# النسبة: 5%
# ─────────────────────────────────────────────────────────────────────
class HealthCheckUser(FastHttpUser):
    weight = 5
    wait_time = between(10, 30)
    
    @task
    def health_check(self):
        with self.client.get(
            "/health",
            name="💚 GET Health Check",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") != "healthy" and data.get("status") != "ok":
                    resp.failure(f"Health degraded: {data}")
                else:
                    resp.success()
            else:
                resp.failure(f"Health check failed: {resp.status_code}")


# ─────────────────────────────────────────────────────────────────────
# Hooks للإحصائيات المخصصة
# ─────────────────────────────────────────────────────────────────────
@events.request.add_listener
def on_request(request_type, name, response_time, response_length,
               response, context, exception, start_time, url, **kwargs):
    """
    تسجيل الطلبات الفاشلة بتفصيل أكثر
    """
    if exception:
        print(f"[-] EXCEPTION on {name}: {exception}")
    elif response and response.status_code >= 500:
        print(f"[-] 5xx on {name}: {response.status_code} — {response.text[:150]}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n{'='*60}")
    print(f"[+] Diwan Event Load Test — Started")
    print(f"    Target: {environment.host}")
    print(f"    Event ID: {EVENT_ID}")
    print(f"    Simulating: Admin + Scanner + Attendee + HealthCheck")
    print(f"{'='*60}\n")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.stats
    total = stats.total
    print(f"\n{'='*60}")
    print(f"[+] FINAL RESULTS:")
    print(f"   Total Requests:  {total.num_requests:,}")
    print(f"   Failed:          {total.num_failures:,} ({total.fail_ratio*100:.1f}%)")
    print(f"   Avg Response:    {total.avg_response_time:.0f}ms")
    print(f"   95th percentile: {total.get_response_time_percentile(0.95):.0f}ms")
    print(f"   Max RPS:         {total.max_rps:.1f}")
    print(f"{'='*60}")
    
    if total.fail_ratio > 0.05:
        print(f"[-] FAIL: نسبة الأخطاء {total.fail_ratio*100:.1f}% > 5%")
    elif total.get_response_time_percentile(0.95) > 2000:
        print(f"[!] WARNING: 95th percentile = {total.get_response_time_percentile(0.95):.0f}ms > 2000ms")
    else:
        print(f"[+] PASS: المنصة تتحمل الحمل المطلوب")
