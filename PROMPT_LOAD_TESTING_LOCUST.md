# برومبت Load Testing احترافي — Diwan Event Platform
## أداة: Locust · هدف: 1,200 مشارك · بيئة: Docker

---

## السياق الإلزامي — اقرأه أولاً

**المنصة:** Diwan Event Platform — FastAPI + PostgreSQL + WebSocket

**الـ Stack:**
```
Backend:     FastAPI على port 8000
DB Pool:     pool_size=10, max_overflow=20 → أقصى 30 اتصال متزامن
Auth:        JWT Bearer Token (صلاحية 8 ساعات)
WebSocket:   ws://{host}/ws/{event_id}?role=admin
```

**السيناريو الحقيقي المستهدف:**
```
الفعالية: الجمعية العامة السنوية — 1,200 محضر قضائي
زمن الذروة: 40 دقيقة للدخول الكامل = 30 مسح QR/دقيقة
الأجهزة: 5-20 جهاز مسح متزامن + 3 لوحات تحكم مفتوحة
```

**الـ Endpoints المُختبَرة:**

| الـ Endpoint | الطريقة | المستخدم |
|------------|---------|---------|
| `/api/v1/auth/login` | POST | Admin/Scanner |
| `/api/v1/participants/` | GET | Admin (قائمة المشاركين) |
| `/api/v1/participants/{id}/check-in` | PATCH | Scanner |
| `/api/v1/participants/public/register` | POST | مشارك عام |
| `/api/v1/analytics/{event_id}/summary` | GET | Dashboard |
| `/api/v1/sessions/` | GET | مشارك |
| `/ws/{event_id}` | WebSocket | لوحة تحكم مباشرة |

---

## المطلوب: إنشاء ملفات الاختبار الكاملة

---

### الملف 1: `load_tests/locustfile.py` — السيناريوهات الكاملة

```python
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
from locust import HttpUser, WebSocketUser, task, between, events
from locust import FastHttpUser
import websocket  # pip install websocket-client
import threading

# ── إعدادات الاختبار ───────────────────────────────────────────────
EVENT_ID   = 1          # ID الفعالية في قاعدة البيانات
BASE_URL   = ""         # يُحدَّد من --host

# بيانات المستخدمين (تُحدَّث في conftest أو مباشرة)
ADMIN_CREDENTIALS   = {"username": "admin@diwan.dz",   "password": "AdminPass123!"}
SCANNER_CREDENTIALS = {"username": "scanner@diwan.dz", "password": "ScannerPass123!"}

# قائمة IDs المشاركين الموجودين (تُملأ أثناء on_start)
_participant_ids = list(range(1, 1201))  # يُفترض وجود 1200 مشارك

# ─────────────────────────────────────────────────────────────────────
# المستخدم 1: المسؤول (Admin)
# الدور: مراقبة + إدارة المشاركين
# النسبة: 10% من المستخدمين
# ─────────────────────────────────────────────────────────────────────
class AdminUser(FastHttpUser):
    weight = 10
    wait_time = between(5, 15)  # Admin يعمل ببطء أكثر
    
    def on_start(self):
        """تسجيل الدخول وحفظ التوكن"""
        with self.client.post(
            "/api/v1/auth/login",
            json=ADMIN_CREDENTIALS,
            name="🔐 Admin Login",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                resp.success()
            else:
                self.token = None
                self.headers = {}
                resp.failure(f"Login failed: {resp.status_code}")
    
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
                # تحقق من صحة البيانات
                if "overview" not in data:
                    resp.failure("Missing 'overview' in analytics response")
                else:
                    resp.success()
            elif resp.status_code == 403:
                resp.failure("Auth failed — token may be expired")
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
        with self.client.post(
            "/api/v1/auth/login",
            json=SCANNER_CREDENTIALS,
            name="🔐 Scanner Login",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                resp.success()
            else:
                self.token = None
                self.headers = {}
                resp.failure(f"Scanner login failed: {resp.status_code}")
    
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
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 404:
                # مشارك لا يوجد — طبيعي في الاختبار
                resp.success()
            elif resp.status_code == 401:
                resp.failure("Token expired — re-login needed")
                self.on_start()  # إعادة التسجيل
            else:
                resp.failure(f"Check-in failed: {resp.status_code} — {resp.text[:100]}")
    
    @task(2)
    def search_participant(self):
        """بحث بالاسم قبل المسح اليدوي"""
        names = ["أحمد", "محمد", "علي", "فاطمة", "خديجة", "عبد"]
        with self.client.get(
            f"/api/v1/participants/search",
            params={"q": random.choice(names), "event_id": EVENT_ID},
            headers=self.headers,
            name="🔍 GET Search Participant",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"{resp.status_code}")
    
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
        """المشارك لا يحتاج JWT — يستخدم token خاص به"""
        self.participant_token = None
        # محاولة الوصول للبوابة بـ order_num عشوائي
        order_num = f"DWN-{random.randint(1, 1200):04d}"
        self._try_portal_access(order_num)
    
    def _try_portal_access(self, order_num):
        """محاكاة دخول المشارك للبوابة"""
        with self.client.post(
            "/api/v1/auth/participant-login",
            json={"identifier": order_num},
            name="🎫 Participant Portal Login",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                self.participant_token = resp.json().get("access_token")
                resp.success()
            else:
                self.participant_token = None
                resp.success()  # طبيعي أن بعض الـ order_nums غير موجودة
    
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
        IMPORTANT: قد يُفعّل rate limiting
        """
        with self.client.post(
            "/api/v1/participants/public/register",
            json={
                "event_id": EVENT_ID,
                "full_name": f"مشارك اختبار {random.randint(1000, 9999)}",
                "council":   random.choice(["محكمة عنابة", "محكمة قسنطينة", "محكمة سطيف"]),
                "court":     "قسم التنفيذ",
                "email":     f"test_{random.randint(1,99999)}@test.dz",
                "phone_number": f"+2135{random.randint(1000000, 9999999)}"
            },
            name="📝 POST Public Register",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 201, 409):  # 409 = مكرر
                resp.success()
            elif resp.status_code == 429:
                resp.success()  # rate limit طبيعي
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
            "/api/v1/health",
            name="💚 GET Health Check",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") != "ok":
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
        print(f"❌ EXCEPTION on {name}: {exception}")
    elif response and response.status_code >= 500:
        print(f"🔴 5xx on {name}: {response.status_code} — {response.text[:150]}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n{'='*60}")
    print(f"🚀 Diwan Event Load Test — Started")
    print(f"🎯 Target: {environment.host}")
    print(f"📋 Event ID: {EVENT_ID}")
    print(f"👥 Simulating: Admin + Scanner + Attendee + HealthCheck")
    print(f"{'='*60}\n")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.stats
    total = stats.total
    print(f"\n{'='*60}")
    print(f"📊 FINAL RESULTS:")
    print(f"   Total Requests:  {total.num_requests:,}")
    print(f"   Failed:          {total.num_failures:,} ({total.fail_ratio*100:.1f}%)")
    print(f"   Avg Response:    {total.avg_response_time:.0f}ms")
    print(f"   95th percentile: {total.get_response_time_percentile(0.95):.0f}ms")
    print(f"   Max RPS:         {total.max_rps:.1f}")
    print(f"{'='*60}")
    
    # حكم تلقائي
    if total.fail_ratio > 0.05:
        print(f"❌ FAIL: نسبة الأخطاء {total.fail_ratio*100:.1f}% > 5%")
    elif total.get_response_time_percentile(0.95) > 2000:
        print(f"⚠️ WARNING: 95th percentile = {total.get_response_time_percentile(0.95):.0f}ms > 2000ms")
    else:
        print(f"✅ PASS: المنصة تتحمل الحمل المطلوب")
```

---

### الملف 2: `load_tests/scenarios/checkin_spike.py` — سيناريو الذروة

```python
"""
سيناريو الذروة: 20 جهاز مسح يعملون في نفس اللحظة
هذا هو الضغط الأقصى الحقيقي على المنصة
"""
from locust import HttpUser, task, between, constant_pacing
import random

ADMIN_CREDS = {"username": "admin@diwan.dz", "password": "AdminPass123!"}
EVENT_ID    = 1

class HeavyScannerSpike(HttpUser):
    """
    يحاكي جهاز مسح صناعي (USB Scanner سريع جداً)
    pace = مسح واحد كل ثانيتين = 30 مشارك/دقيقة لكل جهاز
    """
    wait_time = constant_pacing(2)  # ضبط دقيق = مسح كل 2 ثانية بالضبط
    
    def on_start(self):
        resp = self.client.post("/api/v1/auth/login", json=ADMIN_CREDS)
        if resp.status_code == 200:
            self.headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        else:
            self.headers = {}
            print(f"⚠️ Login failed: {resp.status_code}")
    
    @task
    def rapid_checkin(self):
        """
        مسح مستمر بدون توقف
        20 مستخدم من هذا النوع = 20 × 30 = 600 مسح/دقيقة في الذروة
        """
        participant_id = random.randint(1, 1200)
        
        with self.client.patch(
            f"/api/v1/participants/{participant_id}/check-in",
            headers=self.headers,
            params={"location_id": "main_gate"},
            name="⚡ Spike Check-in",
            catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            elif resp.status_code == 401:
                self.on_start()
                resp.failure("Token expired")
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:80]}")
```

---

### الملف 3: `load_tests/scenarios/ws_dashboard.py` — WebSocket

```python
"""
اختبار WebSocket: 5 لوحات تحكم مفتوحة في نفس الوقت
تحاكي المنظمين يراقبون الحضور في الوقت الفعلي
"""
import time
import json
import threading
import websocket as ws_lib
from locust import User, task, between, events


class WebSocketDashboardUser(User):
    """
    يفتح اتصال WebSocket ويبقيه مفتوحاً طوال الفعالية
    يستقبل رسائل check-in ويقيس latency
    """
    wait_time = between(30, 60)   # المراقب نادراً ما يتفاعل
    abstract = True
    
    def __init__(self, environment):
        super().__init__(environment)
        self.ws = None
        self.messages_received = 0
        self.connection_ok = False
    
    def on_start(self):
        self._connect_ws()
    
    def on_stop(self):
        if self.ws:
            self.ws.close()
    
    def _connect_ws(self):
        host = self.host.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{host}/ws/1?role=admin"
        
        start = time.time()
        try:
            self.ws = ws_lib.create_connection(ws_url, timeout=10)
            elapsed = (time.time() - start) * 1000
            
            events.request.fire(
                request_type="WebSocket",
                name="🔌 WS Connect Dashboard",
                response_time=elapsed,
                response_length=0,
                response=None,
                context={},
                exception=None
            )
            self.connection_ok = True
            
            # listener thread
            t = threading.Thread(target=self._listen, daemon=True)
            t.start()
            
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            events.request.fire(
                request_type="WebSocket",
                name="🔌 WS Connect Dashboard",
                response_time=elapsed,
                response_length=0,
                response=None,
                context={},
                exception=e
            )
    
    def _listen(self):
        """استقبال رسائل WebSocket وقياس latency"""
        while self.connection_ok:
            try:
                msg = self.ws.recv()
                if msg:
                    self.messages_received += 1
                    data = json.loads(msg)
                    
                    # قياس latency للـ check-in events
                    if data.get("type") == "checkin":
                        events.request.fire(
                            request_type="WebSocket",
                            name="📡 WS Receive Check-in Event",
                            response_time=0,   # لا يمكن قياس latency دقيقاً هنا
                            response_length=len(msg),
                            response=None,
                            context={"messages": self.messages_received},
                            exception=None
                        )
            except Exception:
                self.connection_ok = False
                break
    
    @task
    def keep_alive(self):
        """إبقاء الاتصال حياً"""
        if not self.connection_ok:
            self._connect_ws()
        else:
            try:
                self.ws.ping()
            except Exception:
                self.connection_ok = False


class ActiveDashboardUser(WebSocketDashboardUser):
    host = "http://localhost:8000"
```

---

### الملف 4: `load_tests/conftest.py` — إعداد البيئة

```python
"""
إعداد بيانات الاختبار في قاعدة البيانات قبل التشغيل
نفّذه مرة واحدة قبل locust: python conftest.py
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def setup_test_data():
    print("🔧 Setting up test data...")
    
    # 1. تسجيل الدخول كـ super_admin
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin@diwan.dz",
        "password": "AdminPass123!"
    })
    
    if resp.status_code != 200:
        print(f"❌ Admin login failed: {resp.status_code}")
        print("تأكد من وجود مستخدم admin في قاعدة البيانات")
        sys.exit(1)
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. إنشاء فعالية اختبار
    event_resp = requests.post(f"{BASE_URL}/events/", 
        json={
            "event_name": "فعالية اختبار الأداء",
            "event_date": "2026-06-01",
            "location": "مركز اختبار Locust",
            "registration_enabled": True
        },
        headers=headers
    )
    
    if event_resp.status_code not in (200, 201):
        print(f"⚠️ Event creation failed: {event_resp.status_code} — using existing event ID=1")
        event_id = 1
    else:
        event_id = event_resp.json()["id"]
        print(f"✅ Event created: ID={event_id}")
    
    # 3. إنشاء مشاركين للاختبار (100 مشارك — يكفي للاختبار الأولي)
    print("👥 Creating test participants...")
    councils = ["محكمة عنابة", "محكمة قسنطينة", "محكمة سطيف", "محكمة جيجل", "محكمة سكيكدة"]
    created = 0
    
    for i in range(1, 101):
        p_resp = requests.post(f"{BASE_URL}/participants/",
            json={
                "event_id": event_id,
                "full_name": f"محضر اختبار {i:04d}",
                "council": councils[i % len(councils)],
                "court": "قسم التنفيذ",
                "email": f"load_test_{i}@test.dz",
                "phone_number": f"+2135{i:07d}",
                "order_num": f"LT-{i:04d}",
            },
            headers=headers
        )
        if p_resp.status_code in (200, 201):
            created += 1
    
    print(f"✅ Created {created}/100 test participants for event ID={event_id}")
    
    # 4. إنشاء مستخدم scanner إذا لم يكن موجوداً
    scanner_resp = requests.post(f"{BASE_URL}/auth/register",
        json={
            "email": "scanner@diwan.dz",
            "password": "ScannerPass123!",
            "full_name": "جهاز المسح الاختباري",
            "role": "scanner"
        },
        headers=headers
    )
    if scanner_resp.status_code in (200, 201):
        print("✅ Scanner user created")
    else:
        print("ℹ️ Scanner user already exists")
    
    # 5. كتابة الإعدادات
    config = {
        "event_id": event_id,
        "base_url": BASE_URL.replace("/api/v1", ""),
        "participant_count": created
    }
    with open("test_config.json", "w") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Setup complete! Config saved to test_config.json")
    print(f"   Event ID: {event_id}")
    print(f"   Participants: {created}")
    print(f"\n🚀 Now run:")
    print(f"   locust -f locustfile.py --host={BASE_URL.replace('/api/v1','')} --users=50 --spawn-rate=5 --run-time=5m")

if __name__ == "__main__":
    setup_test_data()
```

---

### الملف 5: `load_tests/run_tests.sh` — سكريبت التشغيل الكامل

```bash
#!/bin/bash
# ═══════════════════════════════════════════════════
# Diwan Event Platform — Load Test Runner
# ═══════════════════════════════════════════════════

HOST="${1:-http://localhost:8000}"
RESULTS_DIR="results/$(date +%Y%m%d_%H%M)"

mkdir -p "$RESULTS_DIR"
echo "🎯 Target: $HOST"
echo "📁 Results: $RESULTS_DIR"

# ── الاختبار 1: حمل خفيف (warm-up) ──────────────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "🔥 TEST 1: Warm-up (10 users, 2 min)"
echo "═══════════════════════════════════════"
locust \
    -f locustfile.py \
    --host="$HOST" \
    --users=10 \
    --spawn-rate=2 \
    --run-time=2m \
    --headless \
    --csv="$RESULTS_DIR/warmup" \
    --html="$RESULTS_DIR/warmup_report.html" \
    2>&1 | tail -20

echo ""
echo "⏸️  Cooling down 30 seconds..."
sleep 30

# ── الاختبار 2: حمل متوسط (الواقع اليومي) ───────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "📊 TEST 2: Normal Load (30 users, 5 min)"
echo "═══════════════════════════════════════"
locust \
    -f locustfile.py \
    --host="$HOST" \
    --users=30 \
    --spawn-rate=5 \
    --run-time=5m \
    --headless \
    --csv="$RESULTS_DIR/normal_load" \
    --html="$RESULTS_DIR/normal_load_report.html" \
    2>&1 | tail -25

echo ""
echo "⏸️  Cooling down 60 seconds..."
sleep 60

# ── الاختبار 3: ذروة الدخول (يوم الفعالية) ───────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "⚡ TEST 3: Peak Load — Event Day Simulation"
echo "   20 Scanners + 5 Admins + 25 Attendees"
echo "   Duration: 10 min"
echo "═══════════════════════════════════════"
locust \
    -f scenarios/checkin_spike.py \
    --host="$HOST" \
    --users=20 \
    --spawn-rate=10 \
    --run-time=10m \
    --headless \
    --csv="$RESULTS_DIR/peak_load" \
    --html="$RESULTS_DIR/peak_load_report.html" \
    2>&1 | tail -25

echo ""
echo "⏸️  Cooling down 60 seconds..."
sleep 60

# ── الاختبار 4: إيجاد نقطة الكسر (Stress Test) ──────────────────
echo ""
echo "═══════════════════════════════════════"
echo "💥 TEST 4: Stress Test (find breaking point)"
echo "   رفع تدريجي: 10 → 20 → 40 → 80 مستخدم"
echo "   Duration: 15 min"
echo "═══════════════════════════════════════"
locust \
    -f locustfile.py \
    --host="$HOST" \
    --users=80 \
    --spawn-rate=3 \
    --run-time=15m \
    --headless \
    --csv="$RESULTS_DIR/stress_test" \
    --html="$RESULTS_DIR/stress_test_report.html" \
    2>&1 | tail -30

# ── ملخص النتائج ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "📋 SUMMARY — Reports saved in: $RESULTS_DIR/"
echo "════════════════════════════════════════════════════════"
echo ""
echo "فتح التقارير:"
echo "  warmup:      $RESULTS_DIR/warmup_report.html"
echo "  normal load: $RESULTS_DIR/normal_load_report.html"
echo "  peak:        $RESULTS_DIR/peak_load_report.html"
echo "  stress:      $RESULTS_DIR/stress_test_report.html"

# تحليل تلقائي للنتائج
python3 - <<EOF
import csv, os

def analyze(filepath, label):
    stats_file = f"{filepath}_stats.csv"
    if not os.path.exists(stats_file):
        print(f"⚠️  No stats for {label}")
        return
    
    with open(stats_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("Name") == "Aggregated":
                fail_pct = float(row.get("Failure Count", 0)) / max(1, float(row.get("Request Count", 1))) * 100
                p95 = float(row.get("95%", 0))
                rps = float(row.get("Requests/s", 0))
                status = "✅ PASS" if fail_pct < 1 and p95 < 2000 else "❌ FAIL"
                print(f"{status} {label}: fail={fail_pct:.1f}% | p95={p95:.0f}ms | rps={rps:.1f}")

results_dir = "$RESULTS_DIR"
analyze(f"{results_dir}/warmup", "Warm-up      ")
analyze(f"{results_dir}/normal_load", "Normal Load  ")
analyze(f"{results_dir}/peak_load", "Peak / Spike ")
analyze(f"{results_dir}/stress_test", "Stress Test  ")
EOF
```

---

### الملف 6: `load_tests/thresholds.py` — معايير النجاح والفشل

```python
"""
معايير قبول الأداء (Pass/Fail Criteria)
بناءً على متطلبات الفعالية الحقيقية
"""

PERFORMANCE_THRESHOLDS = {
    
    # ─── Check-in (الأهم) ───────────────────────────────────────────
    "✅ PATCH Check-in": {
        "p50_ms":         500,    # 50% من الطلبات < 500ms
        "p95_ms":        1500,    # 95% من الطلبات < 1.5 ثانية
        "p99_ms":        3000,    # 99% من الطلبات < 3 ثواني
        "error_rate":    0.01,    # أخطاء < 1%
        "min_rps":         20,    # لا تقل عن 20 طلب/ثانية
        "justification": "مسح QR يجب أن يكون فورياً — المشارك ينتظر أمام البوابة"
    },
    
    # ─── الإحصائيات (ثانوي) ────────────────────────────────────────
    "📊 GET Analytics Summary": {
        "p50_ms":         800,
        "p95_ms":        2500,
        "p99_ms":        5000,
        "error_rate":    0.02,
        "justification": "قد تكون أبطأ — لكن لوحة التحكم لا تتوقف للانتظار"
    },
    
    # ─── قائمة المشاركين ────────────────────────────────────────────
    "👥 GET Participants List": {
        "p50_ms":        1000,
        "p95_ms":        3000,
        "p99_ms":        6000,
        "error_rate":    0.01,
        "justification": "جلب 1000+ سجل — مقبول أن يكون أبطأ"
    },
    
    # ─── التسجيل العام ──────────────────────────────────────────────
    "📝 POST Public Register": {
        "p50_ms":        1000,
        "p95_ms":        3000,
        "error_rate":    0.05,   # rate limiting يسبب 429 — طبيعي
        "justification": "التسجيل يبعث بريداً إلكترونياً — أبطأ بطبيعته"
    },
    
    # ─── Health Check ───────────────────────────────────────────────
    "💚 GET Health Check": {
        "p50_ms":         100,
        "p95_ms":         300,
        "error_rate":    0.00,   # لا أخطاء مقبولة
        "justification": "Health check يجب أن يكون فورياً دائماً"
    },
}

# معايير عامة
GLOBAL_THRESHOLDS = {
    "total_error_rate":     0.02,    # < 2% أخطاء إجمالية
    "p95_response_time":    2000,    # < 2 ثانية للـ 95th percentile
    "min_throughput_rps":     50,    # لا تقل عن 50 طلب/ثانية إجمالاً
    "db_pool_utilization":  0.80,    # < 80% من الـ pool (30 اتصال × 80% = 24)
}


def evaluate_results(stats_dict: dict) -> dict:
    """
    تقييم نتائج Locust مقابل المعايير
    
    مثال:
        results = evaluate_results(locust_stats)
        for name, result in results.items():
            print(f"{result['status']} {name}")
    """
    results = {}
    
    for endpoint, thresholds in PERFORMANCE_THRESHOLDS.items():
        if endpoint not in stats_dict:
            results[endpoint] = {"status": "⚠️ MISSING", "message": "Endpoint not tested"}
            continue
        
        stat = stats_dict[endpoint]
        issues = []
        
        if stat.get("p50", 0) > thresholds.get("p50_ms", float("inf")):
            issues.append(f"p50={stat['p50']}ms > {thresholds['p50_ms']}ms")
        
        if stat.get("p95", 0) > thresholds.get("p95_ms", float("inf")):
            issues.append(f"p95={stat['p95']}ms > {thresholds['p95_ms']}ms")
        
        if stat.get("error_rate", 0) > thresholds.get("error_rate", 1):
            issues.append(f"errors={stat['error_rate']*100:.1f}% > {thresholds['error_rate']*100:.1f}%")
        
        results[endpoint] = {
            "status": "❌ FAIL" if issues else "✅ PASS",
            "issues": issues,
            "justification": thresholds.get("justification", "")
        }
    
    return results
```

---

### الملف 7: `load_tests/requirements.txt`

```
locust==2.29.0
websocket-client==1.8.0
requests==2.31.0
```

---

### الملف 8: `load_tests/README.md`

```markdown
# Diwan Event Load Tests

## التثبيت
```bash
cd load_tests
pip install -r requirements.txt
```

## الإعداد (مرة واحدة)
```bash
# تأكد من تشغيل المنصة
docker-compose up -d

# إنشاء بيانات الاختبار
python conftest.py
```

## التشغيل

### واجهة الويب (للتحكم اليدوي)
```bash
locust -f locustfile.py --host=http://localhost:8000
# ثم افتح: http://localhost:8089
```

### Headless (للـ CI/CD)
```bash
bash run_tests.sh http://localhost:8000
```

### سيناريو الذروة فقط
```bash
locust -f scenarios/checkin_spike.py \
    --host=http://localhost:8000 \
    --users=20 \
    --spawn-rate=5 \
    --run-time=5m \
    --headless
```

## تفسير النتائج

| المقياس | جيد | مقبول | خطر |
|---------|-----|-------|------|
| Check-in p95 | < 500ms | < 1500ms | > 3000ms |
| Error Rate | < 0.5% | < 2% | > 5% |
| RPS | > 50 | > 20 | < 10 |
| DB Pool | < 60% | < 80% | > 90% |

## الأخطاء الشائعة

**`ConnectionRefused`**: المنصة لا تعمل → `docker-compose up`

**`401 Unauthorized`**: بيانات Admin خاطئة → حدّث `ADMIN_CREDENTIALS` في `locustfile.py`

**`Pool Timeout`**: قاعدة البيانات مثقلة → زد `DB_POOL_SIZE` في `.env` إلى 20

**`WebSocket: Connection closed`**: في البيئة الإنتاجية تأكد من Nginx `proxy_read_timeout 3600s`
```

---

## القواعد

1. **لا تُشغّل load test على بيئة إنتاج حقيقية بمستخدمين فعليين**
2. **أنشئ قاعدة بيانات اختبار منفصلة** أو استخدم `EVENT_ID` مخصصاً للـ load test
3. **راقب PostgreSQL أثناء الاختبار**: `docker stats` + `pg_stat_activity`
4. **الهدف الأدنى للنجاح**: Check-in p95 < 1500ms مع 20 مستخدم متزامن
5. **إذا فشل**: الحل الأول دائماً هو زيادة `DB_POOL_SIZE` في `.env`

## الناتج المطلوب

أعطني هذه الملفات كاملة:
1. `load_tests/locustfile.py`
2. `load_tests/scenarios/checkin_spike.py`
3. `load_tests/scenarios/ws_dashboard.py`
4. `load_tests/conftest.py`
5. `load_tests/run_tests.sh`
6. `load_tests/thresholds.py`
7. `load_tests/requirements.txt`
8. `load_tests/README.md`
